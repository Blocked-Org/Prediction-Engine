"""GraphRAG retrieval service — campaign context for LLM system-prompt injection.

.. warning::
    This module previously used Neo4j for hybrid text-match + k-hop graph
    traversal to retrieve campaign context. Neo4j has been removed from the
    project.

    The service is currently **non-functional** and will return fallback
    messages. It is kept as a placeholder so the rest of the LLM orchestration
    pipeline can reference it without import errors.

    TODO: When a graph database is re-introduced, restore the full GraphRAG
          implementation:
          1. Replace the Neo4jManager import with the new graph DB client
          2. Update Cypher templates to the new graph schema
          3. Re-enable ``_execute_retrieval()`` with live graph queries
          4. Consider using PostgreSQL campaign_workspaces as a fallback
             data source when the graph DB is unavailable.
"""

from __future__ import annotations

import logging
from typing import Any

# NOTE: Neo4j import removed. When re-introducing graph DB, add:
# from src.api.db.<graph_client> import GraphManager

logger = logging.getLogger(__name__)


class GraphRAGService:
    """Hybrid text-match + 2-hop graph traversal retrieval.

    .. note::
        Currently returns fallback messages — graph DB has been removed.
        When re-introduced, restore the Cypher query templates and
        live graph traversal logic.
    """

    def __init__(self, graph_manager: Any = None) -> None:
        """Initialize with an optional graph database manager.

        Args:
            graph_manager: Graph DB manager instance. Currently unused
                since Neo4j has been removed. Pass None for now.
        """
        self._manager = graph_manager

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

        Currently returns a fallback message since Neo4j is removed.
        When graph DB is restored, this will perform:
            1. Direct campaign lookup by ID (if provided)
            2. Text-match search against campaign properties
            3. 2-hop graph traversal for audience/competitor/macro context

        TODO: Implement PostgreSQL fallback using campaign_workspaces:
              - Query campaign_data JSONB for matching campaigns
              - Format as markdown context block
              - This would work even without a graph DB
        """
        # TODO: When graph DB is re-introduced, restore this:
        # try:
        #     records = self._execute_retrieval(query, campaign_id=campaign_id, top_k=top_k)
        # except Exception as exc:
        #     logger.error("GraphRAG retrieval failed: %s", exc)
        #     return "Error retrieving context from knowledge graph."

        # For now, try to get context from PostgreSQL campaign_workspaces
        try:
            return self._retrieve_from_postgres(campaign_id)
        except Exception as exc:
            logger.warning("PostgreSQL campaign context retrieval failed: %s", exc)
            return "No matching campaign context found. Graph database is not yet configured."

    # ------------------------------------------------------------------
    # PostgreSQL fallback (temporary until graph DB is restored)
    # ------------------------------------------------------------------

    @staticmethod
    def _retrieve_from_postgres(campaign_id: str | None) -> str:
        """Retrieve campaign context from PostgreSQL as a fallback."""
        if not campaign_id:
            return "No campaign_id provided for context retrieval."

        try:
            from src.api.services.campaign_persistence import get_workspace_by_campaign_id
            workspace = get_workspace_by_campaign_id(campaign_id)
            if workspace is None or workspace.campaign_data is None:
                return "No matching campaign context found in PostgreSQL."

            campaign = workspace.campaign_data
            lines: list[str] = ["### Campaign Context (PostgreSQL)"]
            lines.append(f"- **Campaign ID**: `{campaign_id}`")

            budget = campaign.get("budget")
            if budget is not None:
                lines.append(f"- **Budget**: ${budget:,.2f}")

            revenue = campaign.get("historical_revenue")
            if revenue is not None:
                lines.append(f"- **Historical Revenue**: ${revenue:,.2f}")

            channels = campaign.get("primary_channels", [])
            if channels:
                lines.append(f"- **Channels**: {', '.join(str(c) for c in channels)}")

            regions = campaign.get("regions", [])
            if regions:
                lines.append(f"- **Target Regions**: {', '.join(str(r) for r in regions)}")

            age = campaign.get("target_age_range", "N/A")
            lines.append(f"- **Target Age Range**: {age}")

            competitors = campaign.get("competitor_names", [])
            if competitors:
                lines.append(f"- **Competitors**: {', '.join(competitors)}")

            return "\n".join(lines)
        except Exception as exc:
            logger.warning("PostgreSQL context fallback failed: %s", exc)
            return "Error retrieving campaign context."

    # ------------------------------------------------------------------
    # Original Cypher templates (preserved for future graph DB restore)
    # ------------------------------------------------------------------

    # TODO: When restoring Neo4j / graph DB, use these Cypher templates:
    #
    # _TEXT_MATCH_CYPHER = """
    # MATCH (c:Campaign)
    # WHERE c.budget IS NOT NULL
    #    AND (
    #         ANY(ch IN c.primary_channels WHERE toLower(ch) CONTAINS toLower($query))
    #      OR toLower(toString(c.budget)) CONTAINS toLower($query)
    #      OR c.id CONTAINS $query
    #    )
    # WITH c LIMIT $top_k
    # OPTIONAL MATCH (c)-[:TARGETS]->(ac:AgentCluster)
    # OPTIONAL MATCH (c)-[:COMPETES_WITH]->(comp:Competitor)
    # OPTIONAL MATCH (c)-[:OPERATES_IN]->(mc:MacroContext)
    # OPTIONAL MATCH (owner:User)-[:OWNS]->(c)
    # RETURN c.id AS campaign_id, c.budget AS budget, ...
    # """
    #
    # _CAMPAIGN_BY_ID_CYPHER = """
    # MATCH (c:Campaign {id: $campaign_id})
    # OPTIONAL MATCH (c)-[:TARGETS]->(ac:AgentCluster)
    # ...
    # """
