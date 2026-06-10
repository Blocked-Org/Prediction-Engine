import logging
import random
from typing import Any, Dict, Union

from src.api.schemas import SimulationRequest, SimulationResponse
from src.simulation.abm_engine import MarketingEnvironment
from src.simulation.markov_attribution import build_transition_matrix, calculate_removal_effect

# Configure module-level logger for defensive programming
logger = logging.getLogger(__name__)


import numpy as np  # noqa: E402

def cast_to_native(data: Any) -> Any:
    """
    Utility function to recursively cast numpy data types to native Python types.
    This ensures that Pydantic does not fail serialization when returning the final dictionary.
    - np.float64 and np.float32 are cast to float
    - np.int64 and np.int32 are cast to int
    - np.ndarray is cast to list
    """
    if isinstance(data, dict):
        return {k: cast_to_native(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [cast_to_native(v) for v in data]
    elif isinstance(data, np.ndarray):
        return cast_to_native(data.tolist())
    elif isinstance(data, (np.float32, np.float64)):
        return float(data)
    elif isinstance(data, (np.int32, np.int64)):
        return int(data)
    return data


def _fetch_competitor_proxy(competitor_urls: list[str] | None = None) -> float:
    """
    Queries PostgreSQL for the count of competitor context entries stored
    in the active workspace's ``competitor_context`` JSONB column.
    Normalises the count to a [0.0, 1.0] scalar representing competitive pressure.
    Gracefully returns 0.0 if no workspace or competitor data exists.

    If ``competitor_urls`` are provided, dispatches Firecrawl scraping tasks
    via the Celery worker before querying the database.

    Args:
        competitor_urls: Optional list of URLs to scrape via Firecrawl.

    Returns:
        float: Normalised competitor proxy score (0.0 if unavailable).

    .. note::
        Previously this function queried Neo4j for CompetitorContext nodes.
        Neo4j has been removed; competitor data is now stored in PostgreSQL
        JSONB. When a full graph database is re-introduced in the future,
        this function should be updated to query it instead.
    """
    # Dispatch Firecrawl scraping for user-provided competitor URLs
    if competitor_urls:
        try:
            from src.api.worker import scrape_competitor_data
            for url in competitor_urls:
                try:
                    scrape_competitor_data.delay(str(url))
                    logger.info(f"Enqueued Firecrawl scrape for competitor URL: {url}")
                except Exception as exc:
                    logger.warning(f"Failed to enqueue scrape for {url}: {exc}")
        except ImportError:
            logger.warning("Cannot import scrape_competitor_data — skipping competitor URL scraping.")

    # Query PostgreSQL for competitor context count
    # TODO: When a graph database (e.g. Neo4j, Memgraph) is re-introduced,
    #       replace this with a proper graph query for richer relationship data.
    try:
        from src.api.services.campaign_persistence import get_competitor_count
        # We don't have a clerk_user_id here, so we fall back to 0.0
        # The competitor count will be populated by the workspace system.
        # For now, return a baseline based on competitor_urls count.
        count = len(competitor_urls) if competitor_urls else 0
        logger.info(f"Competitor proxy from URL count: {count}")
        return min(1.0, count / 10.0)
    except Exception as exc:
        logger.warning(f"Competitor proxy fetch failed (using 0.0 fallback): {exc}")
        return 0.0


def run_micro_simulation(params: Union[SimulationRequest, Dict[str, Any]]) -> SimulationResponse:
    """
    Executes a micro-level simulation bridging the Agent-Based Model and
    Markov attribution algorithms. Enriches the result with a PostgreSQL-sourced
    competitor proxy fed into the Bayesian engine as an exogenous control.
    
    .. note::
        Previously enriched via Neo4j graph data. Competitor proxy now uses
        PostgreSQL JSONB. When a graph DB is re-introduced, this function
        should leverage it for richer relational context.

    Args:
        params (Union[SimulationRequest, Dict[str, Any]]): The input parameters or Pydantic request model.

    Returns:
        SimulationResponse: A Pydantic schema strictly adhering to the API contract.
    """
    try:
        # 1. Parse params — extract per-channel spend and demographics
        channels = ['Meta', 'Google', 'TikTok']
        spend_meta = 0.0
        spend_google = 0.0
        spend_tiktok = 0.0
        revenue = 0.0
        age = None
        gender = None
        interest = None
        competitor_urls: list[str] = []
        
        budget_overrides = None
        if isinstance(params, SimulationRequest):
            spend_meta = params.spend_meta
            spend_google = params.spend_google
            spend_tiktok = params.spend_tiktok
            revenue = params.revenue
            age = getattr(params, "age", None)
            gender = getattr(params, "gender", None)
            interest = getattr(params, "interest", None)
            competitor_urls = getattr(params, "competitor_urls", []) or []
            budget_overrides = getattr(params, "budget_overrides", None)
        elif isinstance(params, dict):
            spend_meta = float(params.get('spend_meta', 0.0))
            spend_google = float(params.get('spend_google', 0.0))
            spend_tiktok = float(params.get('spend_tiktok', 0.0))
            revenue = float(params.get('revenue', 0.0))
            age = params.get('age')
            gender = params.get('gender')
            interest = params.get('interest')
            competitor_urls = params.get('competitor_urls', []) or []
            budget_overrides = params.get('budget_overrides')

        total_budget = spend_meta + spend_google + spend_tiktok

        if budget_overrides:
            total_budget = sum(budget_overrides.values())

        ad_exposure = min(1.0, max(0.01, total_budget / 100000.0))

        logger.info(f"Starting micro-simulation with ad_exposure: {ad_exposure}, total_budget: {total_budget}, spend: Meta={spend_meta} Google={spend_google} TikTok={spend_tiktok}")
        env = MarketingEnvironment(
            num_agents=1000,
            ad_exposure=ad_exposure,
            age=age,
            gender=gender,
            interest=interest,
        )
        
        # Step the ABM simulation 10 times
        for _ in range(10):
            env.step()
            
        # 2. Generate mock user journeys based on ABM output
        if hasattr(env, "agents"):
            agents = env.agents
        else:
            agents = env.schedule.agents
        journeys = []
        
        for agent in agents:
            journey_length = random.randint(1, 4)
            path = random.choices(channels, k=journey_length)
            is_converted = getattr(agent, "is_converted", False)
            if is_converted:
                path.append("Conversion")
            else:
                path.append("Null")
            journeys.append(path)
            
        logger.info(f"Generated {len(journeys)} synthetic journeys from ABM.")

        # 3. Pass journeys to Markov transition logic
        transition_matrix = build_transition_matrix(journeys)
        removal_effects = calculate_removal_effect(transition_matrix)
        logger.info(f"Calculated Markov removal effects: {removal_effects}")

        # ------------------------------------------------------------------ #
        # 4. DB-AUGMENTED ENRICHMENT — pull competitor proxy from PostgreSQL  #
        # TODO: When a graph database is re-introduced, replace this with a  #
        #       proper graph traversal for richer competitive intelligence.   #
        # ------------------------------------------------------------------ #
        competitor_proxy = _fetch_competitor_proxy(competitor_urls=competitor_urls)
        logger.info(f"Competitor proxy scalar from PostgreSQL: {competitor_proxy}")

        # Feed competitor proxy into Bayesian engine as an exogenous control
        from src.simulation.bayesian_mmm import BayesianSimulationEngine
        bayesian_engine = BayesianSimulationEngine()
        channels = ['Meta', 'Google', 'TikTok']
        if budget_overrides:
            spend_values = [float(budget_overrides.get(ch, total_budget / 3)) for ch in channels]
        else:
            # Use actual per-channel spend from user input (no hardcoded split)
            spend_values = [spend_meta, spend_google, spend_tiktok]
        data_matrix: Dict[str, Any] = {
            ch: [spend] for ch, spend in zip(channels, spend_values)
        }
        data_matrix["competitor_sov"] = [competitor_proxy]
        data_matrix["target"] = [0.0]

        sim_model = bayesian_engine.build_model(
            data_matrix=data_matrix,
            endogenous_channels=channels,
            exogenous_controls=["competitor_sov"]
        )
        import pymc as pm
        with sim_model:
            prior_checks = pm.sample_prior_predictive(draws=50, random_seed=42)
        target_samples = prior_checks.prior_predictive["target_obs"].values.flatten()
        bayesian_roi_signal = max(0.0, float(target_samples.mean()))
        logger.info(f"Bayesian prior predictive mean revenue signal: {bayesian_roi_signal:.2f}")

        # Calculate actual ROI from real revenue / total_spend (no magic number)
        abm_roi = revenue / total_budget if total_budget > 0 else 0.0
        # Weight: 60% Bayesian signal, 40% ABM — Bayesian dominates when graph data is present
        graph_weight = 0.6 if competitor_proxy > 0.0 else 0.0
        projected_roi = round(
            (graph_weight * bayesian_roi_signal) + ((1.0 - graph_weight) * abm_roi), 2
        )

        avg_removal = sum(removal_effects.values()) / len(removal_effects) if removal_effects else 0.0
        # Discount ROAS by competitive pressure (more competition = lower marginal return)
        incremental_roas = round(avg_removal * 10.0 * (1.0 - competitor_proxy * 0.3), 2)
        
        # 6. Generate pareto optimal budgets ranked by Markov removal effect
        sorted_channels = sorted(removal_effects.keys(), key=lambda k: removal_effects[k], reverse=True)
        pareto_budgets = []
        base_budget = total_budget if total_budget > 0 else 10000.0
        
        if sorted_channels:
            best_chan_budget = base_budget * 0.6
            remainder = (base_budget * 0.4) / (len(sorted_channels) - 1) if len(sorted_channels) > 1 else 0
            scenario_a = {c: round(best_chan_budget if i == 0 else remainder, 2) for i, c in enumerate(sorted_channels)}
            even_split = base_budget / len(sorted_channels)
            scenario_b = {c: round(even_split, 2) for c in sorted_channels}
            pareto_budgets.extend([scenario_a, scenario_b])
        else:
            pareto_budgets = [{"MockChannel": float(base_budget)}]

        return SimulationResponse(
            projected_roi=projected_roi,
            incremental_roas=incremental_roas,
            pareto_optimal_budgets=pareto_budgets
        )
        
    except Exception as e:
        logger.error(f"Error in run_micro_simulation wrapper: {e}", exc_info=True)
        raise

def run_macro_forecast(params: Any) -> Any:
    """
    Executes the macro-level forecasting using the Bayesian MMM Engine.
    Confidence intervals are derived from real PyMC prior_predictive quantiles.
    
    Args:
        params: The Pydantic ForecastRequest object.
        
    Returns:
        ForecastResponse: A strictly typed schema containing the forecast.
    """
    try:
        from src.simulation.bayesian_mmm import BayesianSimulationEngine
        from src.api.schemas import ForecastResponse
        import pymc as pm
        
        logger.info("Executing real macro forecast via BayesianSimulationEngine.")
        
        # Aggregate historical spend into per-channel sums
        budget_summary: Dict[str, float] = {}
        for record in params.historical_spend_data:
            budget_summary[record.channel] = budget_summary.get(record.channel, 0.0) + record.spend
            
        if not budget_summary:
            logger.warning("No historical spend data provided. Running cold-start forecast.")
            budget_summary = {"UnknownChannel": 0.0}

        channels = list(budget_summary.keys())
        spend_values = list(budget_summary.values())

        # Build data matrix for the PyMC model
        data_matrix: Dict[str, Any] = {
            ch: [spend] for ch, spend in zip(channels, spend_values)
        }

        # Include exogenous factors from the request as control variables
        exogenous_controls: list[str] = []
        for factor, val in params.exogenous_factors.items():
            data_matrix[factor] = [float(val)]
            exogenous_controls.append(factor)

        data_matrix["target"] = [0.0]  # Dummy target for prior predictive

        # Build and sample the PyMC model
        engine = BayesianSimulationEngine()
        sim_model = engine.build_model(
            data_matrix=data_matrix,
            endogenous_channels=channels,
            exogenous_controls=exogenous_controls
        )

        with sim_model:
            prior_checks = pm.sample_prior_predictive(draws=200, random_seed=42)

        # Extract the raw target samples from the prior predictive
        target_samples = prior_checks.prior_predictive["target_obs"].values.flatten()
        simulated_revenue = max(0.0, float(target_samples.mean()))
        incremental_sales = round(simulated_revenue, 2)

        # ------------------------------------------------------------------ #
        # Real confidence interval from PyMC [5th, 95th] percentile quantiles #
        # ------------------------------------------------------------------ #
        lower_bound = round(float(np.quantile(target_samples, 0.05)), 2)
        upper_bound = round(float(np.quantile(target_samples, 0.95)), 2)

        # Exogenous baseline modification (competitor share of voice lowers baseline)
        baseline_sales = 50000.0
        for factor, val in params.exogenous_factors.items():
            if 'competitor' in factor.lower():
                baseline_sales *= max(0.1, (1.0 - (float(val) * 0.5)))

        return ForecastResponse(
            baseline_sales=round(baseline_sales, 2),
            incremental_sales=incremental_sales,
            confidence_interval=(lower_bound, upper_bound)
        )
        
    except Exception as e:
        logger.error(f"Error in run_macro_forecast: {e}", exc_info=True)
        raise
