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
import logging
from typing import List, Tuple

from dotenv import load_dotenv
load_dotenv()

from neo4j import GraphDatabase  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ── Index Definitions ──────────────────────────────────────────────────────
# Each tuple: (index_name, cypher_statement)

TEXT_INDEXES: List[Tuple[str, str]] = [
    # ── Campaign ─────────────────────────────────────────────────────────────
    # Text search on name, description, region for semantic retrieval
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

    # ── Channel ──────────────────────────────────────────────────────────────
    (
        "idx_channel_name",
        "CREATE TEXT INDEX idx_channel_name IF NOT EXISTS FOR (n:Channel) ON (n.name)"
    ),
    (
        "idx_channel_type",
        "CREATE TEXT INDEX idx_channel_type IF NOT EXISTS FOR (n:Channel) ON (n.type)"
    ),
    (
        "idx_channel_platform",
        "CREATE TEXT INDEX idx_channel_platform IF NOT EXISTS FOR (n:Channel) ON (n.platform)"
    ),

    # ── Product ──────────────────────────────────────────────────────────────
    (
        "idx_product_name",
        "CREATE TEXT INDEX idx_product_name IF NOT EXISTS FOR (n:Product) ON (n.name)"
    ),
    (
        "idx_product_category",
        "CREATE TEXT INDEX idx_product_category IF NOT EXISTS FOR (n:Product) ON (n.category)"
    ),

    # ── AgentCluster ─────────────────────────────────────────────────────────
    (
        "idx_agentcluster_label",
        "CREATE TEXT INDEX idx_agentcluster_label IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_label)"
    ),
    (
        "idx_agentcluster_segment",
        "CREATE TEXT INDEX idx_agentcluster_segment IF NOT EXISTS FOR (n:AgentCluster) ON (n.segment)"
    ),
    (
        "idx_agentcluster_name",
        "CREATE TEXT INDEX idx_agentcluster_name IF NOT EXISTS FOR (n:AgentCluster) ON (n.name)"
    ),

    # ── Competitor ───────────────────────────────────────────────────────────
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

    # ── Outcome ──────────────────────────────────────────────────────────────
    (
        "idx_outcome_type",
        "CREATE TEXT INDEX idx_outcome_type IF NOT EXISTS FOR (n:Outcome) ON (n.outcome_type)"
    ),

    # ── CompetitorContext — text on URL + scraped content (Firecrawl nodes) ──
    (
        "idx_competitorctx_url",
        "CREATE TEXT INDEX idx_competitorctx_url IF NOT EXISTS FOR (n:CompetitorContext) ON (n.url)"
    ),
    (
        "idx_competitorctx_content",
        "CREATE TEXT INDEX idx_competitorctx_content IF NOT EXISTS FOR (n:CompetitorContext) ON (n.content)"
    ),

    # ── MacroContext — text search on macro flags (OPERATES_IN traversal) ───
    (
        "idx_macrocontext_flag",
        "CREATE TEXT INDEX idx_macrocontext_flag IF NOT EXISTS FOR (n:MacroContext) ON (n.flag)"
    ),

    # ── User — text search on clerk_id (queried on every API request) ───────
    (
        "idx_user_clerk_id",
        "CREATE TEXT INDEX idx_user_clerk_id IF NOT EXISTS FOR (n:User) ON (n.clerk_id)"
    ),
]

RANGE_INDEXES: List[Tuple[str, str]] = [
    # ── Campaign — numeric filtering on budget, cpc, financial metrics ───────
    (
        "idx_campaign_budget",
        "CREATE RANGE INDEX idx_campaign_budget IF NOT EXISTS FOR (n:Campaign) ON (n.budget)"
    ),
    (
        "idx_campaign_ad_spend",
        "CREATE RANGE INDEX idx_campaign_ad_spend IF NOT EXISTS FOR (n:Campaign) ON (n.Ad_Spend)"
    ),
    (
        "idx_campaign_impressions",
        "CREATE RANGE INDEX idx_campaign_impressions IF NOT EXISTS FOR (n:Campaign) ON (n.Impressions)"
    ),
    (
        "idx_campaign_aov",
        "CREATE RANGE INDEX idx_campaign_aov IF NOT EXISTS FOR (n:Campaign) ON (n.aov)"
    ),
    (
        "idx_campaign_cac",
        "CREATE RANGE INDEX idx_campaign_cac IF NOT EXISTS FOR (n:Campaign) ON (n.cac)"
    ),
    (
        "idx_campaign_ltv",
        "CREATE RANGE INDEX idx_campaign_ltv IF NOT EXISTS FOR (n:Campaign) ON (n.ltv)"
    ),
    (
        "idx_campaign_historical_revenue",
        "CREATE RANGE INDEX idx_campaign_historical_revenue IF NOT EXISTS FOR (n:Campaign) ON (n.historical_revenue)"
    ),

    # ── Channel — numeric filtering on Decay_Rate, Saturation_Point ──────────
    (
        "idx_channel_decay_rate",
        "CREATE RANGE INDEX idx_channel_decay_rate IF NOT EXISTS FOR (n:Channel) ON (n.Decay_Rate)"
    ),
    (
        "idx_channel_saturation_point",
        "CREATE RANGE INDEX idx_channel_saturation_point IF NOT EXISTS FOR (n:Channel) ON (n.Saturation_Point)"
    ),
    (
        "idx_channel_avg_cpc",
        "CREATE RANGE INDEX idx_channel_avg_cpc IF NOT EXISTS FOR (n:Channel) ON (n.avg_cpc)"
    ),

    # ── Product ──────────────────────────────────────────────────────────────
    (
        "idx_product_price",
        "CREATE RANGE INDEX idx_product_price IF NOT EXISTS FOR (n:Product) ON (n.Price)"
    ),

    # ── Competitor — numeric filtering on market_share, share_of_voice ───────
    (
        "idx_competitor_inflation_rate",
        "CREATE RANGE INDEX idx_competitor_inflation_rate IF NOT EXISTS FOR (n:Competitor) ON (n.Inflation_Rate)"
    ),
    (
        "idx_competitor_market_share",
        "CREATE RANGE INDEX idx_competitor_market_share IF NOT EXISTS FOR (n:Competitor) ON (n.market_share)"
    ),
    (
        "idx_competitor_sov",
        "CREATE RANGE INDEX idx_competitor_sov IF NOT EXISTS FOR (n:Competitor) ON (n.share_of_voice)"
    ),

    # ── AgentCluster — numeric filtering on cluster_size, behavioural scores ─
    (
        "idx_agentcluster_size",
        "CREATE RANGE INDEX idx_agentcluster_size IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_size)"
    ),
    (
        "idx_agentcluster_conversion",
        "CREATE RANGE INDEX idx_agentcluster_conversion IF NOT EXISTS FOR (n:AgentCluster) ON (n.avg_conversion_rate)"
    ),
    (
        "idx_agentcluster_abm_size",
        "CREATE RANGE INDEX idx_agentcluster_abm_size IF NOT EXISTS FOR (n:AgentCluster) ON (n.size)"
    ),
    (
        "idx_agentcluster_avg_ltv",
        "CREATE RANGE INDEX idx_agentcluster_avg_ltv IF NOT EXISTS FOR (n:AgentCluster) ON (n.avg_ltv)"
    ),
    (
        "idx_agentcluster_brand_loyalty",
        "CREATE RANGE INDEX idx_agentcluster_brand_loyalty IF NOT EXISTS FOR (n:AgentCluster) ON (n.brand_loyalty)"
    ),

    # ── Outcome — numeric filtering on revenue, conversions, ROAS ────────────
    (
        "idx_outcome_revenue",
        "CREATE RANGE INDEX idx_outcome_revenue IF NOT EXISTS FOR (n:Outcome) ON (n.revenue)"
    ),
    (
        "idx_outcome_conversions",
        "CREATE RANGE INDEX idx_outcome_conversions IF NOT EXISTS FOR (n:Outcome) ON (n.conversions)"
    ),
    (
        "idx_outcome_total_revenue",
        "CREATE RANGE INDEX idx_outcome_total_revenue IF NOT EXISTS FOR (n:Outcome) ON (n.total_revenue)"
    ),
    (
        "idx_outcome_total_conversions",
        "CREATE RANGE INDEX idx_outcome_total_conversions IF NOT EXISTS FOR (n:Outcome) ON (n.total_conversions)"
    ),
    (
        "idx_outcome_actual_roas",
        "CREATE RANGE INDEX idx_outcome_actual_roas IF NOT EXISTS FOR (n:Outcome) ON (n.actual_roas)"
    ),
]

# ── Lookup / uniqueness indexes on primary identifiers ───────────────────
# These cover both the simulate.py pattern (Campaign.id) and the seed
# script pattern (Campaign.campaign_id) so MATCH/MERGE on either is fast.
LOOKUP_INDEXES: List[Tuple[str, str]] = [
    (
        "idx_campaign_id",
        "CREATE RANGE INDEX idx_campaign_id IF NOT EXISTS FOR (n:Campaign) ON (n.id)"
    ),
    (
        "idx_campaign_campaign_id",
        "CREATE RANGE INDEX idx_campaign_campaign_id IF NOT EXISTS FOR (n:Campaign) ON (n.campaign_id)"
    ),
    (
        "idx_user_clerk_id_range",
        "CREATE RANGE INDEX idx_user_clerk_id_range IF NOT EXISTS FOR (n:User) ON (n.clerk_id)"
    ),
    (
        "idx_channel_channel_id",
        "CREATE RANGE INDEX idx_channel_channel_id IF NOT EXISTS FOR (n:Channel) ON (n.channel_id)"
    ),
    (
        "idx_agentcluster_id",
        "CREATE RANGE INDEX idx_agentcluster_id IF NOT EXISTS FOR (n:AgentCluster) ON (n.id)"
    ),
    (
        "idx_agentcluster_cluster_id",
        "CREATE RANGE INDEX idx_agentcluster_cluster_id IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_id)"
    ),
    (
        "idx_competitor_competitor_id",
        "CREATE RANGE INDEX idx_competitor_competitor_id IF NOT EXISTS FOR (n:Competitor) ON (n.competitor_id)"
    ),
    (
        "idx_outcome_outcome_id",
        "CREATE RANGE INDEX idx_outcome_outcome_id IF NOT EXISTS FOR (n:Outcome) ON (n.outcome_id)"
    ),
]

# ── Relationship property indexes for k-hop traversal edges ──────────────
# ALLOCATED_TO.spend   — filtered in budget optimisation queries
# INFLUENCES.transition_probability — core of Markov attribution retrieval
# SUPPRESSES.impact_score — competitive impact scoring in GraphRAG
REL_PROPERTY_INDEXES: List[Tuple[str, str]] = [
    (
        "idx_rel_allocated_to_spend",
        "CREATE RANGE INDEX idx_rel_allocated_to_spend IF NOT EXISTS FOR ()-[r:ALLOCATED_TO]-() ON (r.spend)"
    ),
    (
        "idx_rel_influences_prob",
        "CREATE RANGE INDEX idx_rel_influences_prob IF NOT EXISTS FOR ()-[r:INFLUENCES]-() ON (r.transition_probability)"
    ),
    (
        "idx_rel_suppresses_impact",
        "CREATE RANGE INDEX idx_rel_suppresses_impact IF NOT EXISTS FOR ()-[r:SUPPRESSES]-() ON (r.impact_score)"
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

    results = {
        "text_indexes": [],
        "range_indexes": [],
        "lookup_indexes": [],
        "rel_property_indexes": [],
        "errors": [],
    }

    # All index categories with their result key
    _INDEX_GROUPS = [
        ("TEXT indexes", TEXT_INDEXES, "text_indexes"),
        ("RANGE indexes", RANGE_INDEXES, "range_indexes"),
        ("LOOKUP / ID indexes", LOOKUP_INDEXES, "lookup_indexes"),
        ("RELATIONSHIP PROPERTY indexes", REL_PROPERTY_INDEXES, "rel_property_indexes"),
    ]

    driver = None
    try:
        logger.info(f"Connecting to Neo4j at {uri}...")
        driver = GraphDatabase.driver(uri, auth=(username, password))
        driver.verify_connectivity()
        logger.info("Neo4j connection verified.")

        with driver.session() as session:
            for group_label, index_list, result_key in _INDEX_GROUPS:
                logger.info("=== Creating %s ===", group_label)
                for name, cypher in index_list:
                    try:
                        session.run(cypher)
                        logger.info(f"  ✓ {name}")
                        results[result_key].append(name)
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
    total = sum(len(il) for _, il, _ in _INDEX_GROUPS)
    created = sum(len(results[rk]) for _, _, rk in _INDEX_GROUPS)
    errors = len(results["errors"])
    logger.info(f"\n=== SUMMARY: {created}/{total} indexes applied, {errors} errors ===")
    
    return results


if __name__ == "__main__":
    create_indexes()
