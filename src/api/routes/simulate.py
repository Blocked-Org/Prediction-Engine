"""Simulation onboarding routes — graph initialization via Neo4j."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from neo4j.exceptions import Neo4jError, ServiceUnavailable

from src.api.auth import Role, require_role

from src.api.db.neo4j_client import Neo4jManager, get_neo4j_manager
from src.api.services.dashboard_results import get_dashboard_results
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
            "Spent": payload.endogenous.Spent,
            "Total_Conversion": payload.transactional.Total_Conversion,
            "age": payload.audience.age,
            "gender": payload.audience.gender,
            "interest": payload.audience.interest,
        }
        
        # Inject budget_overrides if present
        if payload.budget_overrides:
            flat_payload["budget_overrides"] = payload.budget_overrides
            
        # ── Redis cache check ────────────────────────────────────────────
        from src.api.cache import get_simulation_cache
        cache = get_simulation_cache()
        cache_ns = "simulate:micro"

        cached = await cache.get(cache_ns, flat_payload)
        if cached is not None:
            logger.info("Returning cached simulation result (skipping Celery).")
            return {"task_id": "cached", "status": "SUCCESS", "result": cached}

        logger.info(
            "Enqueuing simulation request: Impressions=%s, Spent=%s, age=%s, gender=%s, interest=%s, overrides=%s",
            flat_payload["Impressions"], flat_payload["Spent"], flat_payload["age"], flat_payload["gender"], flat_payload["interest"], "yes" if payload.budget_overrides else "no"
        )
        
        # Enqueue the Celery task — does NOT block the ASGI thread
        task = run_simulation_task.delay(flat_payload)
        
        return {"task_id": task.id, "status": "processing"}
    except Exception as exc:
        logger.error("Error enqueuing simulation request: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error enqueuing simulation") from exc


_CAMPAIGN_GRAPH_CYPHER = """
MERGE (u:User {clerk_id: $clerk_user_id})
SET
  u.is_onboarded = true,
  u.onboarded_at = datetime()

MERGE (c:Campaign {id: $campaign_id})
SET
  c.budget = $budget,
  c.cpc = $cpc,
  c.base_price = $base_price,
  c.discount_rate = $discount_rate,
  c.primary_channels = $primary_channels,
  c.historical_revenue = $historical_revenue,
  c.aov = $aov,
  c.cac = $cac,
  c.ltv = $ltv,
  c.updated_at = datetime()

MERGE (ac:AgentCluster {id: $agent_cluster_id})
SET
  ac.regions = $regions,
  ac.target_age_range = $target_age_range,
  ac.intent_clusters = $intent_clusters,
  ac.updated_at = datetime()

MERGE (c)-[:TARGETS]->(ac)

MERGE (u)-[:OWNS]->(c)

WITH c
UNWIND $competitors AS competitor_name
MERGE (comp:Competitor {name: competitor_name})
MERGE (c)-[:COMPETES_WITH]->(comp)

RETURN
  c.id AS campaign_id,
  $agent_cluster_id AS agent_cluster_id,
  collect(DISTINCT comp.name) AS competitor_ids
"""

_MACRO_CONTEXT_CYPHER = """
MATCH (c:Campaign {id: $campaign_id})
UNWIND $macroeconomic_flags AS flag
MERGE (mc:MacroContext {flag: flag})
MERGE (c)-[:OPERATES_IN]->(mc)
RETURN collect(DISTINCT mc.flag) AS macro_context_ids
"""

_ONBOARDING_STATUS_CYPHER = """
MATCH (u:User {clerk_id: $clerk_user_id})
OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign)
RETURN
  coalesce(u.is_onboarded, false) AS flag_onboarded,
  count(c) > 0 AS has_campaign
"""


def _build_cypher_params(
    payload: SimulationInitRequest,
    campaign_id: str,
    agent_cluster_id: str,
) -> dict[str, Any]:
    clicks = payload.endogenous.Clicks
    spent = payload.endogenous.Spent
    cpc = spent / clicks if clicks > 0 else 1.5
    conversions = payload.transactional.Total_Conversion
    aov = spent / conversions if conversions > 0 else 100.0
    cac = spent / conversions if conversions > 0 else 50.0

    return {
        "clerk_user_id": payload.clerk_user_id,
        "campaign_id": campaign_id,
        "agent_cluster_id": agent_cluster_id,
        "budget": spent,
        "cpc": cpc,
        "base_price": 100.0,
        "discount_rate": 0.0,
        "primary_channels": ["Meta"],
        "historical_revenue": spent * 1.5,
        "aov": aov,
        "cac": cac,
        "ltv": aov * 3.0,
        "regions": ["Dhaka"],
        "target_age_range": payload.audience.age,
        "intent_clusters": [payload.audience.interest],
        "competitors": payload.exogenous.competitors,
        "macroeconomic_flags": payload.exogenous.macroeconomic_flags,
    }


def get_onboarding_status(
    manager: Neo4jManager,
    clerk_user_id: str,
) -> SimulationOnboardingStatus:
    """
    Return onboarding status for a Clerk user.

    Backfill: users with an existing OWNS->Campaign link are treated as onboarded
    even if is_onboarded was never set on the User node.
    """
    if manager.driver is None:
        manager.connect()
    if manager.driver is None:
        raise ServiceUnavailable("Neo4j driver is not available.")

    with manager.driver.session() as session:
        record = session.run(
            _ONBOARDING_STATUS_CYPHER,
            clerk_user_id=clerk_user_id,
        ).single()

    if record is None:
        return SimulationOnboardingStatus(
            clerk_user_id=clerk_user_id,
            is_onboarded=False,
            has_campaign=False,
        )

    has_campaign = bool(record["has_campaign"])
    flag_onboarded = bool(record["flag_onboarded"])
    is_onboarded = flag_onboarded or has_campaign

    return SimulationOnboardingStatus(
        clerk_user_id=clerk_user_id,
        is_onboarded=is_onboarded,
        has_campaign=has_campaign,
    )


def persist_simulation_init(
    manager: Neo4jManager,
    payload: SimulationInitRequest,
) -> SimulationInitResponse:
    """
    Write the four input matrices into Neo4j as interconnected nodes.

    Raises:
        ServiceUnavailable: Neo4j is unreachable.
        Neo4jError: Constraint violations or query failures.
    """
    if manager.driver is None:
        manager.connect()
    if manager.driver is None:
        raise ServiceUnavailable("Neo4j driver is not available.")

    campaign_id = str(uuid.uuid4())
    agent_cluster_id = str(uuid.uuid4())
    params = _build_cypher_params(payload, campaign_id, agent_cluster_id)

    def _write_transaction(tx: Any) -> dict[str, Any]:
        campaign_result = tx.run(_CAMPAIGN_GRAPH_CYPHER, params).single()
        if campaign_result is None:
            raise Neo4jError("Campaign graph write returned no result.")

        macro_context_ids: list[str] = []
        if params["macroeconomic_flags"]:
            macro_result = tx.run(
                _MACRO_CONTEXT_CYPHER,
                campaign_id=campaign_id,
                macroeconomic_flags=params["macroeconomic_flags"],
            ).single()
            if macro_result is not None:
                macro_context_ids = list(macro_result["macro_context_ids"] or [])

        return {
            "campaign_id": campaign_result["campaign_id"],
            "agent_cluster_id": campaign_result["agent_cluster_id"],
            "competitor_ids": list(campaign_result["competitor_ids"] or []),
            "macro_context_ids": macro_context_ids,
        }

    with manager.driver.session() as session:
        graph = session.execute_write(_write_transaction)

    competitor_ids: list[str] = graph["competitor_ids"]
    macro_context_ids: list[str] = graph["macro_context_ids"]

    return SimulationInitResponse(
        campaign_id=graph["campaign_id"],
        agent_cluster_id=graph["agent_cluster_id"],
        competitor_ids=competitor_ids,
        macro_context_ids=macro_context_ids,
        node_counts=SimulationNodeCounts(
            competitors=len(competitor_ids),
            macro_contexts=len(macro_context_ids),
        ),
        is_onboarded=True,
    )


@router.get("/results/{clerk_user_id}", response_model=DashboardResultsResponse)
async def simulate_results(
    clerk_user_id: str,
    neo4j: Neo4jManager = Depends(get_neo4j_manager),
    role: Role = Depends(require_role(Role.owner, Role.admin, Role.analyst, Role.viewer)),
) -> DashboardResultsResponse:
    """
    Return dashboard-ready simulation data for the user's latest Neo4j campaign.

    Runs the micro-simulation and macro-forecast engines from persisted onboarding
    inputs. Returns ``no_campaign`` when the user has not onboarded, or
    ``processing`` when computation fails (retry shortly).
    """
    try:
        return await get_dashboard_results(neo4j, clerk_user_id)
    except ServiceUnavailable as exc:
        logger.error("Neo4j unavailable during simulate/results: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Graph database is unavailable. Try again shortly.",
        ) from exc
    except Neo4jError as exc:
        logger.error("Neo4j error during simulate/results: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load campaign results: {exc}",
        ) from exc


@router.get("/status/{clerk_user_id}", response_model=SimulationOnboardingStatus)
def simulate_onboarding_status(
    clerk_user_id: str,
    neo4j: Neo4jManager = Depends(get_neo4j_manager),
) -> SimulationOnboardingStatus:
    """Return whether the user has completed onboarding (with Campaign backfill)."""
    try:
        return get_onboarding_status(neo4j, clerk_user_id)
    except ServiceUnavailable as exc:
        logger.error("Neo4j unavailable during simulate/status: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Graph database is unavailable. Try again shortly.",
        ) from exc
    except Neo4jError as exc:
        logger.error("Neo4j error during simulate/status: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read onboarding status: {exc}",
        ) from exc


@router.post("/init", response_model=SimulationInitResponse, status_code=200)
def simulate_init(
    payload: SimulationInitRequest,
    neo4j: Neo4jManager = Depends(get_neo4j_manager),
    role: Role = Depends(require_role(Role.owner, Role.admin, Role.analyst, Role.viewer)),
) -> SimulationInitResponse:
    """
    Validate onboarding matrices and persist them to the Neo4j knowledge graph.

    Pydantic validates the request body before this handler runs. All Cypher
    uses parameterised queries to prevent injection.
    """
    try:
        logger.info(
            "Initializing simulation graph for campaign (age=%s, interest=%s, spent=%s, competitors=%d)",
            payload.audience.age,
            payload.audience.interest,
            payload.endogenous.Spent,
            len(payload.exogenous.competitors),
        )
        return persist_simulation_init(neo4j, payload)
    except ServiceUnavailable as exc:
        logger.error("Neo4j unavailable during simulate/init: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Graph database is unavailable. Try again shortly.",
        ) from exc
    except Neo4jError as exc:
        logger.error("Neo4j error during simulate/init: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to persist simulation graph: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during simulate/init")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during graph initialization",
        ) from exc
