import os
import json
import pandas as pd
import numpy as np
from neo4j import GraphDatabase
from sqlalchemy import create_engine, text

# Database Connection Settings
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://app_user:secure_password_here@localhost:5432/postgres")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "secure_password_here")

def get_raw_journeys_from_postgres():
    """
    Connects to PostgreSQL to read raw user conversion journeys.
    Note: Assumes a 'raw_tracking_events' table exists. Falls back to mock data 
    if the schema has not been updated yet.
    """
    query = """
        SELECT 
            session_id,
            array_agg(channel_name ORDER BY event_time ASC) as path,
            bool_or(is_conversion) as converted
        FROM raw_tracking_events
        GROUP BY session_id
    """
    
    mock_data = [
        {"session_id": 1, "path": ["Meta Ads", "Google Ads", "Conversion"], "converted": True},
        {"session_id": 2, "path": ["Organic", "Google Ads"], "converted": False},
        {"session_id": 3, "path": ["Meta Ads", "Conversion"], "converted": True},
        {"session_id": 4, "path": ["Meta Ads", "Organic"], "converted": False},
        {"session_id": 5, "path": ["Google Ads", "Conversion"], "converted": True},
    ]
    
    try:
        engine = create_engine(POSTGRES_URL)
        with engine.connect() as conn:
            df = pd.read_sql(text(query), conn)
            return df.to_dict('records')
    except Exception as e:
        print(f"PostgreSQL connection or table 'raw_tracking_events' missing. Using mock paths for now.")
        return mock_data

def import_journeys_to_neo4j(driver, journeys):
    """
    Ingests the path arrays into Neo4j as connected Graph nodes and edges.
    """
    query = """
    UNWIND $paths AS path
    // Create the sequential transitions
    UNWIND range(0, size(path)-2) AS i
    MERGE (n1:Touchpoint {name: path[i]})
    MERGE (n2:Touchpoint {name: path[i+1]})
    MERGE (n1)-[r:TRANSITION_TO]->(n2)
    ON CREATE SET r.weight = 1
    ON MATCH SET r.weight = r.weight + 1
    """
    
    paths_list = []
    for j in journeys:
        path = j['path'].copy()
        
        # Standardize path structure: Must start with 'Start'
        if not path or path[0] != "Start":
            path.insert(0, "Start")
        
        # Ensure it ends with 'Conversion' or 'Null'
        if j.get('converted') and path[-1] != "Conversion":
            path.append("Conversion")
        elif not j.get('converted') and path[-1] != "Null" and path[-1] != "Conversion":
            path.append("Null")
            
        paths_list.append(path)

    with driver.session() as session:
        # Clear existing graph for a fresh sync (in production, use selective updates)
        session.run("MATCH (n:Touchpoint) DETACH DELETE n")
        session.run(query, paths=paths_list)
        print("Successfully synced user journeys into Neo4j graph nodes and edges.")

def calculate_markov_chain_allocations(driver):
    """
    Calculates the transition probabilities and the 'Removal Effect' 
    for each marketing channel using Absorbing Markov Chains math.
    Returns the final Pareto-optimal JSON allocation payload.
    """
    # 1. Fetch transition counts from Neo4j
    query = """
    MATCH (n:Touchpoint)-[r:TRANSITION_TO]->(m:Touchpoint)
    RETURN n.name AS source, m.name AS target, r.weight AS weight
    """
    
    with driver.session() as session:
        result = session.run(query)
        transitions = pd.DataFrame([dict(record) for record in result])
        
    if transitions.empty:
        return {"error": "No transition data available in Neo4j."}

    # 2. Build the Transition Matrix
    pivot_df = transitions.pivot_table(index='source', columns='target', values='weight', fill_value=0)
    
    # Ensure Absorbing States (Conversion, Null) exist and transition to themselves 100%
    for state in ['Conversion', 'Null']:
        if state not in pivot_df.columns:
            pivot_df[state] = 0
        if state not in pivot_df.index:
            pivot_df.loc[state] = 0
        pivot_df.loc[state, state] = 1.0 
        
    # Convert weights to probabilities (normalize rows)
    trans_matrix = pivot_df.div(pivot_df.sum(axis=1), axis=0)
    
    states = list(trans_matrix.columns)
    channels = [s for s in states if s not in ['Start', 'Conversion', 'Null']]
    
    # Helper to calculate the probability of hitting 'Conversion' from 'Start'
    def calculate_conversion_prob(t_matrix):
        transient = [s for s in states if s not in ['Conversion', 'Null']]
        absorbing = ['Conversion', 'Null']
        
        Q = t_matrix.loc[transient, transient].values
        R = t_matrix.loc[transient, absorbing].values
        
        # Fundamental Matrix N = (I - Q)^-1
        I = np.eye(len(transient))
        try:
            N = np.linalg.inv(I - Q)
        except np.linalg.LinAlgError:
            return 0.0 # Matrix is singular
            
        # Absorption probabilities B = N * R
        B = np.dot(N, R)
        
        start_idx = transient.index('Start')
        conv_idx = absorbing.index('Conversion')
        
        return B[start_idx, conv_idx]
        
    # 3. Calculate Baseline Conversion Probability
    baseline_prob = calculate_conversion_prob(trans_matrix)
    
    if baseline_prob == 0:
        return {"error": "Baseline conversion probability is 0."}

    # 4. Calculate Removal Effect for each Channel
    removal_effects = {}
    for channel in channels:
        temp_matrix = trans_matrix.copy()
        
        # Simulate channel removal: All traffic that went TO this channel goes to Null instead
        for state in states:
            if state != channel:
                prob_to_channel = temp_matrix.loc[state, channel]
                temp_matrix.loc[state, channel] = 0
                temp_matrix.loc[state, 'Null'] += prob_to_channel
                
        # Any traffic originating from the removed channel immediately goes to Null
        temp_matrix.loc[channel, :] = 0
        temp_matrix.loc[channel, 'Null'] = 1.0
        
        new_prob = calculate_conversion_prob(temp_matrix)
        
        # Removal Effect Formula: 1 - (New Probability / Baseline Probability)
        removal_effect = 1 - (new_prob / baseline_prob)
        removal_effects[channel] = max(0, removal_effect)
        
    # 5. Calculate Credit Share Percentage for Pareto-optimal Allocation Dashboard
    total_removal_effect = sum(removal_effects.values())
    
    allocations = []
    for channel, effect in removal_effects.items():
        share = (effect / total_removal_effect * 100) if total_removal_effect > 0 else 0
        allocations.append({
            "channel": channel,
            "removal_effect": round(effect, 4),
            "credit_share_percentage": round(share, 2)
        })
        
    # Sort highest share first
    allocations.sort(key=lambda x: x['credit_share_percentage'], reverse=True)
    
    return {
        "status": "success",
        "baseline_conversion_probability": round(baseline_prob, 4),
        "allocations": allocations
    }

def run_sync():
    print("Fetching raw journeys from PostgreSQL...")
    journeys = get_raw_journeys_from_postgres()
    
    # Using the local Neo4j Docker container URI
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        import_journeys_to_neo4j(driver, journeys)
        
        print("\nCalculating Markov Chain removal effects...")
        results = calculate_markov_chain_allocations(driver)
        
        print("\n--- Final JSON Allocation Payload ---")
        json_output = json.dumps(results, indent=2)
        print(json_output)
        
        return json_output
    finally:
        driver.close()

if __name__ == "__main__":
    run_sync()
