import time
from src.simulation.macro import run_bayesian_mmm
from src.simulation.micro import run_agent_based_simulation
from src.simulation.optimization import run_genetic_optimization

def run_full_simulation_task(budget: float, num_channels: int):
    """
    Background task to run the complete simulation pipeline.
    """
    print(f"Starting full simulation task for budget: {budget}")
    
    # 1. Macro Simulation (Placeholder)
    # run_bayesian_mmm(data, target_col, spend_cols)
    time.sleep(2) # simulate delay
    
    # 2. Micro Simulation
    micro_results = run_agent_based_simulation(agents_count=1000, transition_matrix=None)
    time.sleep(2) # simulate delay
    
    # 3. Optimization
    opt_results = run_genetic_optimization(total_budget=budget, num_channels=num_channels)
    
    return {
        "status": "completed",
        "micro_results": micro_results,
        "optimization": opt_results
    }
