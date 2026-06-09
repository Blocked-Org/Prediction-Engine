"""Report context generation — orchestrates SHAP formatting + context retrieval.

Endpoint ``POST /api/generate_report_context`` is consumed by the Next.js
``/api/report`` route to inject grounded context into the LLM system prompt.

Neo4j dependency removed — campaigns fetched from in-memory store.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.explainability.shap_tools import format_shap_for_llm

logger = logging.getLogger(__name__)

router = APIRouter(tags=["report"])


# ---------------------------------------------------------------------------
# Request / Response schemas (local to this route — not in schemas/simulation)
# ---------------------------------------------------------------------------


class ReportContextRequest(BaseModel):
    """Payload for POST /api/generate_report_context."""

    simulation_id: str = Field(
        ..., min_length=1, description="Campaign ID."
    )
    query: str = Field(
        default="Summarize the campaign performance and key drivers.",
        description="Natural-language user query for context retrieval.",
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
# Campaign fetch from in-memory store
# ---------------------------------------------------------------------------


def _fetch_campaign_from_memory(campaign_id: str) -> Optional[dict[str, Any]]:
    """Fetch a campaign dict from the in-memory store by campaign ID."""
    from src.api.routes.simulate import _user_campaigns
    for user_id, campaign in _user_campaigns.items():
        if campaign.get("campaign_id") == campaign_id:
            return campaign
    return None


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.post("/api/generate_report_context", response_model=ReportContextResponse)
def generate_report_context(
    payload: ReportContextRequest,
) -> ReportContextResponse:
    """Orchestrate SHAP formatting + context retrieval for LLM grounding.

    1. Fetch the campaign from in-memory store by ``simulation_id``.
    2. Attempt SHAP explanation (graceful fallback if model not available).
    3. Build basic context from campaign data.
    4. Return combined payload for the frontend system prompt.
    """
    campaign = _fetch_campaign_from_memory(payload.simulation_id)

    # --- SHAP context ---
    if campaign is not None:
        shap_dict = _get_shap_explanation(campaign)
        if shap_dict is not None:
            shap_context = format_shap_for_llm(shap_dict)
        else:
            shap_context = (
                "SHAP values unavailable — no trained model loaded. "
                "Recommendations should rely on the simulation data only."
            )
    else:
        shap_context = (
            "SHAP values unavailable — campaign not found. "
            "Recommendations should rely on the provided simulation data only."
        )

    # --- Graph context (build from campaign data instead of Neo4j) ---
    if campaign is not None:
        channels = campaign.get("primary_channels", ["Meta", "Google", "TikTok"])
        budget = campaign.get("budget", 10000)
        competitors = campaign.get("competitor_names", [])
        age_range = campaign.get("target_age_range", "25-34")
        interests = campaign.get("intent_clusters", [])
        
        graph_context = (
            f"Campaign Overview:\n"
            f"- Total Budget: BDT {budget:,.0f}\n"
            f"- Channels: {', '.join(channels)}\n"
            f"- Target Age: {age_range}\n"
            f"- Interest Clusters: {', '.join(interests) if interests else 'General'}\n"
            f"- Competitors: {', '.join(competitors) if competitors else 'None specified'}\n"
            f"- Historical Revenue: BDT {campaign.get('historical_revenue', 0):,.0f}\n"
            f"- CPC: BDT {campaign.get('cpc', 1.5):.2f}\n"
            f"- AOV: BDT {campaign.get('aov', 100):.2f}\n"
        )
    else:
        graph_context = "No campaign context available — campaign not found in the system."

    return ReportContextResponse(
        shap_context=shap_context,
        graph_context=graph_context,
    )
