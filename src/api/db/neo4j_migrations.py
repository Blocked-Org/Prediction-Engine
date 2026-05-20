"""
Version-controlled Neo4j migration runner.

Tracks applied migrations via a ``(:MigrationHistory)`` node in Neo4j so
that index/constraint changes are idempotent and auditable — analogous to
Alembic for Postgres.

Each migration is a named function that receives a Neo4j ``Session`` and
returns a summary dict.  Migrations are registered via the
``@register_migration`` decorator and executed in order by their version
string.

Applied migrations are recorded as::

    (:MigrationHistory {version: "001", name: "initial_indexes", applied_at: datetime()})

Usage::

    # Apply all pending migrations
    python -m src.api.db.neo4j_migrations

    # From code
    from src.api.db.neo4j_migrations import run_migrations
    summary = run_migrations()
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Tuple

from neo4j import Session as Neo4jSession

from src.api.db.neo4j_client import Neo4jManager

logger = logging.getLogger(__name__)

# ── Migration Registry ──────────────────────────────────────────────
# Ordered list of (version, name, callable) tuples.
_MIGRATIONS: List[Tuple[str, str, Callable[[Neo4jSession], Dict[str, Any]]]] = []


def register_migration(version: str, name: str):
    """
    Decorator to register a Neo4j migration function.

    Args:
        version: Sortable version string, e.g. "001", "002".
        name:    Human-readable slug, e.g. "initial_indexes".

    The decorated function must accept a single ``neo4j.Session`` argument
    and return a summary ``dict``.
    """

    def decorator(fn: Callable[[Neo4jSession], Dict[str, Any]]):
        _MIGRATIONS.append((version, name, fn))
        # Keep sorted by version so execution order is deterministic.
        _MIGRATIONS.sort(key=lambda m: m[0])
        return fn

    return decorator


# ── History Helpers ──────────────────────────────────────────────────

def _get_applied_versions(session: Neo4jSession) -> set[str]:
    """Return the set of migration versions already recorded in Neo4j."""
    result = session.run(
        "MATCH (m:MigrationHistory) RETURN m.version AS version"
    )
    return {record["version"] for record in result}


def _record_migration(
    session: Neo4jSession, version: str, name: str
) -> None:
    """Persist a MigrationHistory node for a successfully applied migration."""
    session.run(
        """
        CREATE (m:MigrationHistory {
            version: $version,
            name: $name,
            applied_at: datetime($applied_at)
        })
        """,
        version=version,
        name=name,
        applied_at=datetime.now(timezone.utc).isoformat(),
    )


# =====================================================================
# Migration Definitions
# =====================================================================
# Converted from  scripts/create_neo4j_indexes.py  into discrete,
# version-tracked migrations.
# =====================================================================


@register_migration("001", "initial_indexes")
def migration_001_initial_indexes(session: Neo4jSession) -> Dict[str, Any]:
    """
    Create all TEXT, RANGE, LOOKUP, and RELATIONSHIP PROPERTY indexes
    originally defined in ``scripts/create_neo4j_indexes.py``.
    """

    # ── TEXT indexes ─────────────────────────────────────────────────
    TEXT_INDEXES = [
        # Campaign
        "CREATE TEXT INDEX idx_campaign_name IF NOT EXISTS FOR (n:Campaign) ON (n.name)",
        "CREATE TEXT INDEX idx_campaign_description IF NOT EXISTS FOR (n:Campaign) ON (n.description)",
        "CREATE TEXT INDEX idx_campaign_region IF NOT EXISTS FOR (n:Campaign) ON (n.region)",
        # Channel
        "CREATE TEXT INDEX idx_channel_name IF NOT EXISTS FOR (n:Channel) ON (n.name)",
        "CREATE TEXT INDEX idx_channel_type IF NOT EXISTS FOR (n:Channel) ON (n.type)",
        "CREATE TEXT INDEX idx_channel_platform IF NOT EXISTS FOR (n:Channel) ON (n.platform)",
        # Product
        "CREATE TEXT INDEX idx_product_name IF NOT EXISTS FOR (n:Product) ON (n.name)",
        "CREATE TEXT INDEX idx_product_category IF NOT EXISTS FOR (n:Product) ON (n.category)",
        # AgentCluster
        "CREATE TEXT INDEX idx_agentcluster_label IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_label)",
        "CREATE TEXT INDEX idx_agentcluster_segment IF NOT EXISTS FOR (n:AgentCluster) ON (n.segment)",
        "CREATE TEXT INDEX idx_agentcluster_name IF NOT EXISTS FOR (n:AgentCluster) ON (n.name)",
        # Competitor
        "CREATE TEXT INDEX idx_competitor_name IF NOT EXISTS FOR (n:Competitor) ON (n.name)",
        "CREATE TEXT INDEX idx_competitor_industry IF NOT EXISTS FOR (n:Competitor) ON (n.industry)",
        "CREATE TEXT INDEX idx_competitor_strategy IF NOT EXISTS FOR (n:Competitor) ON (n.strategy)",
        # Outcome
        "CREATE TEXT INDEX idx_outcome_type IF NOT EXISTS FOR (n:Outcome) ON (n.outcome_type)",
        # CompetitorContext
        "CREATE TEXT INDEX idx_competitorctx_url IF NOT EXISTS FOR (n:CompetitorContext) ON (n.url)",
        "CREATE TEXT INDEX idx_competitorctx_content IF NOT EXISTS FOR (n:CompetitorContext) ON (n.content)",
        # MacroContext
        "CREATE TEXT INDEX idx_macrocontext_flag IF NOT EXISTS FOR (n:MacroContext) ON (n.flag)",
        # User
        "CREATE TEXT INDEX idx_user_clerk_id IF NOT EXISTS FOR (n:User) ON (n.clerk_id)",
    ]

    # ── RANGE indexes ───────────────────────────────────────────────
    RANGE_INDEXES = [
        # Campaign
        "CREATE RANGE INDEX idx_campaign_budget IF NOT EXISTS FOR (n:Campaign) ON (n.budget)",
        "CREATE RANGE INDEX idx_campaign_ad_spend IF NOT EXISTS FOR (n:Campaign) ON (n.Ad_Spend)",
        "CREATE RANGE INDEX idx_campaign_impressions IF NOT EXISTS FOR (n:Campaign) ON (n.Impressions)",
        "CREATE RANGE INDEX idx_campaign_aov IF NOT EXISTS FOR (n:Campaign) ON (n.aov)",
        "CREATE RANGE INDEX idx_campaign_cac IF NOT EXISTS FOR (n:Campaign) ON (n.cac)",
        "CREATE RANGE INDEX idx_campaign_ltv IF NOT EXISTS FOR (n:Campaign) ON (n.ltv)",
        "CREATE RANGE INDEX idx_campaign_historical_revenue IF NOT EXISTS FOR (n:Campaign) ON (n.historical_revenue)",
        # Channel
        "CREATE RANGE INDEX idx_channel_decay_rate IF NOT EXISTS FOR (n:Channel) ON (n.Decay_Rate)",
        "CREATE RANGE INDEX idx_channel_saturation_point IF NOT EXISTS FOR (n:Channel) ON (n.Saturation_Point)",
        "CREATE RANGE INDEX idx_channel_avg_cpc IF NOT EXISTS FOR (n:Channel) ON (n.avg_cpc)",
        # Product
        "CREATE RANGE INDEX idx_product_price IF NOT EXISTS FOR (n:Product) ON (n.Price)",
        # Competitor
        "CREATE RANGE INDEX idx_competitor_inflation_rate IF NOT EXISTS FOR (n:Competitor) ON (n.Inflation_Rate)",
        "CREATE RANGE INDEX idx_competitor_market_share IF NOT EXISTS FOR (n:Competitor) ON (n.market_share)",
        "CREATE RANGE INDEX idx_competitor_sov IF NOT EXISTS FOR (n:Competitor) ON (n.share_of_voice)",
        # AgentCluster
        "CREATE RANGE INDEX idx_agentcluster_size IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_size)",
        "CREATE RANGE INDEX idx_agentcluster_conversion IF NOT EXISTS FOR (n:AgentCluster) ON (n.avg_conversion_rate)",
        "CREATE RANGE INDEX idx_agentcluster_abm_size IF NOT EXISTS FOR (n:AgentCluster) ON (n.size)",
        "CREATE RANGE INDEX idx_agentcluster_avg_ltv IF NOT EXISTS FOR (n:AgentCluster) ON (n.avg_ltv)",
        "CREATE RANGE INDEX idx_agentcluster_brand_loyalty IF NOT EXISTS FOR (n:AgentCluster) ON (n.brand_loyalty)",
        # Outcome
        "CREATE RANGE INDEX idx_outcome_revenue IF NOT EXISTS FOR (n:Outcome) ON (n.revenue)",
        "CREATE RANGE INDEX idx_outcome_conversions IF NOT EXISTS FOR (n:Outcome) ON (n.conversions)",
        "CREATE RANGE INDEX idx_outcome_total_revenue IF NOT EXISTS FOR (n:Outcome) ON (n.total_revenue)",
        "CREATE RANGE INDEX idx_outcome_total_conversions IF NOT EXISTS FOR (n:Outcome) ON (n.total_conversions)",
        "CREATE RANGE INDEX idx_outcome_actual_roas IF NOT EXISTS FOR (n:Outcome) ON (n.actual_roas)",
    ]

    # ── LOOKUP / ID indexes ─────────────────────────────────────────
    LOOKUP_INDEXES = [
        "CREATE RANGE INDEX idx_campaign_id IF NOT EXISTS FOR (n:Campaign) ON (n.id)",
        "CREATE RANGE INDEX idx_campaign_campaign_id IF NOT EXISTS FOR (n:Campaign) ON (n.campaign_id)",
        "CREATE RANGE INDEX idx_user_clerk_id_range IF NOT EXISTS FOR (n:User) ON (n.clerk_id)",
        "CREATE RANGE INDEX idx_channel_channel_id IF NOT EXISTS FOR (n:Channel) ON (n.channel_id)",
        "CREATE RANGE INDEX idx_agentcluster_id IF NOT EXISTS FOR (n:AgentCluster) ON (n.id)",
        "CREATE RANGE INDEX idx_agentcluster_cluster_id IF NOT EXISTS FOR (n:AgentCluster) ON (n.cluster_id)",
        "CREATE RANGE INDEX idx_competitor_competitor_id IF NOT EXISTS FOR (n:Competitor) ON (n.competitor_id)",
        "CREATE RANGE INDEX idx_outcome_outcome_id IF NOT EXISTS FOR (n:Outcome) ON (n.outcome_id)",
    ]

    # ── Relationship property indexes ───────────────────────────────
    REL_INDEXES = [
        "CREATE RANGE INDEX idx_rel_allocated_to_spend IF NOT EXISTS FOR ()-[r:ALLOCATED_TO]-() ON (r.spend)",
        "CREATE RANGE INDEX idx_rel_influences_prob IF NOT EXISTS FOR ()-[r:INFLUENCES]-() ON (r.transition_probability)",
        "CREATE RANGE INDEX idx_rel_suppresses_impact IF NOT EXISTS FOR ()-[r:SUPPRESSES]-() ON (r.impact_score)",
    ]

    all_statements = TEXT_INDEXES + RANGE_INDEXES + LOOKUP_INDEXES + REL_INDEXES
    applied = []
    errors = []

    for cypher in all_statements:
        try:
            session.run(cypher)
            # Extract the index name for the summary
            idx_name = cypher.split("IF NOT EXISTS")[0].strip().split()[-1]
            applied.append(idx_name)
        except Exception as exc:
            errors.append({"cypher": cypher, "error": str(exc)})
            logger.warning("Failed to create index: %s — %s", cypher, exc)

    return {
        "applied": len(applied),
        "total": len(all_statements),
        "errors": errors,
    }


@register_migration("002", "migration_history_constraint")
def migration_002_history_constraint(session: Neo4jSession) -> Dict[str, Any]:
    """
    Add a uniqueness constraint on MigrationHistory.version to prevent
    accidental duplicate recordings.
    """
    session.run(
        "CREATE CONSTRAINT migration_version_unique IF NOT EXISTS "
        "FOR (m:MigrationHistory) REQUIRE m.version IS UNIQUE"
    )
    return {"constraint": "migration_version_unique"}


# =====================================================================
# Runner
# =====================================================================


def run_migrations(*, dry_run: bool = False) -> Dict[str, Any]:
    """
    Execute all pending Neo4j migrations in version order.

    Args:
        dry_run: If ``True``, list pending migrations without applying them.

    Returns:
        Summary dict with ``applied``, ``skipped``, and ``errors`` keys.
    """
    manager = Neo4jManager()
    if manager.driver is None:
        manager.connect()

    assert manager.driver is not None, "Neo4j driver failed to initialise"

    summary: Dict[str, Any] = {"applied": [], "skipped": [], "errors": []}

    with manager.driver.session() as session:
        already_applied = _get_applied_versions(session)
        logger.info(
            "Neo4j migration history: %d migrations already applied.",
            len(already_applied),
        )

        for version, name, fn in _MIGRATIONS:
            full_name = f"{version}_{name}"

            if version in already_applied:
                logger.info("  ⏭  %s — already applied", full_name)
                summary["skipped"].append(full_name)
                continue

            if dry_run:
                logger.info("  🔍 %s — pending (dry-run)", full_name)
                summary["applied"].append({"migration": full_name, "dry_run": True})
                continue

            logger.info("  ▶  %s — applying…", full_name)
            try:
                result = fn(session)
                _record_migration(session, version, name)
                logger.info("  ✓  %s — done: %s", full_name, result)
                summary["applied"].append(
                    {"migration": full_name, "result": result}
                )
            except Exception as exc:
                logger.error("  ✗  %s — FAILED: %s", full_name, exc)
                summary["errors"].append(
                    {"migration": full_name, "error": str(exc)}
                )
                # Stop on first failure — like Alembic's default behaviour.
                break

    total_applied = len(summary["applied"])
    total_errors = len(summary["errors"])
    logger.info(
        "Neo4j migration run complete: %d applied, %d skipped, %d errors.",
        total_applied,
        len(summary["skipped"]),
        total_errors,
    )
    return summary


# ── CLI entry point ─────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    import sys

    from dotenv import load_dotenv

    load_dotenv()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    parser = argparse.ArgumentParser(
        description="Run version-controlled Neo4j migrations."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List pending migrations without applying them.",
    )
    args = parser.parse_args()

    result = run_migrations(dry_run=args.dry_run)

    if result["errors"]:
        sys.exit(1)
