"""Build dashboard simulation payloads from Neo4j campaign graphs."""

from __future__ import annotations

import logging
import uuid
from datetime import date, timedelta
from typing import Any

from neo4j.exceptions import ServiceUnavailable

from src.api.db.neo4j_client import Neo4jManager
from src.api.schemas import ForecastRequest, HistoricalSpendRecord, SimulationRequest
from src.schemas.dashboard import DashboardResultsResponse
from src.shared.contracts import (
    CampaignInput,
    ChannelAllocation,
    CompetitorSignal,
    ConfidenceRange,
    DateRange,
    ForecastOutput,
    OptimizationResult,
    Recommendation,
    SimulationScenario,
    TargetAudience,
)
# NOTE: engine_runner is lazy-imported inside build_dashboard_results()
# to avoid loading PyMC/Mesa/SHAP at API startup (causes OOM on Railway).

logger = logging.getLogger(__name__)

_CAMPAIGN_FOR_USER_CYPHER = """
MATCH (u:User {clerk_id: $clerk_user_id})-[:OWNS]->(c:Campaign)
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
ORDER BY c.updated_at DESC
LIMIT 1
"""


def _as_float(value: Any, default: float) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_str_list(value: Any, default: list[str]) -> list[str]:
    if not value:
        return default
    if isinstance(value, list):
        return [str(v) for v in value if v]
    return default


def _build_simulation_request(campaign: dict[str, Any]) -> SimulationRequest:
    budget = _as_float(campaign.get("budget"), 10_000.0)
    cpc = _as_float(campaign.get("cpc"), 1.5)
    revenue = _as_float(campaign.get("historical_revenue"), budget * 3.0)
    channels = _as_str_list(campaign.get("primary_channels"), ["Meta", "Google", "TikTok"])

    # Derive proxy ad metrics from stored campaign budget and CPC
    clicks = max(1, int(budget / max(cpc, 0.01)))
    impressions = max(clicks, int(clicks / 0.025))
    conversions = max(1, int(clicks * 0.02))

    # Split total budget across channels (proportional to default MMM weights)
    channel_weights = {"Meta": 0.50, "Google": 0.30, "TikTok": 0.20}
    spend_meta = budget * channel_weights.get("Meta", 0.34)
    spend_google = budget * channel_weights.get("Google", 0.33)
    spend_tiktok = budget * channel_weights.get("TikTok", 0.33)

    # If budget was stored with known per-channel keys, prefer those
    if len(channels) == 3:
        per_ch = budget / 3.0
        spend_meta = per_ch if "Meta" in channels else 0.0
        spend_google = per_ch if "Google" in channels else 0.0
        spend_tiktok = per_ch if "TikTok" in channels else 0.0
        # Re-weight to match stored total
        spend_meta = budget * 0.50
        spend_google = budget * 0.30
        spend_tiktok = budget * 0.20

    return SimulationRequest(
        Impressions=float(impressions),
        Clicks=clicks,
        spend_meta=spend_meta,
        spend_google=spend_google,
        spend_tiktok=spend_tiktok,
        Total_Conversion=conversions,
        revenue=revenue,
        age=str(campaign.get("target_age_range") or "25-29"),
        gender="M",  # Default when not stored in graph
        interest="Travel",  # Default when not stored in graph
    )


def _build_forecast_request(campaign: dict[str, Any]) -> ForecastRequest:
    channels = _as_str_list(campaign.get("primary_channels"), ["Meta"])
    budget = _as_float(campaign.get("budget"), 10_000.0)
    per_channel = budget / max(len(channels), 1)
    competitor_names = _as_str_list(campaign.get("competitor_names"), [])
    competitor_sov = min(1.0, len(competitor_names) / 10.0)

    historical = [
        HistoricalSpendRecord(
            date=date.today() - timedelta(days=30 * (i + 1)),
            channel=ch,
            spend=round(per_channel * (0.85 + 0.05 * i), 2),
        )
        for i, ch in enumerate(channels)
    ]
    return ForecastRequest(
        historical_spend_data=historical,
        exogenous_factors={"competitor_share_of_voice": competitor_sov},
    )


def _channel_allocations(
    channels: list[str],
    budget: float,
    cpc: float,
) -> list[ChannelAllocation]:
    per_channel = budget / max(len(channels), 1)
    allocations: list[ChannelAllocation] = []
    for channel in channels:
        clicks = max(1, int(per_channel / max(cpc, 0.01)))
        impressions = max(clicks, int(clicks / 0.025))
        conversions = max(1, int(clicks * 0.02))
        allocations.append(
            ChannelAllocation(
                channel_name=channel,
                spend=round(per_channel, 2),
                impressions=impressions,
                clicks=clicks,
                conversions=conversions,
                ctr=round(clicks / impressions, 4),
                cpc=round(cpc, 2),
            )
        )
    return allocations


def _optimized_allocations(
    channels: list[str],
    pareto_budgets: list[dict[str, float]],
    budget: float,
) -> list[ChannelAllocation]:
    if pareto_budgets:
        best = pareto_budgets[0]
        return [
            ChannelAllocation(channel_name=ch, spend=round(float(spend), 2))
            for ch, spend in best.items()
        ]
    per_channel = budget / max(len(channels), 1)
    return [
        ChannelAllocation(channel_name=ch, spend=round(per_channel, 2))
        for ch in channels
    ]


def _recommendations(
    sim: Any,
    channels: list[str],
    pareto_budgets: list[dict[str, float]],
) -> list[Recommendation]:
    recs: list[Recommendation] = [
        Recommendation(
            recommendation_id="rec_roi",
            action="review_projected_roi",
            recommendation_reasoning=(
                f"Graph-augmented simulation projects ROI {sim.projected_roi:.2f} "
                f"with incremental ROAS {sim.incremental_roas:.2f}."
            ),
        )
    ]
    if pareto_budgets and channels:
        top_channel = max(pareto_budgets[0], key=lambda k: pareto_budgets[0][k])
        recs.append(
            Recommendation(
                recommendation_id="rec_pareto",
                action=f"shift_budget_to_{top_channel.lower()}",
                recommendation_reasoning=(
                    f"Pareto-optimal allocation favors {top_channel} based on "
                    "Markov removal-effect attribution."
                ),
            )
        )
    return recs


def build_dashboard_results(campaign: dict[str, Any]) -> DashboardResultsResponse:
    """Run simulation engines and map Neo4j campaign properties to the UI contract."""
    channels = _as_str_list(campaign.get("primary_channels"), ["Meta"])
    budget = _as_float(campaign.get("budget"), 10_000.0)
    cpc = _as_float(campaign.get("cpc"), 1.5)
    campaign_id = str(campaign.get("campaign_id") or uuid.uuid4())
    regions = _as_str_list(campaign.get("regions"), ["Dhaka"])
    competitor_names = _as_str_list(campaign.get("competitor_names"), [])

    sim_request = _build_simulation_request(campaign)
    forecast_request = _build_forecast_request(campaign)

    from src.simulation.engine_runner import run_micro_simulation, run_macro_forecast
    sim = run_micro_simulation(sim_request)
    forecast = run_macro_forecast(forecast_request)

    lower, upper = forecast.confidence_interval
    estimated_revenue = round(forecast.baseline_sales + forecast.incremental_sales, 2)

    end = date.today()
    start = end - timedelta(days=90)
    scenario_id = f"sim_{campaign_id[:8]}"

    competitor_signals = [
        CompetitorSignal(
            competitor_name=name,
            signal_type="market_presence",
            impact_score=round(min(1.0, 0.4 + 0.1 * i), 2),
            description=f"{name} is modeled as an active competitor in your category.",
        )
        for i, name in enumerate(competitor_names[:5])
    ]

    simulation_scenario = SimulationScenario(
        scenario_id=scenario_id,
        campaign_input=CampaignInput(
            campaign_id=campaign_id,
            channel_names=channels,
            date_range=DateRange(start_date=start, end_date=end),
            target_audience=TargetAudience(
                demographics={
                    "age_range": str(campaign.get("target_age_range") or "25-34"),
                    "regions": regions,
                },
                interests=_as_str_list(campaign.get("intent_clusters"), ["general_intent"]),
            ),
            region=regions[0] if regions else "Unknown",
            allocations=_channel_allocations(channels, budget, cpc),
        ),
        competitor_signals=competitor_signals,
    )

    optimization_result = OptimizationResult(
        campaign_id=campaign_id,
        optimized_allocations=_optimized_allocations(
            channels, sim.pareto_optimal_budgets, budget
        ),
        expected_forecast=ForecastOutput(
            campaign_id=campaign_id,
            estimated_revenue=estimated_revenue,
            uncertainty_bounds=ConfidenceRange(
                lower_bound=lower,
                upper_bound=upper,
                confidence_level=0.95,
            ),
        ),
        recommendations=_recommendations(sim, channels, sim.pareto_optimal_budgets),
    )

    return DashboardResultsResponse(
        status="ready",
        simulation_scenario=simulation_scenario,
        optimization_result=optimization_result,
    )


def fetch_campaign_for_user(
    manager: Neo4jManager,
    clerk_user_id: str,
) -> dict[str, Any] | None:
    if manager.driver is None:
        manager.connect()
    if manager.driver is None:
        raise ServiceUnavailable("Neo4j driver is not available.")

    with manager.driver.session() as session:
        record = session.run(
            _CAMPAIGN_FOR_USER_CYPHER,
            clerk_user_id=clerk_user_id,
        ).single()

    if record is None:
        return None
    return dict(record)


async def get_dashboard_results(
    manager: Neo4jManager,
    clerk_user_id: str,
) -> DashboardResultsResponse:
    campaign = fetch_campaign_for_user(manager, clerk_user_id)
    if campaign is None:
        return DashboardResultsResponse(status="no_campaign")

    # ── Redis cache layer ────────────────────────────────────────────────
    # Cache key is a deterministic hash of the campaign properties dict
    # so identical onboarding inputs skip the full ABM → Bayesian pipeline.
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

    try:
        result = build_dashboard_results(campaign)
        # Persist to cache (1 hour TTL)
        try:
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

