"""Simulation onboarding routes — Neo4j-free implementation.

All graph-DB dependencies have been removed. Onboarding data is passed
directly to the simulation engines without persisting to Neo4j first.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from src.api.auth import Role, require_role, require_authenticated_user, ClerkAuth

from src.api.services.dashboard_results import build_dashboard_results
from src.schemas.dashboard import DashboardResultsResponse
from src.schemas.simulation import (
    SimulationInitRequest,
    SimulationInitResponse,
    SimulationNodeCounts,
    SimulationOnboardingStatus,
    SimulationRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/simulate", tags=["simulate"])

# ── In-memory store for onboarding payloads ──────────────────────────────
# Maps clerk_user_id → campaign dict (used by /results to build dashboard)
_user_campaigns: dict[str, dict[str, Any]] = {}


@router.post("", status_code=202)
async def simulate(
    payload: SimulationRequest,
    role: Role = Depends(require_role(Role.owner, Role.admin, Role.analyst)),
) -> dict[str, Any]:
    """
    Endpoint for Marketing Simulation. Enqueues a task to process the simulation.
    
    Returns HTTP 202 Accepted with a task_id for the frontend to poll.
    The heavy Bayesian MMM + NSGA-II computation runs in the Celery worker,
    NOT in the main FastAPI thread.
    
    If an identical request is already cached in Redis the cached result is
    returned immediately with HTTP 200 (no Celery round-trip).
    """
    try:
        from src.api.worker import run_simulation_task
        
        # Flatten the payload for the engine (which expects the flat structure)
        flat_payload = {
            "Impressions": payload.endogenous.Impressions,
            "Clicks": payload.endogenous.Clicks,
            "spend_meta": payload.endogenous.spend_meta,
            "spend_google": payload.endogenous.spend_google,
            "spend_tiktok": payload.endogenous.spend_tiktok,
            "Total_Conversion": payload.transactional.Total_Conversion,
            "revenue": payload.transactional.revenue,
            "age": payload.audience.age,
            "gender": payload.audience.gender,
            "interest": payload.audience.interest,
            "competitor_urls": [str(u) for u in payload.exogenous.competitor_urls],
        }
        
        # Inject budget_overrides if present
        if payload.budget_overrides:
            flat_payload["budget_overrides"] = payload.budget_overrides
            
        # ── Redis cache check ────────────────────────────────────────────────────────
        try:
            from src.api.cache import get_simulation_cache
            cache = get_simulation_cache()
            cache_ns = "simulate:micro"

            cached = await cache.get(cache_ns, flat_payload)
            if cached is not None:
                logger.info("Returning cached simulation result (skipping Celery).")
                return {"task_id": "cached", "status": "SUCCESS", "result": cached}
        except Exception as cache_exc:
            logger.warning("Redis cache check failed (non-fatal): %s", cache_exc)

        total_spend = payload.endogenous.spend_meta + payload.endogenous.spend_google + payload.endogenous.spend_tiktok
        logger.info(
            "Enqueuing simulation request: Impressions=%s, total_spend=%s, age=%s, gender=%s, interest=%s, competitor_urls=%d, overrides=%s",
            flat_payload["Impressions"], total_spend, flat_payload["age"], flat_payload["gender"], flat_payload["interest"], len(payload.exogenous.competitor_urls), "yes" if payload.budget_overrides else "no"
        )
        
        # Enqueue the Celery task — does NOT block the ASGI thread
        task = run_simulation_task.delay(flat_payload)
        
        return {"task_id": task.id, "status": "processing"}
    except Exception as exc:
        logger.error("Error enqueuing simulation request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error enqueuing simulation") from exc


@router.get("/results/{clerk_user_id}", response_model=DashboardResultsResponse)
async def simulate_results(
    clerk_user_id: str,
    _user: ClerkAuth = Depends(require_authenticated_user),
) -> DashboardResultsResponse:
    """
    Return dashboard-ready simulation data for the user's latest campaign.

    Uses in-memory campaign store (populated by /init) to build the dashboard
    without requiring Neo4j. Falls back to a sensible default campaign if
    the user's data is not in memory (e.g., after a server restart).
    """
    if clerk_user_id != _user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access these results.")

    campaign = _user_campaigns.get(clerk_user_id)
    if campaign is None:
        logger.warning(
            "No in-memory campaign for user %s — returning no_campaign. "
            "User should re-run onboarding.",
            clerk_user_id,
        )
        return DashboardResultsResponse(status="no_campaign")

    # ── Redis cache layer ────────────────────────────────────────────────
    try:
        from src.api.cache import get_simulation_cache
        cache = get_simulation_cache()
        cache_ns = "simulate:results"
        cache_params = {
            "clerk_user_id": clerk_user_id,
            **{k: v for k, v in campaign.items() if k != "competitor_names"},
            "competitor_names": sorted(campaign.get("competitor_names") or []),
        }

        cached = await cache.get(cache_ns, cache_params)
        if cached is not None:
            try:
                return DashboardResultsResponse(**cached)
            except Exception:
                logger.warning("Cached payload failed validation — recomputing.")
    except Exception as cache_exc:
        logger.warning("Redis cache check failed (non-fatal): %s", cache_exc)

    try:
        result = build_dashboard_results(campaign)
        # Persist to cache (1 hour TTL) — best effort
        try:
            from src.api.cache import get_simulation_cache
            cache = get_simulation_cache()
            cache_ns = "simulate:results"
            cache_params = {
                "clerk_user_id": clerk_user_id,
                **{k: v for k, v in campaign.items() if k != "competitor_names"},
                "competitor_names": sorted(campaign.get("competitor_names") or []),
            }
            await cache.set(cache_ns, cache_params, result.model_dump())
        except Exception as cache_err:
            logger.warning("Failed to write simulation cache: %s", cache_err)
        return result
    except Exception as exc:
        logger.exception(
            "Dashboard simulation failed for user %s: %s",
            clerk_user_id,
            exc,
        )
        return DashboardResultsResponse(status="processing")


@router.get("/status/{clerk_user_id}", response_model=SimulationOnboardingStatus)
def simulate_onboarding_status(
    clerk_user_id: str,
) -> SimulationOnboardingStatus:
    """Return whether the user has completed onboarding.
    
    With Neo4j removed, we check the in-memory store. If the user has
    a campaign in memory, they are onboarded.
    """
    has_campaign = clerk_user_id in _user_campaigns
    
    return SimulationOnboardingStatus(
        clerk_user_id=clerk_user_id,
        is_onboarded=has_campaign,
        has_campaign=has_campaign,
    )


@router.post("/init", response_model=SimulationInitResponse, status_code=200)
def simulate_init(
    payload: SimulationInitRequest,
    _user: ClerkAuth = Depends(require_authenticated_user),
) -> SimulationInitResponse:
    """
    Validate onboarding matrices and store them in memory for dashboard use.
    
    Neo4j has been removed — campaign data is stored in a process-local dict
    keyed by clerk_user_id. The simulation engines will read from this store
    when building dashboard results.
    """
    try:
        total_spend = payload.endogenous.total_spend
        campaign_id = str(uuid.uuid4())
        agent_cluster_id = str(uuid.uuid4())

        logger.info(
            "Initializing simulation for user %s (age=%s, interest=%s, total_spend=%s, spend_meta=%s, competitors=%d, competitor_urls=%d)",
            payload.clerk_user_id,
            payload.audience.age,
            payload.audience.interest,
            total_spend,
            payload.endogenous.spend_meta,
            len(payload.exogenous.competitors),
            len(payload.exogenous.competitor_urls),
        )

        # Derive campaign properties from the payload (same logic as before)
        clicks = payload.endogenous.Clicks
        cpc = total_spend / clicks if clicks > 0 else 1.5
        conversions = payload.transactional.Total_Conversion
        revenue = payload.transactional.revenue
        aov = revenue / conversions if conversions > 0 else 100.0

        # Store campaign in memory for /results to use
        _user_campaigns[payload.clerk_user_id] = {
            "campaign_id": campaign_id,
            "budget": total_spend,
            "cpc": cpc,
            "base_price": 100.0,
            "discount_rate": 0.0,
            "primary_channels": ["Meta", "Google", "TikTok"],
            "historical_revenue": revenue,
            "aov": aov,
            "cac": total_spend / conversions if conversions > 0 else 50.0,
            "ltv": aov * 3.0,
            "regions": ["Dhaka"],
            "target_age_range": payload.audience.age,
            "intent_clusters": [payload.audience.interest],
            "competitor_names": payload.exogenous.competitors,
        }

        competitor_ids = payload.exogenous.competitors
        macro_context_ids = payload.exogenous.macroeconomic_flags

        logger.info(
            "Simulation init complete for user %s — campaign_id=%s",
            payload.clerk_user_id,
            campaign_id,
        )

        return SimulationInitResponse(
            campaign_id=campaign_id,
            agent_cluster_id=agent_cluster_id,
            competitor_ids=competitor_ids,
            macro_context_ids=macro_context_ids,
            node_counts=SimulationNodeCounts(
                competitors=len(competitor_ids),
                macro_contexts=len(macro_context_ids),
            ),
            is_onboarded=True,
        )
    except Exception as exc:
        logger.exception("Unexpected error during simulate/init")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during simulation initialization",
        ) from exc
