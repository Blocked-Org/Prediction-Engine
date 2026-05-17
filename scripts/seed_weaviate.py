"""
scripts/seed_weaviate.py — Seeding script for Weaviate Vector Store.

Reads Campaigns and CompetitorContext from Neo4j, generates embeddings using BAAI/bge-m3,
and inserts them into Weaviate.
"""

import sys
import os
import logging

# Ensure project root is in PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.db.neo4j_client import get_neo4j_manager
from src.api.db.weaviate_client import get_weaviate_manager
from src.nlp.pipeline import nlp_pipeline
import weaviate.classes.config as wvc

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def seed_weaviate():
    logger.info("Initializing DB connections...")
    neo4j_mgr = get_neo4j_manager()
    weaviate_mgr = get_weaviate_manager()
    
    if not neo4j_mgr.verify_connectivity():
        logger.error("Cannot connect to Neo4j. Exiting.")
        return
        
    if not weaviate_mgr.check_cluster_health():
        logger.error("Cannot connect to Weaviate. Exiting.")
        return

    client = weaviate_mgr.client

    # 1. Create or recreate collections
    collections_to_create = ["Campaign", "CompetitorContext"]
    for col in collections_to_create:
        if client.collections.exists(col):
            logger.info(f"Collection {col} already exists. Deleting it for fresh seed...")
            client.collections.delete(col)
            
        logger.info(f"Creating collection {col}...")
        client.collections.create(
            name=col,
            vectorizer_config=wvc.Configure.Vectorizer.none(),
        )

    # 2. Extract Data from Neo4j
    logger.info("Extracting data from Neo4j...")
    campaigns = []
    contexts = []
    
    try:
        # Fetch Campaigns
        records, _, _ = neo4j_mgr.driver.execute_query("""
            MATCH (c:Campaign)
            RETURN c.campaign_id AS campaign_id, c.name AS name, c.description AS description
        """)
        for r in records:
            # We construct a text block to embed
            text_to_embed = f"Campaign: {r['name']}. Description: {r['description']}"
            campaigns.append({
                "campaign_id": r["campaign_id"],
                "name": r["name"],
                "description": r["description"],
                "text": text_to_embed
            })
            
        # Fetch CompetitorContexts
        records, _, _ = neo4j_mgr.driver.execute_query("""
            MATCH (ctx:CompetitorContext)
            RETURN ctx.url AS url, ctx.content AS content, ctx.summary AS summary
        """)
        for r in records:
            text_to_embed = f"Competitor Data from {r['url']}: {r['summary']} - {r['content'][:500]}"
            contexts.append({
                "url": r["url"],
                "content": r["content"],
                "summary": r["summary"],
                "text": text_to_embed
            })
    except Exception as e:
        logger.error(f"Error fetching from Neo4j: {e}")
        return

    # 3. Generate Embeddings & Insert into Weaviate
    campaign_col = client.collections.get("Campaign")
    context_col = client.collections.get("CompetitorContext")
    
    if campaigns:
        logger.info(f"Generating embeddings for {len(campaigns)} Campaigns...")
        texts = [c["text"] for c in campaigns]
        embeddings = nlp_pipeline.generate_embeddings(texts)
        
        logger.info("Inserting Campaigns into Weaviate...")
        for c, emb in zip(campaigns, embeddings):
            campaign_col.data.insert(
                properties={
                    "campaign_id": c["campaign_id"],
                    "name": c["name"],
                    "text": c["text"]
                },
                vector=emb
            )
            
    if contexts:
        logger.info(f"Generating embeddings for {len(contexts)} Competitor Contexts...")
        texts = [ctx["text"] for ctx in contexts]
        embeddings = nlp_pipeline.generate_embeddings(texts)
        
        logger.info("Inserting CompetitorContexts into Weaviate...")
        for ctx, emb in zip(contexts, embeddings):
            context_col.data.insert(
                properties={
                    "url": ctx["url"],
                    "text": ctx["text"]
                },
                vector=emb
            )
            
    logger.info("Weaviate seeding complete.")
    neo4j_mgr.close()
    weaviate_mgr.close()

if __name__ == "__main__":
    seed_weaviate()
