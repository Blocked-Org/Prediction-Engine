"""Simulation onboarding routes — PostgreSQL-backed workspace system.

All campaign data is persisted to the ``campaign_workspaces`` table in
PostgreSQL (via ``campaign_persistence``).  Neo4j has been fully removed.
Each user may have up to 3 workspaces; the active workspace is used by
the dashboard and analytics endpoints.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from src.api.auth import Role, require_role, require_authenticated_user, ClerkAuth

from src.api.services.dashboard_results import build_dashboard_results
from src.api.services.campaign_persistence import (
    activate_workspace,
    create_workspace,
    delete_workspace,
    get_active_workspace,
    get_workspace_count,
    list_workspaces,
    save_simulation_result,
    upsert_workspace,
)
from src.schemas.dashboard import DashboardResultsResponse
from src.schemas.simulation import (
    SimulationInitRequest,
    SimulationInitResponse,
    SimulationNodeCounts,
    SimulationOnboardingStatus,
    SimulationRequest,
)
from src.schemas.workspace import (
    WorkspaceActivateRequest,
    WorkspaceCreateRequest,
    WorkspaceListResponse,
    WorkspaceSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/simulate", tags=["simulate"])

# ── Default tenant ID for users without a real tenant row ────────────────
# In production, derive this from the Clerk org → tenant mapping in auth.py.
# For now, we use a fixed UUID so the FK constraint is satisfied.
_DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


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
    Return dashboard-ready simulation data for the user's active workspace.

    Read path (fast → slow):
      1. PostgreSQL ``simulation_result`` column (instant, ~5ms)
      2. Redis cache layer (fast, ~10ms)
      3. Full simulation re-computation (slow, 10-30s) → result persisted to Postgres
    """
    if clerk_user_id != _user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access these results.")

    # ── 1. Check PostgreSQL for a cached simulation result ──────────────
    workspace = get_active_workspace(clerk_user_id)
    if workspace is None:
        logger.warning("No workspace found for user %s — returning no_campaign.", clerk_user_id)
        return DashboardResultsResponse(status="no_campaign")

    campaign = workspace.campaign_data
    if campaign is None:
        return DashboardResultsResponse(status="no_campaign")

    # If a simulation result is already cached in Postgres, return it immediately
    if workspace.simulation_result is not None:
        try:
            result = DashboardResultsResponse(**workspace.simulation_result)
            logger.info("Returning Postgres-cached simulation result for user %s.", clerk_user_id)
            return result
        except Exception:
            logger.warning("Cached Postgres payload failed validation — recomputing.")

    # ── 2. Redis cache layer ────────────────────────────────────────────
    try:
        from src.api.cache import get_simulation_cache
        cache = get_simulation_cache()
        cache_ns = "simulate:results"
        cache_params = {
            "clerk_user_id": clerk_user_id,
            "campaign_id": workspace.campaign_id,
        }

        cached = await cache.get(cache_ns, cache_params)
        if cached is not None:
            try:
                result = DashboardResultsResponse(**cached)
                # Also persist to Postgres so next request skips Redis too
                save_simulation_result(clerk_user_id, cached, campaign_id=workspace.campaign_id)
                return result
            except Exception:
                logger.warning("Cached Redis payload failed validation — recomputing.")
    except Exception as cache_exc:
        logger.warning("Redis cache check failed (non-fatal): %s", cache_exc)

    # ── 3. Full simulation (slow path) ──────────────────────────────────
    try:
        result = build_dashboard_results(campaign)

        # Persist to PostgreSQL (primary cache — survives restarts)
        result_dict = result.model_dump()
        save_simulation_result(clerk_user_id, result_dict, campaign_id=workspace.campaign_id)

        # Also persist to Redis (secondary cache — 1 hour TTL)
        try:
            from src.api.cache import get_simulation_cache
            cache = get_simulation_cache()
            cache_ns = "simulate:results"
            cache_params = {
                "clerk_user_id": clerk_user_id,
                "campaign_id": workspace.campaign_id,
            }
            await cache.set(cache_ns, cache_params, result_dict)
        except Exception as cache_err:
            logger.warning("Failed to write Redis simulation cache: %s", cache_err)

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
    
    Checks PostgreSQL ``campaign_workspaces`` table for an active workspace.
    """
    workspace = get_active_workspace(clerk_user_id)
    has_campaign = workspace is not None and workspace.campaign_data is not None

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
    Validate onboarding matrices and persist to PostgreSQL workspace.
    
    Campaign data is stored in the ``campaign_workspaces`` table. On first
    onboarding, workspace slot 1 is created. On re-onboarding, the active
    workspace is overwritten and cached results are cleared.
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

        # Derive campaign properties from the payload
        clicks = payload.endogenous.Clicks
        cpc = total_spend / clicks if clicks > 0 else 1.5
        conversions = payload.transactional.Total_Conversion
        revenue = payload.transactional.revenue
        aov = revenue / conversions if conversions > 0 else 100.0

        campaign_data = {
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

        # Determine tenant_id from auth context (fallback to default)
        tenant_id = getattr(_user, "tenant_id", None) or _DEFAULT_TENANT_ID

        # Persist to PostgreSQL (upsert into slot 1 by default)
        upsert_workspace(
            clerk_user_id=payload.clerk_user_id,
            tenant_id=str(tenant_id),
            workspace_name="Default Workspace",
            campaign_id=campaign_id,
            campaign_data=campaign_data,
        )

        competitor_ids = payload.exogenous.competitors
        macro_context_ids = payload.exogenous.macroeconomic_flags

        logger.info(
            "Simulation init complete for user %s — campaign_id=%s (persisted to PostgreSQL)",
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


# ── Workspace Management Endpoints ──────────────────────────────────────────


@router.get("/workspaces", response_model=WorkspaceListResponse)
def list_user_workspaces(
    _user: ClerkAuth = Depends(require_authenticated_user),
) -> WorkspaceListResponse:
    """List all workspaces for the authenticated user."""
    workspaces = list_workspaces(_user.user_id)
    return WorkspaceListResponse(
        workspaces=[WorkspaceSummary(**ws) for ws in workspaces],
        max_workspaces=3,
        can_create=len(workspaces) < 3,
    )


@router.post("/workspaces", status_code=201)
def create_user_workspace(
    payload: WorkspaceCreateRequest,
    _user: ClerkAuth = Depends(require_authenticated_user),
) -> dict[str, Any]:
    """Create a new workspace (max 3 per user).

    Creates an empty workspace with the given name. The user must
    run ``/init`` to populate it with campaign data.
    """
    count = get_workspace_count(_user.user_id)
    if count >= 3:
        raise HTTPException(
            status_code=409,
            detail="Maximum 3 workspaces allowed. Delete one to create a new one.",
        )

    tenant_id = getattr(_user, "tenant_id", None) or _DEFAULT_TENANT_ID
    campaign_id = str(uuid.uuid4())

    ws = create_workspace(
        clerk_user_id=_user.user_id,
        tenant_id=str(tenant_id),
        workspace_name=payload.workspace_name,
        campaign_id=campaign_id,
        campaign_data={},  # Empty until /init is called
    )

    return {
        "workspace_slot": ws.workspace_slot,
        "workspace_name": ws.workspace_name,
        "campaign_id": ws.campaign_id,
        "is_active": ws.is_active,
    }


@router.put("/workspaces/activate")
def activate_user_workspace(
    payload: WorkspaceActivateRequest,
    _user: ClerkAuth = Depends(require_authenticated_user),
) -> dict[str, str]:
    """Switch the active workspace."""
    success = activate_workspace(_user.user_id, payload.workspace_slot)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace slot not found.")
    return {"status": "activated", "workspace_slot": str(payload.workspace_slot)}


@router.delete("/workspaces/{workspace_slot}")
def delete_user_workspace(
    workspace_slot: int,
    _user: ClerkAuth = Depends(require_authenticated_user),
) -> dict[str, str]:
    """Delete a workspace by slot number."""
    if workspace_slot < 1 or workspace_slot > 3:
        raise HTTPException(status_code=400, detail="Workspace slot must be between 1 and 3.")

    success = delete_workspace(_user.user_id, workspace_slot)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace slot not found.")
    return {"status": "deleted", "workspace_slot": str(workspace_slot)}
