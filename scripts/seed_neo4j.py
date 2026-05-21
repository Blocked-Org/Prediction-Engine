"""
scripts/seed_neo4j.py — Seed the Neo4j knowledge graph with realistic
sample campaign data for the Brand Simulation Engine demo.

This script is idempotent: it uses MERGE on unique IDs so it is safe to
re-run without creating duplicate nodes.

Graph schema (from whitepaper Section 6 / Table 4):
  Nodes  : User, Campaign, Channel, AgentCluster, Competitor, Outcome
  Causal : INFLUENCES, SUPPRESSES, CANNIBALIZES, GENERATES
  Struct : ALLOCATED_TO, TARGETS, BELONGS_TO, INTERACTS_WITH, OWNS

Usage:
    python -m scripts.seed_neo4j               # full seed
    python -m scripts.seed_neo4j --wipe        # WIPE all nodes, then seed
    python -m scripts.seed_neo4j --verify      # connectivity check only

Environment variables (loaded from .env):
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import date, timedelta
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from neo4j import GraphDatabase, Driver  # noqa: E402
from neo4j.exceptions import ServiceUnavailable  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("seed_neo4j")

# ─────────────────────────────────────────────────────────────────────────────
# Connection helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_driver() -> Driver:
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")
    logger.info("Connecting to Neo4j at %s as '%s'…", uri, user)
    driver = GraphDatabase.driver(uri, auth=(user, password))
    driver.verify_connectivity()
    logger.info("Connection verified.")
    return driver


def _wipe(driver: Driver) -> None:
    logger.warning("⚠️  WIPE mode: deleting ALL nodes and relationships…")
    with driver.session() as s:
        s.run("MATCH (n) DETACH DELETE n")
    logger.info("Graph cleared.")


# ─────────────────────────────────────────────────────────────────────────────
# Seed data definitions
# ─────────────────────────────────────────────────────────────────────────────

# Deterministic UUIDs so the script is idempotent
DEMO_USER_ID = "demo_clerk_user_001"

CAMPAIGNS = [
    {
        "campaign_id": "camp_eid_2024",
        "name": "Eid ul-Fitr Flash Sale 2024",
        "budget": 150_000.0,
        "cpc": 1.80,
        "base_price": 1_200.0,
        "discount_rate": 0.20,
        "primary_channels": ["Meta", "Google", "TikTok"],
        "historical_revenue": 820_000.0,
        "aov": 2_400.0,
        "cac": 320.0,
        "ltv": 9_600.0,
        "regions": ["Dhaka", "Chittagong"],
        "target_age_range": "22-40",
        "intent_clusters": ["fashion_intent", "gift_buying", "discount_seekers"],
        "competitors": ["Daraz", "Shajgoj"],
        "macroeconomic_flags": ["ramadan_boost", "inflation_moderate"],
        "start_date": str(date.today() - timedelta(days=90)),
        "end_date": str(date.today()),
    },
    {
        "campaign_id": "camp_winter_2024",
        "name": "Winter Collection 2024",
        "budget": 80_000.0,
        "cpc": 1.40,
        "base_price": 950.0,
        "discount_rate": 0.10,
        "primary_channels": ["Meta", "Google"],
        "historical_revenue": 430_000.0,
        "aov": 1_900.0,
        "cac": 280.0,
        "ltv": 7_200.0,
        "regions": ["Dhaka", "Sylhet"],
        "target_age_range": "25-45",
        "intent_clusters": ["fashion_intent", "seasonal_shoppers"],
        "competitors": ["Daraz"],
        "macroeconomic_flags": ["winter_seasonality"],
        "start_date": str(date.today() - timedelta(days=180)),
        "end_date": str(date.today() - timedelta(days=90)),
    },
]

CHANNELS = [
    {
        "channel_id": "ch_meta",
        "name": "Meta",
        "type": "social",
        "decay_rate": 0.55,
        "saturation_point": 90_000.0,
        "avg_cpc": 1.80,
        "platform": "facebook_instagram",
    },
    {
        "channel_id": "ch_google",
        "name": "Google",
        "type": "search",
        "decay_rate": 0.20,
        "saturation_point": 60_000.0,
        "avg_cpc": 2.50,
        "platform": "google_ads",
    },
    {
        "channel_id": "ch_tiktok",
        "name": "TikTok",
        "type": "social_video",
        "decay_rate": 0.70,
        "saturation_point": 40_000.0,
        "avg_cpc": 0.95,
        "platform": "tiktok_ads",
    },
    {
        "channel_id": "ch_email",
        "name": "Email",
        "type": "crm",
        "decay_rate": 0.10,
        "saturation_point": 5_000.0,
        "avg_cpc": 0.05,
        "platform": "mailchimp",
    },
]

AGENT_CLUSTERS = [
    {
        "cluster_id": "seg_urban_millennial",
        "name": "Urban Millennials (Dhaka)",
        "size": 450_000,
        "avg_ltv": 12_000.0,
        "brand_loyalty": 0.65,
        "price_sensitivity": 0.40,
        "digital_affinity": 0.90,
    },
    {
        "cluster_id": "seg_rural_young",
        "name": "Rural Young Adults (Chittagong/Sylhet)",
        "size": 280_000,
        "avg_ltv": 5_500.0,
        "brand_loyalty": 0.45,
        "price_sensitivity": 0.75,
        "digital_affinity": 0.55,
    },
    {
        "cluster_id": "seg_professional",
        "name": "Urban Professionals 35-50",
        "size": 190_000,
        "avg_ltv": 22_000.0,
        "brand_loyalty": 0.80,
        "price_sensitivity": 0.20,
        "digital_affinity": 0.70,
    },
]

COMPETITORS = [
    {
        "competitor_id": "comp_daraz",
        "name": "Daraz",
        "market_share": 0.35,
        "share_of_voice": 0.42,
        "avg_discount": 0.18,
        "primary_channels": ["Meta", "Google", "TikTok"],
    },
    {
        "competitor_id": "comp_shajgoj",
        "name": "Shajgoj",
        "market_share": 0.12,
        "share_of_voice": 0.15,
        "avg_discount": 0.10,
        "primary_channels": ["Meta"],
    },
    {
        "competitor_id": "comp_chaldal",
        "name": "Chaldal",
        "market_share": 0.08,
        "share_of_voice": 0.09,
        "avg_discount": 0.05,
        "primary_channels": ["Google", "Meta"],
    },
]

OUTCOMES = [
    {
        "outcome_id": "out_eid_2024",
        "campaign_id": "camp_eid_2024",
        "total_revenue": 892_500.0,
        "total_conversions": 372,
        "actual_roas": 5.95,
        "actual_cac": 403.0,
    },
    {
        "outcome_id": "out_winter_2024",
        "campaign_id": "camp_winter_2024",
        "total_revenue": 465_000.0,
        "total_conversions": 245,
        "actual_roas": 5.81,
        "actual_cac": 326.0,
    },
]

# Competitor context nodes (proxy for Firecrawl-scraped intelligence)
COMPETITOR_CONTEXTS = [
    {
        "url": "https://www.daraz.com.bd/promotions",
        "content": (
            "Daraz running 'Mega Sale' with 30% off fashion category. "
            "Active Meta and Google display campaigns. "
            "Estimated share of voice: 42%. Heavy TikTok influencer presence."
        ),
    },
    {
        "url": "https://www.shajgoj.com/offers",
        "content": (
            "Shajgoj launching loyalty points programme. "
            "Meta carousel ads targeting Dhaka 22-35 female demographic. "
            "Estimated share of voice: 15%."
        ),
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Cypher: core node MERGE statements
# ─────────────────────────────────────────────────────────────────────────────

_MERGE_USER = """
MERGE (u:User {clerk_id: $clerk_user_id})
SET   u.is_onboarded = true,
      u.created_at   = coalesce(u.created_at, datetime()),
      u.updated_at   = datetime()
RETURN u
"""

_MERGE_CAMPAIGN = """
MERGE (c:Campaign {campaign_id: $campaign_id})
SET   c.name               = $name,
      c.budget              = $budget,
      c.cpc                 = $cpc,
      c.base_price          = $base_price,
      c.discount_rate       = $discount_rate,
      c.primary_channels    = $primary_channels,
      c.historical_revenue  = $historical_revenue,
      c.aov                 = $aov,
      c.cac                 = $cac,
      c.ltv                 = $ltv,
      c.regions             = $regions,
      c.target_age_range    = $target_age_range,
      c.intent_clusters     = $intent_clusters,
      c.competitor_names    = $competitors,
      c.macroeconomic_flags = $macroeconomic_flags,
      c.start_date          = $start_date,
      c.end_date            = $end_date,
      c.updated_at          = datetime()
RETURN c
"""

_MERGE_CHANNEL = """
MERGE (ch:Channel {channel_id: $channel_id})
SET   ch.name             = $name,
      ch.type             = $type,
      ch.decay_rate       = $decay_rate,
      ch.saturation_point = $saturation_point,
      ch.avg_cpc          = $avg_cpc,
      ch.platform         = $platform,
      ch.updated_at       = datetime()
RETURN ch
"""

_MERGE_AGENT_CLUSTER = """
MERGE (a:AgentCluster {cluster_id: $cluster_id})
SET   a.name             = $name,
      a.size             = $size,
      a.avg_ltv          = $avg_ltv,
      a.brand_loyalty    = $brand_loyalty,
      a.price_sensitivity = $price_sensitivity,
      a.digital_affinity = $digital_affinity,
      a.updated_at       = datetime()
RETURN a
"""

_MERGE_COMPETITOR = """
MERGE (comp:Competitor {competitor_id: $competitor_id})
SET   comp.name             = $name,
      comp.market_share     = $market_share,
      comp.share_of_voice   = $share_of_voice,
      comp.avg_discount     = $avg_discount,
      comp.primary_channels = $primary_channels,
      comp.updated_at       = datetime()
RETURN comp
"""

_MERGE_OUTCOME = """
MERGE (o:Outcome {outcome_id: $outcome_id})
SET   o.campaign_id       = $campaign_id,
      o.total_revenue     = $total_revenue,
      o.total_conversions = $total_conversions,
      o.actual_roas       = $actual_roas,
      o.actual_cac        = $actual_cac,
      o.updated_at        = datetime()
RETURN o
"""

_MERGE_COMPETITOR_CONTEXT = """
MERGE (ctx:CompetitorContext {url: $url})
SET   ctx.content    = $content,
      ctx.scraped_at = timestamp()
RETURN ctx
"""

# ─────────────────────────────────────────────────────────────────────────────
# Cypher: relationship MERGE statements
# ─────────────────────────────────────────────────────────────────────────────

_REL_USER_OWNS_CAMPAIGN = """
MATCH (u:User {clerk_id: $clerk_user_id})
MATCH (c:Campaign {campaign_id: $campaign_id})
MERGE (u)-[:OWNS]->(c)
"""

_REL_CAMPAIGN_ALLOCATED_TO_CHANNEL = """
MATCH (c:Campaign {campaign_id: $campaign_id})
MATCH (ch:Channel {name: $channel_name})
MERGE (c)-[r:ALLOCATED_TO]->(ch)
SET   r.spend = $spend,
      r.updated_at = datetime()
"""

_REL_CAMPAIGN_TARGETS_CLUSTER = """
MATCH (c:Campaign {campaign_id: $campaign_id})
MATCH (a:AgentCluster {cluster_id: $cluster_id})
MERGE (c)-[:TARGETS]->(a)
"""

_REL_COMPETITOR_SUPPRESSES_CAMPAIGN = """
MATCH (comp:Competitor {competitor_id: $competitor_id})
MATCH (c:Campaign {campaign_id: $campaign_id})
MERGE (comp)-[r:SUPPRESSES]->(c)
SET   r.impact_score = $impact_score
"""

_REL_CAMPAIGN_GENERATES_OUTCOME = """
MATCH (c:Campaign {campaign_id: $campaign_id})
MATCH (o:Outcome {outcome_id: $outcome_id})
MERGE (c)-[:GENERATES]->(o)
"""

_REL_CHANNEL_INFLUENCES_CHANNEL = """
MATCH (a:Channel {name: $from_channel})
MATCH (b:Channel {name: $to_channel})
MERGE (a)-[r:INFLUENCES]->(b)
SET   r.transition_probability = $prob
"""


# ─────────────────────────────────────────────────────────────────────────────
# Seed functions
# ─────────────────────────────────────────────────────────────────────────────

def seed_nodes(driver: Driver) -> None:
    logger.info("Seeding nodes…")
    with driver.session() as s:

        # ── User ──────────────────────────────────────────────────────────────
        s.run(_MERGE_USER, clerk_user_id=DEMO_USER_ID)
        logger.info("  ✓ User: %s", DEMO_USER_ID)

        # ── Campaigns ─────────────────────────────────────────────────────────
        for camp in CAMPAIGNS:
            s.run(_MERGE_CAMPAIGN, **camp)
            logger.info("  ✓ Campaign: %s", camp["name"])

        # ── Channels ──────────────────────────────────────────────────────────
        for ch in CHANNELS:
            s.run(_MERGE_CHANNEL, **ch)
            logger.info("  ✓ Channel: %s", ch["name"])

        # ── Agent Clusters ────────────────────────────────────────────────────
        for seg in AGENT_CLUSTERS:
            s.run(_MERGE_AGENT_CLUSTER, **seg)
            logger.info("  ✓ AgentCluster: %s", seg["name"])

        # ── Competitors ───────────────────────────────────────────────────────
        for comp in COMPETITORS:
            s.run(_MERGE_COMPETITOR, **comp)
            logger.info("  ✓ Competitor: %s", comp["name"])

        # ── Outcomes ──────────────────────────────────────────────────────────
        for out in OUTCOMES:
            s.run(_MERGE_OUTCOME, **out)
            logger.info("  ✓ Outcome: %s", out["outcome_id"])

        # ── CompetitorContext (proxy for Firecrawl ingestion) ─────────────────
        for ctx in COMPETITOR_CONTEXTS:
            s.run(_MERGE_COMPETITOR_CONTEXT, **ctx)
            logger.info("  ✓ CompetitorContext: %s", ctx["url"])

    logger.info("Node seeding complete.")


def seed_relationships(driver: Driver) -> None:
    logger.info("Seeding relationships…")
    with driver.session() as s:

        # ── User OWNS Campaigns ───────────────────────────────────────────────
        for camp in CAMPAIGNS:
            s.run(_REL_USER_OWNS_CAMPAIGN,
                  clerk_user_id=DEMO_USER_ID,
                  campaign_id=camp["campaign_id"])

        # ── Campaign ALLOCATED_TO Channels (with per-channel spend) ───────────
        for camp in CAMPAIGNS:
            n = len(camp["primary_channels"])
            per_ch = camp["budget"] / n
            for ch_name in camp["primary_channels"]:
                s.run(_REL_CAMPAIGN_ALLOCATED_TO_CHANNEL,
                      campaign_id=camp["campaign_id"],
                      channel_name=ch_name,
                      spend=round(per_ch, 2))

        # ── Campaign TARGETS AgentClusters ────────────────────────────────────
        for camp in CAMPAIGNS:
            for seg in AGENT_CLUSTERS:
                # Target the cluster if regions overlap
                if any(r in seg["name"] for r in ["Urban", "Rural"]):
                    s.run(_REL_CAMPAIGN_TARGETS_CLUSTER,
                          campaign_id=camp["campaign_id"],
                          cluster_id=seg["cluster_id"])

        # ── Competitor SUPPRESSES Campaign ────────────────────────────────────
        for camp in CAMPAIGNS:
            for i, comp_name in enumerate(camp["competitors"]):
                # Find competitor by name
                comp = next(
                    (c for c in COMPETITORS if c["name"] == comp_name), None
                )
                if comp:
                    impact = round(min(1.0, 0.3 + 0.15 * i), 2)
                    s.run(_REL_COMPETITOR_SUPPRESSES_CAMPAIGN,
                          competitor_id=comp["competitor_id"],
                          campaign_id=camp["campaign_id"],
                          impact_score=impact)

        # ── Campaign GENERATES Outcome ────────────────────────────────────────
        for out in OUTCOMES:
            s.run(_REL_CAMPAIGN_GENERATES_OUTCOME,
                  campaign_id=out["campaign_id"],
                  outcome_id=out["outcome_id"])

        # ── Channel INFLUENCES Channel (Markov-style transition graph) ────────
        # Represents the k-hop traversal edges the GraphRAG retriever will use
        transitions = [
            ("Meta",   "Google",  0.32),  # Social discovery → branded search
            ("TikTok", "Meta",    0.45),  # TikTok view → Meta retargeting
            ("Google", "Email",   0.18),  # Search conversion → email list
            ("Meta",   "TikTok",  0.25),  # Cross-platform spillover
            ("Google", "Meta",    0.20),  # SERP click → social retargeting
        ]
        for from_ch, to_ch, prob in transitions:
            s.run(_REL_CHANNEL_INFLUENCES_CHANNEL,
                  from_channel=from_ch,
                  to_channel=to_ch,
                  prob=prob)

    logger.info("Relationship seeding complete.")


def verify_graph(driver: Driver) -> None:
    """Log node and relationship counts for quick sanity check."""
    with driver.session() as s:
        counts: dict[str, Any] = {}
        for label in ["User", "Campaign", "Channel", "AgentCluster",
                       "Competitor", "Outcome", "CompetitorContext"]:
            r = s.run(f"MATCH (n:{label}) RETURN count(n) AS cnt").single()
            counts[label] = r["cnt"] if r else 0

        rel_r = s.run("MATCH ()-[r]->() RETURN count(r) AS cnt").single()
        counts["Relationships"] = rel_r["cnt"] if rel_r else 0

    logger.info("Graph contents:")
    for k, v in counts.items():
        icon = "✓" if v > 0 else "⚠"
        logger.info("  %s %-20s : %d", icon, k, v)

    if all(v > 0 for k, v in counts.items() if k != "Relationships"):
        logger.info("✅  All node types are populated — graph is ready.")
    else:
        logger.warning("⚠️   Some node types are empty. Re-run without --verify.")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the Neo4j knowledge graph with Brand Simulation Engine demo data."
    )
    parser.add_argument(
        "--wipe",
        action="store_true",
        help="Delete ALL existing nodes/relationships before seeding.",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Only print graph counts — do not modify the graph.",
    )
    args = parser.parse_args()

    try:
        driver = _get_driver()
    except ServiceUnavailable as exc:
        logger.error("Cannot reach Neo4j: %s", exc)
        logger.error(
            "Ensure Docker is running: docker compose up -d neo4j"
        )
        sys.exit(1)

    if args.verify:
        verify_graph(driver)
        driver.close()
        return

    if args.wipe:
        _wipe(driver)

    seed_nodes(driver)
    seed_relationships(driver)
    verify_graph(driver)

    driver.close()
    logger.info("Seeding complete. Neo4j is ready for demo.")


if __name__ == "__main__":
    main()
