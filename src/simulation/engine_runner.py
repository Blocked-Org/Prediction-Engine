import logging
import random
from typing import Any, Dict, Union

from src.api.schemas import SimulationRequest, SimulationResponse
from src.simulation.abm_engine import MarketingEnvironment
from src.simulation.markov_attribution import build_transition_matrix, calculate_removal_effect

# Configure module-level logger for defensive programming
logger = logging.getLogger(__name__)


import numpy as np

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


def _fetch_competitor_proxy() -> float:
    """
    Queries Neo4j for the count of ingested CompetitorContext nodes.
    Normalises the count to a [0.0, 1.0] scalar representing competitive pressure.
    Gracefully returns 0.0 if Neo4j is unreachable.

    Returns:
        float: Normalised competitor proxy score (0.0 if unavailable).
    """
    try:
        from src.api.db.neo4j_client import Neo4jManager
        mgr = Neo4jManager()
        mgr.connect()
        if mgr.driver is None:
            return 0.0
        records, _, _ = mgr.driver.execute_query(
            "MATCH (c:CompetitorContext) RETURN count(c) AS n"
        )
        count = int(records[0]["n"]) if records else 0
        logger.info(f"Neo4j CompetitorContext nodes found: {count}")
        # Cap at 10 competitors; normalise to [0, 1]
        return min(1.0, count / 10.0)
    except Exception as exc:
        logger.warning(f"Neo4j competitor fetch failed (using 0.0 fallback): {exc}")
        return 0.0
    finally:
        try:
            mgr.close()  # type: ignore[possibly-undefined]
        except Exception:
            pass


def run_micro_simulation(params: Union[SimulationRequest, Dict[str, Any]]) -> SimulationResponse:
    """
    Executes a micro-level simulation bridging the Agent-Based Model and
    Markov attribution algorithms. Enriches the result with a Neo4j-sourced
    competitor proxy fed into the Bayesian engine as an exogenous control.

    Args:
        params (Union[SimulationRequest, Dict[str, Any]]): The input parameters or Pydantic request model.

    Returns:
        SimulationResponse: A Pydantic schema strictly adhering to the API contract.
    """
    try:
        # 1. Parse params and run MarketingEnvironment Mesa model for 10 steps
        ad_exposure = 0.1
        channels = ['Meta', 'Google', 'TikTok', 'Email']
        total_budget = 0.0
        
        if isinstance(params, SimulationRequest):
            total_budget = sum(params.budget_allocation.values())
            ad_exposure = min(1.0, max(0.01, total_budget / 100000.0))
            if params.budget_allocation:
                channels = list(params.budget_allocation.keys())
        elif isinstance(params, dict):
            budget = params.get('budget_allocation', {})
            total_budget = sum(budget.values()) if budget else 0.0
            ad_exposure = min(1.0, max(0.01, total_budget / 100000.0))
            if budget:
                channels = list(budget.keys())

        logger.info(f"Starting micro-simulation with ad_exposure: {ad_exposure}")
        env = MarketingEnvironment(num_agents=1000, ad_exposure=ad_exposure)
        
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
        # 4. GRAPH-AUGMENTED ENRICHMENT — pull competitor proxy from Neo4j    #
        # ------------------------------------------------------------------ #
        competitor_proxy = _fetch_competitor_proxy()
        logger.info(f"Competitor proxy scalar from Neo4j: {competitor_proxy}")

        # Feed competitor proxy into Bayesian engine as an exogenous control
        from src.simulation.bayesian_mmm import BayesianSimulationEngine
        bayesian_engine = BayesianSimulationEngine()
        spend_values = [total_budget / max(len(channels), 1)] * len(channels)
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

        # 5. Blend ABM conversion counts with Bayesian signal to compute metrics
        df = env.datacollector.get_model_vars_dataframe()
        total_conversions = float(df['Total_Conversions'].iloc[-1]) if not df.empty else 0.0
        
        abm_roi = (total_conversions / 1000.0) * 3.5
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
        total_spend = sum(spend_values)

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
