"""Attribution sync service — Markov Chain analysis using PostgreSQL data.

Reads raw user journeys from PostgreSQL and computes Markov Chain removal
effects for Pareto-optimal budget allocation.

.. note::
    Previously, this module synced journey data TO Neo4j as graph nodes and
    edges, then queried Neo4j for transition weights. Neo4j has been removed.
    All Markov chain computations now use the Python-native implementations
    in ``src.simulation.markov_attribution`` directly.

    TODO: When a graph database is re-introduced, consider re-implementing
          the graph-based transition matrix:
          - Import journeys as connected (Touchpoint)-[:TRANSITION_TO]->(Touchpoint) edges
          - Use Cypher to query transition weights: MATCH (n)-[r:TRANSITION_TO]->(m) RETURN ...
          - This enables richer multi-hop graph traversals for attribution.
"""

import os
import json
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

# Database Connection Settings
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://app_user:secure_password_here@localhost:5432/postgres")

# NOTE: Neo4j connection settings removed. When re-introducing a graph DB,
# add connection settings here:
# GRAPH_DB_URI = os.getenv("GRAPH_DB_URI", "bolt://localhost:7687")
# GRAPH_DB_USER = os.getenv("GRAPH_DB_USER", "neo4j")
# GRAPH_DB_PASSWORD = os.getenv("GRAPH_DB_PASSWORD", "secure_password_here")


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
    except Exception:
        print("PostgreSQL connection or table 'raw_tracking_events' missing. Using mock paths for now.")
        return mock_data


def calculate_markov_chain_allocations_from_journeys(journeys):
    """
    Calculates the transition probabilities and the 'Removal Effect'
    for each marketing channel using Absorbing Markov Chains math.
    Returns the final Pareto-optimal JSON allocation payload.

    This is a pure-Python implementation that replaces the old Neo4j-based
    graph traversal approach. The math is identical.

    TODO: When a graph database is re-introduced, consider a hybrid approach:
          1. Store transitions as graph edges for visualization (GraphRAG)
          2. Keep this Python implementation for the actual Markov computation
             (Python NumPy is faster than Cypher for matrix inversion)
    """
    # 1. Build paths with Start/Conversion/Null anchors
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

    # 2. Build transition counts (replaces Neo4j edge weights)
    transitions = []
    for path in paths_list:
        for i in range(len(path) - 1):
            transitions.append({
                "source": path[i],
                "target": path[i + 1],
                "weight": 1,
            })

    if not transitions:
        return {"error": "No transition data available."}

    transitions_df = pd.DataFrame(transitions)
    transitions_df = transitions_df.groupby(["source", "target"])["weight"].sum().reset_index()

    # 3. Build the Transition Matrix
    pivot_df = transitions_df.pivot_table(index='source', columns='target', values='weight', fill_value=0)
    
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
        
        # Fundamental Matrix N = (identity_matrix - Q)^-1
        identity_matrix = np.eye(len(transient))
        try:
            N = np.linalg.inv(identity_matrix - Q)
        except np.linalg.LinAlgError:
            return 0.0 # Matrix is singular
            
        # Absorption probabilities B = N * R
        B = np.dot(N, R)
        
        start_idx = transient.index('Start')
        conv_idx = absorbing.index('Conversion')
        
        return B[start_idx, conv_idx]
        
    # 4. Calculate Baseline Conversion Probability
    baseline_prob = calculate_conversion_prob(trans_matrix)
    
    if baseline_prob == 0:
        return {"error": "Baseline conversion probability is 0."}

    # 5. Calculate Removal Effect for each Channel
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
        
    # 6. Calculate Credit Share Percentage for Pareto-optimal Allocation Dashboard
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
    """Run the full attribution sync pipeline using PostgreSQL data.

    TODO: When a graph database is re-introduced, add a step to sync
          the transition data to graph nodes/edges for GraphRAG visualization.
    """
    print("Fetching raw journeys from PostgreSQL...")
    journeys = get_raw_journeys_from_postgres()

    print("\nCalculating Markov Chain removal effects (pure Python — no graph DB)...")
    results = calculate_markov_chain_allocations_from_journeys(journeys)
    
    print("\n--- Final JSON Allocation Payload ---")
    json_output = json.dumps(results, indent=2)
    print(json_output)
    
    return json_output


if __name__ == "__main__":
    run_sync()
