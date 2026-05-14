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


def run_micro_simulation(params: Union[SimulationRequest, Dict[str, Any]]) -> SimulationResponse:
    """
    Executes a micro-level simulation bridging the Agent-Based Model and
    Markov attribution algorithms. It returns a strictly typed SimulationResponse
    for deterministic frontend consumption.

    Args:
        params (Union[SimulationRequest, Dict[str, Any]]): The input parameters or Pydantic request model.

    Returns:
        SimulationResponse: A Pydantic schema strictly adhering to the API contract.
    """
    try:
        # 1. Parse params and run MarketingEnvironment Mesa model for 10 steps
        ad_exposure = 0.1
        channels = ['Meta', 'Google', 'TikTok', 'Email']
        
        if isinstance(params, SimulationRequest):
            total_budget = sum(params.budget_allocation.values())
            # Scale ad_exposure roughly based on budget, bounded between 0.01 and 1.0
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
        # Access agents carefully depending on Mesa version (fallback to schedule.agents)
        if hasattr(env, "agents"):
            agents = env.agents
        else:
            agents = env.schedule.agents
        journeys = []
        
        for agent in agents:
            # Synthesize a random path of 1 to 4 touchpoints
            journey_length = random.randint(1, 4)
            path = random.choices(channels, k=journey_length)
            
            # Map the ABM's true conversion state to the Markov terminal state
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

        # 4. Format and return final data matching the Pydantic schema
        # Fetch actual conversion counts from the ABM's data collector
        df = env.datacollector.get_model_vars_dataframe()
        total_conversions = float(df['Total_Conversions'].iloc[-1]) if not df.empty else 0.0
        
        # Synthesize projected ROI based on total conversions
        projected_roi = (total_conversions / 1000.0) * 3.5  
        
        # Synthesize incremental ROAS based on average channel importance
        avg_removal = sum(removal_effects.values()) / len(removal_effects) if removal_effects else 0.0
        incremental_roas = avg_removal * 10.0
        
        # Generate pareto optimal budgets by ranking channels by their removal effect
        sorted_channels = sorted(removal_effects.keys(), key=lambda k: removal_effects[k], reverse=True)
        pareto_budgets = []
        base_budget = total_budget if total_budget > 0 else 10000.0
        
        if sorted_channels:
            # Scenario A: Top-heavy budget favoring the best channel
            best_chan_budget = base_budget * 0.6
            remainder = (base_budget * 0.4) / (len(sorted_channels) - 1) if len(sorted_channels) > 1 else 0
            scenario_a = {c: round(best_chan_budget if i == 0 else remainder, 2) for i, c in enumerate(sorted_channels)}
            
            # Scenario B: Even spread
            even_split = base_budget / len(sorted_channels)
            scenario_b = {c: round(even_split, 2) for c in sorted_channels}
            
            pareto_budgets.extend([scenario_a, scenario_b])
        else:
            pareto_budgets = [{"MockChannel": float(base_budget)}]

        # Construct strictly typed response expected by /simulate
        response = SimulationResponse(
            projected_roi=round(projected_roi, 2),
            incremental_roas=round(incremental_roas, 2),
            pareto_optimal_budgets=pareto_budgets
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error in run_micro_simulation wrapper: {e}", exc_info=True)
        raise
