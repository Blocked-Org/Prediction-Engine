"""GraphRAG retrieval service — hybrid text-match + k-hop graph traversal via Neo4j.

Provides structured campaign context for LLM system-prompt injection.
Uses the existing ``Neo4jManager`` singleton; no additional graph-store
dependencies beyond the ``neo4j`` driver already in requirements.txt.
"""

from __future__ import annotations

import logging
from typing import Any

from src.api.db.neo4j_client import Neo4jManager

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cypher templates
# ---------------------------------------------------------------------------

# Stage 1: full-text keyword match against Campaign / Competitor / MacroContext
# node properties.  Falls back to CONTAINS when no full-text index exists.
_TEXT_MATCH_CYPHER = """
MATCH (c:Campaign)
WHERE c.budget IS NOT NULL
   AND (
        ANY(ch IN c.primary_channels WHERE toLower(ch) CONTAINS toLower($query))
     OR toLower(toString(c.budget)) CONTAINS toLower($query)
     OR c.id CONTAINS $query
   )
WITH c
LIMIT $top_k

// Stage 2: 2-hop graph traversal from matched campaigns
OPTIONAL MATCH (c)-[:TARGETS]->(ac:AgentCluster)
OPTIONAL MATCH (c)-[:COMPETES_WITH]->(comp:Competitor)
OPTIONAL MATCH (c)-[:OPERATES_IN]->(mc:MacroContext)
OPTIONAL MATCH (owner:User)-[:OWNS]->(c)

RETURN
  c.id              AS campaign_id,
  c.budget          AS budget,
  c.cpc             AS cpc,
  c.base_price      AS base_price,
  c.discount_rate   AS discount_rate,
  c.primary_channels AS primary_channels,
  c.historical_revenue AS historical_revenue,
  c.aov             AS aov,
  c.cac             AS cac,
  c.ltv             AS ltv,
  ac.regions        AS regions,
  ac.target_age_range AS target_age_range,
  ac.intent_clusters AS intent_clusters,
  collect(DISTINCT comp.name)  AS competitors,
  collect(DISTINCT mc.flag)    AS macro_flags,
  owner.clerk_id    AS owner_id
"""

# Direct campaign lookup by ID (most common path)
_CAMPAIGN_BY_ID_CYPHER = """
MATCH (c:Campaign {id: $campaign_id})

OPTIONAL MATCH (c)-[:TARGETS]->(ac:AgentCluster)
OPTIONAL MATCH (c)-[:COMPETES_WITH]->(comp:Competitor)
OPTIONAL MATCH (c)-[:OPERATES_IN]->(mc:MacroContext)
OPTIONAL MATCH (owner:User)-[:OWNS]->(c)

RETURN
  c.id              AS campaign_id,
  c.budget          AS budget,
  c.cpc             AS cpc,
  c.base_price      AS base_price,
  c.discount_rate   AS discount_rate,
  c.primary_channels AS primary_channels,
  c.historical_revenue AS historical_revenue,
  c.aov             AS aov,
  c.cac             AS cac,
  c.ltv             AS ltv,
  ac.regions        AS regions,
  ac.target_age_range AS target_age_range,
  ac.intent_clusters AS intent_clusters,
  collect(DISTINCT comp.name)  AS competitors,
  collect(DISTINCT mc.flag)    AS macro_flags,
  owner.clerk_id    AS owner_id
"""


class GraphRAGService:
    """Hybrid text-match + 2-hop graph traversal retrieval over Neo4j.

    Designed to feed structured campaign context into an LLM system prompt
    alongside SHAP attribution data.
    """

    def __init__(self, neo4j_manager: Neo4jManager) -> None:
        self._manager = neo4j_manager

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def retrieve_campaign_context(
        self,
        query: str,
        *,
        campaign_id: str | None = None,
        top_k: int = 3,
    ) -> str:
        """Return a markdown-formatted context string for LLM injection.

        Strategy:
            1. If ``campaign_id`` is provided, do a direct lookup.
            2. Otherwise, run a text-match search against campaign properties
               and traverse 2 hops to gather audience/competitor/macro context.
            3. Format the subgraph into a structured markdown block.

        Parameters
        ----------
        query:
            Natural-language user question (used for text matching).
        campaign_id:
            Optional direct campaign ID for deterministic lookup.
        top_k:
            Maximum number of matching campaigns to return (text-match path).

        Returns
        -------
        str
            Markdown context block, or a fallback message if nothing found.
        """
        try:
            records = self._execute_retrieval(query, campaign_id=campaign_id, top_k=top_k)
        except Exception as exc:
            logger.error("GraphRAG retrieval failed: %s", exc)
            return "Error retrieving context from Neo4j knowledge graph."

        if not records:
            return "No matching campaign context found in the knowledge graph."

        return self._format_records(records)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_driver(self) -> None:
        if self._manager.driver is None:
            self._manager.connect()
        if self._manager.driver is None:
            raise RuntimeError("Neo4j driver is not available.")

    def _execute_retrieval(
        self,
        query: str,
        *,
        campaign_id: str | None = None,
        top_k: int = 3,
    ) -> list[dict[str, Any]]:
        self._ensure_driver()
        assert self._manager.driver is not None  # for type narrowing

        with self._manager.driver.session() as session:
            if campaign_id:
                result = session.run(_CAMPAIGN_BY_ID_CYPHER, campaign_id=campaign_id)
            else:
                result = session.run(_TEXT_MATCH_CYPHER, query=query, top_k=top_k)

            return [dict(record) for record in result]

    @staticmethod
    def _format_records(records: list[dict[str, Any]]) -> str:
        """Convert Neo4j records into a structured markdown context block."""
        lines: list[str] = ["### Neo4j Knowledge Graph Context"]

        for i, rec in enumerate(records, 1):
            if len(records) > 1:
                lines.append(f"\n#### Campaign {i}")

            campaign_id = rec.get("campaign_id", "unknown")
            budget = rec.get("budget")
            historical_revenue = rec.get("historical_revenue")
            channels = rec.get("primary_channels") or []
            regions = rec.get("regions") or []
            age_range = rec.get("target_age_range", "N/A")
            competitors = rec.get("competitors") or []
            macro_flags = rec.get("macro_flags") or []
            aov = rec.get("aov")
            cac = rec.get("cac")
            ltv = rec.get("ltv")
            cpc = rec.get("cpc")
            discount_rate = rec.get("discount_rate")

            lines.append(f"- **Campaign ID**: `{campaign_id}`")

            if budget is not None:
                lines.append(f"- **Budget**: ${budget:,.2f}")
            if historical_revenue is not None:
                lines.append(f"- **Historical Revenue**: ${historical_revenue:,.2f}")

            if channels:
                lines.append(f"- **Channels**: {', '.join(str(c) for c in channels)}")
            if regions:
                lines.append(f"- **Target Regions**: {', '.join(str(r) for r in regions)}")

            lines.append(f"- **Target Age Range**: {age_range}")

            if aov is not None:
                lines.append(f"- **AOV**: ${aov:,.2f}")
            if cac is not None:
                lines.append(f"- **CAC**: ${cac:,.2f}")
            if ltv is not None:
                lines.append(f"- **LTV**: ${ltv:,.2f}")
            if cpc is not None:
                lines.append(f"- **CPC**: ${cpc:,.2f}")
            if discount_rate is not None:
                lines.append(f"- **Discount Rate**: {discount_rate:.1%}")

            if competitors:
                lines.append(f"- **Competitors**: {', '.join(competitors)}")
            if macro_flags:
                lines.append(f"- **Macro Conditions**: {', '.join(macro_flags)}")

        return "\n".join(lines)
