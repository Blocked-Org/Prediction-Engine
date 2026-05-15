"""
Day 7 — Neo4j Index Creation for GraphRAG Optimization.

Creates text and range indexes on core knowledge graph nodes to speed up
k-hop neighbourhood traversal during the hybrid LLM retrieval phase.

Target nodes: Campaign, Channel, Product, AgentCluster, Competitor, Outcome
Index types:
  - TEXT indexes on string properties (semantic similarity / vector retrieval)
  - RANGE indexes on quantitative properties (numeric filtering / aggregation)

Usage:
    python -m scripts.create_neo4j_indexes

Idempotent: Uses CREATE INDEX ... IF NOT EXISTS — safe to re-run.
"""

import os
import sys
import logging
from typing import List, Tuple

from dotenv import load_dotenv
load_dotenv()

from neo4j import GraphDatabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ── Index Definitions ──────────────────────────────────────────────────────
# Each tuple: (index_name, cypher_statement)

TEXT_INDEXES: List[Tuple[str, str]] = [
    # Campaign — text search on name, description, region for semantic retrieval
    (
        "idx_campaign_name",
        "CREATE TEXT INDEX idx_campaign_name IF NOT EXISTS FOR (n:Campaign) ON (n.name)"
    ),
    (
        "idx_campaign_description",
        "CREATE TEXT INDEX idx_campaign_description IF NOT EXISTS FOR (n:Campaign) ON (n.description)"
    ),
    (
        "idx_campaign_region",
        "CREATE TEXT INDEX idx_campaign_region IF NOT EXISTS FOR (n:Campaign) ON (n.region)"
    ),
    # Channel — text search on name, type
    (
        "idx_channel_name",
        "CREATE TEXT INDEX idx_channel_name IF NOT EXISTS FOR (n:Channel) ON (n.name)"
    ),
    (
        "idx_channel_type",
        "CREATE TEXT INDEX idx_channel_type IF NOT EXISTS FOR (n:Channel) ON (n.type)"
    ),
    # Product — text search on name, category
    (
        "idx_product_name",
        "CREATE TEXT INDEX idx_product_name IF NOT EXISTS FOR (n:Product) ON (n.name)"
    ),
    (
        "idx_product_category",
        "CREATE TEXT INDEX idx_product_category IF NOT EXISTS FOR (n:Product) ON (n.category)"
    ),
    # AgentCluster — text search on cluster_label, segment
    (
        "idx_agentcluster_label",
        "CREATE TEXT INDEX idx_agentcluster_label IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_label)"
    ),
    (
        "idx_agentcluster_segment",
        "CREATE TEXT INDEX idx_agentcluster_segment IF NOT EXISTS FOR (n:AgentCluster) ON (n.segment)"
    ),
    # Competitor — text search on name, industry, strategy
    (
        "idx_competitor_name",
        "CREATE TEXT INDEX idx_competitor_name IF NOT EXISTS FOR (n:Competitor) ON (n.name)"
    ),
    (
        "idx_competitor_industry",
        "CREATE TEXT INDEX idx_competitor_industry IF NOT EXISTS FOR (n:Competitor) ON (n.industry)"
    ),
    (
        "idx_competitor_strategy",
        "CREATE TEXT INDEX idx_competitor_strategy IF NOT EXISTS FOR (n:Competitor) ON (n.strategy)"
    ),
    # Outcome — text search on outcome_type
    (
        "idx_outcome_type",
        "CREATE TEXT INDEX idx_outcome_type IF NOT EXISTS FOR (n:Outcome) ON (n.outcome_type)"
    ),
    # CompetitorContext — text search on URL (existing node from scraper)
    (
        "idx_competitorctx_url",
        "CREATE TEXT INDEX idx_competitorctx_url IF NOT EXISTS FOR (n:CompetitorContext) ON (n.url)"
    ),
]

RANGE_INDEXES: List[Tuple[str, str]] = [
    # Campaign — numeric filtering on Ad_Spend, Impressions
    (
        "idx_campaign_ad_spend",
        "CREATE RANGE INDEX idx_campaign_ad_spend IF NOT EXISTS FOR (n:Campaign) ON (n.Ad_Spend)"
    ),
    (
        "idx_campaign_impressions",
        "CREATE RANGE INDEX idx_campaign_impressions IF NOT EXISTS FOR (n:Campaign) ON (n.Impressions)"
    ),
    # Channel — numeric filtering on Decay_Rate, Saturation_Point
    (
        "idx_channel_decay_rate",
        "CREATE RANGE INDEX idx_channel_decay_rate IF NOT EXISTS FOR (n:Channel) ON (n.Decay_Rate)"
    ),
    (
        "idx_channel_saturation_point",
        "CREATE RANGE INDEX idx_channel_saturation_point IF NOT EXISTS FOR (n:Channel) ON (n.Saturation_Point)"
    ),
    # Product — numeric filtering on Price
    (
        "idx_product_price",
        "CREATE RANGE INDEX idx_product_price IF NOT EXISTS FOR (n:Product) ON (n.Price)"
    ),
    # Competitor — numeric filtering on Inflation_Rate, market_share
    (
        "idx_competitor_inflation_rate",
        "CREATE RANGE INDEX idx_competitor_inflation_rate IF NOT EXISTS FOR (n:Competitor) ON (n.Inflation_Rate)"
    ),
    (
        "idx_competitor_market_share",
        "CREATE RANGE INDEX idx_competitor_market_share IF NOT EXISTS FOR (n:Competitor) ON (n.market_share)"
    ),
    # AgentCluster — numeric filtering on cluster_size, avg_conversion_rate
    (
        "idx_agentcluster_size",
        "CREATE RANGE INDEX idx_agentcluster_size IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_size)"
    ),
    (
        "idx_agentcluster_conversion",
        "CREATE RANGE INDEX idx_agentcluster_conversion IF NOT EXISTS FOR (n:AgentCluster) ON (n.avg_conversion_rate)"
    ),
    # Outcome — numeric filtering on revenue, conversions
    (
        "idx_outcome_revenue",
        "CREATE RANGE INDEX idx_outcome_revenue IF NOT EXISTS FOR (n:Outcome) ON (n.revenue)"
    ),
    (
        "idx_outcome_conversions",
        "CREATE RANGE INDEX idx_outcome_conversions IF NOT EXISTS FOR (n:Outcome) ON (n.conversions)"
    ),
]


def create_indexes() -> dict:
    """
    Connects to Neo4j and executes all index creation statements.
    
    Returns:
        dict: Summary of created/existing indexes and any errors.
    """
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")

    results = {"text_indexes": [], "range_indexes": [], "errors": []}

    driver = None
    try:
        logger.info(f"Connecting to Neo4j at {uri}...")
        driver = GraphDatabase.driver(uri, auth=(username, password))
        driver.verify_connectivity()
        logger.info("Neo4j connection verified.")

        with driver.session() as session:
            # Create text indexes
            logger.info("=== Creating TEXT indexes ===")
            for name, cypher in TEXT_INDEXES:
                try:
                    session.run(cypher)
                    logger.info(f"  ✓ {name}")
                    results["text_indexes"].append(name)
                except Exception as e:
                    logger.warning(f"  ✗ {name}: {e}")
                    results["errors"].append({"index": name, "error": str(e)})

            # Create range indexes
            logger.info("=== Creating RANGE indexes ===")
            for name, cypher in RANGE_INDEXES:
                try:
                    session.run(cypher)
                    logger.info(f"  ✓ {name}")
                    results["range_indexes"].append(name)
                except Exception as e:
                    logger.warning(f"  ✗ {name}: {e}")
                    results["errors"].append({"index": name, "error": str(e)})

            # Verify: list all indexes
            logger.info("=== Verifying indexes ===")
            records = session.run("SHOW INDEXES YIELD name, type, labelsOrTypes, properties")
            for record in records:
                logger.info(
                    f"  Index: {record['name']} | Type: {record['type']} | "
                    f"Labels: {record['labelsOrTypes']} | Properties: {record['properties']}"
                )

    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        results["errors"].append({"index": "CONNECTION", "error": str(e)})
    finally:
        if driver:
            driver.close()
            logger.info("Neo4j connection closed.")

    # Summary
    total = len(TEXT_INDEXES) + len(RANGE_INDEXES)
    created = len(results["text_indexes"]) + len(results["range_indexes"])
    errors = len(results["errors"])
    logger.info(f"\n=== SUMMARY: {created}/{total} indexes applied, {errors} errors ===")
    
    return results


if __name__ == "__main__":
    create_indexes()
