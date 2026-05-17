"""Report context generation — orchestrates SHAP formatting + GraphRAG retrieval.

Endpoint ``POST /api/generate_report_context`` is consumed by the Next.js
``/api/report`` route to inject grounded context into the LLM system prompt.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.api.db.neo4j_client import Neo4jManager, get_neo4j_manager
from src.explainability.shap_tools import format_shap_for_llm
from src.llm.graphrag_service import GraphRAGService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["report"])


# ---------------------------------------------------------------------------
# Request / Response schemas (local to this route — not in schemas/simulation)
# ---------------------------------------------------------------------------


class ReportContextRequest(BaseModel):
    """Payload for POST /api/generate_report_context."""

    simulation_id: str = Field(
        ..., min_length=1, description="Campaign ID (maps to Campaign.id in Neo4j)."
    )
    query: str = Field(
        default="Summarize the campaign performance and key drivers.",
        description="Natural-language user query for GraphRAG retrieval.",
    )


class ReportContextResponse(BaseModel):
    """Combined SHAP + graph context returned to the Next.js frontend."""

    shap_context: str
    graph_context: str


# ---------------------------------------------------------------------------
# SHAP helper — lazily loads the ML pipeline once
# ---------------------------------------------------------------------------

_shap_engine_cache: dict[str, Any] = {}


def _get_shap_explanation(campaign: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Attempt to generate a SHAP explanation for the campaign's feature vector.

    Returns None if the trained model or background data is not available.
    """
    try:
        from src.inference.service import PredictionService

        model_path = Path(
            os.environ.get("PE_MODEL_PATH", "models/xgb_pipeline.joblib")
        ).expanduser()
        background_path = Path(
            os.environ.get("PE_BACKGROUND_PARQUET", "data/processed/train.parquet")
        ).expanduser()

        if not model_path.exists():
            logger.warning("Model file not found at %s — SHAP unavailable.", model_path)
            return None
        if not background_path.exists():
            logger.warning(
                "Background parquet not found at %s — SHAP unavailable.", background_path
            )
            return None

        # Cache the PredictionService so we don't reload the model on every call
        cache_key = str(model_path)
        if cache_key not in _shap_engine_cache:
            import pandas as pd

            bg = pd.read_parquet(background_path)
            _shap_engine_cache[cache_key] = PredictionService(
                model_path=model_path,
                shap_background_frame=bg,
            )

        svc: PredictionService = _shap_engine_cache[cache_key]

        # Build a feature record from the campaign properties
        channels = campaign.get("primary_channels") or ["Meta"]
        budget = float(campaign.get("budget") or 10_000)
        per_channel = budget / max(len(channels), 1)

        feature_record: dict[str, Any] = {
            "budget": budget,
            "cpc": float(campaign.get("cpc") or 1.5),
            "base_price": float(campaign.get("base_price") or 50.0),
            "discount_rate": float(campaign.get("discount_rate") or 0.0),
            "aov": float(campaign.get("aov") or 50.0),
            "cac": float(campaign.get("cac") or 10.0),
            "historical_revenue": float(campaign.get("historical_revenue") or budget * 10),
        }
        # Add per-channel spend features if the model expects them
        for ch in channels:
            feature_record[f"{ch.lower()}_spend"] = per_channel

        result = svc.explain_row(feature_record, include_shap=True)
        return result.get("shap")

    except Exception as exc:
        logger.warning("SHAP explanation failed (non-fatal): %s", exc)
        return None


# ---------------------------------------------------------------------------
# Campaign fetch (reuses the same Cypher pattern as dashboard_results.py)
# ---------------------------------------------------------------------------

_CAMPAIGN_BY_ID_CYPHER = """
MATCH (c:Campaign {id: $campaign_id})
OPTIONAL MATCH (c)-[:COMPETES_WITH]->(comp:Competitor)
OPTIONAL MATCH (c)-[:TARGETS]->(ac:AgentCluster)
WITH c, ac, collect(DISTINCT comp.name) AS competitor_names
RETURN
  c.id AS campaign_id,
  c.budget AS budget,
  c.cpc AS cpc,
  c.base_price AS base_price,
  c.discount_rate AS discount_rate,
  c.primary_channels AS primary_channels,
  c.historical_revenue AS historical_revenue,
  c.aov AS aov,
  c.cac AS cac,
  c.ltv AS ltv,
  ac.regions AS regions,
  ac.target_age_range AS target_age_range,
  ac.intent_clusters AS intent_clusters,
  competitor_names
LIMIT 1
"""


def _fetch_campaign(manager: Neo4jManager, campaign_id: str) -> Optional[dict[str, Any]]:
    """Fetch a single campaign record by ID from Neo4j."""
    if manager.driver is None:
        manager.connect()
    if manager.driver is None:
        return None

    try:
        with manager.driver.session() as session:
            record = session.run(_CAMPAIGN_BY_ID_CYPHER, campaign_id=campaign_id).single()
        return dict(record) if record else None
    except Exception as exc:
        logger.error("Failed to fetch campaign %s: %s", campaign_id, exc)
        return None


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.post("/api/generate_report_context", response_model=ReportContextResponse)
def generate_report_context(
    payload: ReportContextRequest,
    neo4j: Neo4jManager = Depends(get_neo4j_manager),
) -> ReportContextResponse:
    """Orchestrate SHAP formatting + GraphRAG retrieval for LLM grounding.

    1. Fetch the campaign from Neo4j by ``simulation_id``.
    2. Attempt SHAP explanation (graceful fallback if model not available).
    3. Run GraphRAG context retrieval.
    4. Return combined payload for the frontend system prompt.
    """
    # --- Graph context (always attempted) ---
    graphrag = GraphRAGService(neo4j)
    graph_context = graphrag.retrieve_campaign_context(
        query=payload.query,
        campaign_id=payload.simulation_id,
    )

    # --- SHAP context ---
    campaign = _fetch_campaign(neo4j, payload.simulation_id)

    if campaign is not None:
        shap_dict = _get_shap_explanation(campaign)
        if shap_dict is not None:
            shap_context = format_shap_for_llm(shap_dict)
        else:
            shap_context = (
                "SHAP values unavailable — no trained model loaded. "
                "Recommendations should rely on the graph context and simulation data only."
            )
    else:
        shap_context = (
            "SHAP values unavailable — campaign not found in the knowledge graph. "
            "Recommendations should rely on the provided simulation data only."
        )

    return ReportContextResponse(
        shap_context=shap_context,
        graph_context=graph_context,
    )
