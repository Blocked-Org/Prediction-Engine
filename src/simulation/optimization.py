from typing import List, Dict, Callable
import logging
import numpy as np
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize
from pymoo.core.problem import ElementwiseProblem

logger = logging.getLogger(__name__)

class BudgetOptimizationProblem(ElementwiseProblem):
    """
    Defines the multi-objective optimization problem for marketing budget allocation.
    Objectives:
        1. Maximize predicted conversions/ROI (via the provided evaluation function).
        2. Minimize budget variance (to encourage diversified spend across channels).
    Constraint:
        - Sum of allocated budgets <= total budget.
    """
    def __init__(self, 
                 channels: List[str], 
                 total_budget: float, 
                 eval_func: Callable[[np.ndarray], float]):
        self.channels = channels
        self.total_budget = total_budget
        self.eval_func = eval_func
        
        n_var = len(channels)
        xl = np.zeros(n_var)
        xu = np.ones(n_var) * total_budget
        
        # 2 objectives, 1 inequality constraint
        super().__init__(n_var=n_var, n_obj=2, n_ieq_constr=1, xl=xl, xu=xu)

    def _evaluate(self, x: np.ndarray, out: dict, *args, **kwargs):
        # Constraint: sum(x) - total_budget <= 0
        out["G"] = np.sum(x) - self.total_budget
        
        # Objective 1: Maximize conversions/ROI (minimize the negative)
        # We assume eval_func takes the numpy array of channel budgets and returns a float score
        expected_return = self.eval_func(x)
        f1 = -expected_return
        
        # Objective 2: Minimize variance (risk / lack of diversification)
        f2 = float(np.std(x))
        
        out["F"] = [f1, f2]

def run_genetic_optimization(channels: List[str], 
                             total_budget: float, 
                             eval_func: Callable[[np.ndarray], float]) -> Dict:
    """
    Run Genetic Algorithms (NSGA-II) to find the Pareto frontier for budget allocation.
    
    Args:
        channels: List of strings representing the marketing channels.
        total_budget: The maximum allowed spend sum across all channels.
        eval_func: A callable modeling engine that accepts a budget array 
                   and returns expected returns.
                   
    Returns:
        Dict containing the pareto optimal solutions mapped back to channel names.
    """
    logger.info(f"Running NSGA-II Optimization for {len(channels)} channels over budget {total_budget}")
    
    problem = BudgetOptimizationProblem(channels=channels, 
                                        total_budget=total_budget, 
                                        eval_func=eval_func)
    
    algorithm = NSGA2(pop_size=50)
    
    res = minimize(problem,
                   algorithm,
                   ('n_gen', 30),
                   seed=42,
                   verbose=False)
                   
    pareto_solutions = []
    if res.X is not None:
        # Handle 1D (single solution) or 2D (multiple Pareto solutions)
        solutions = res.X if res.X.ndim == 2 else [res.X]
        for sol in solutions:
            # Reconstruct the dictionary format required by the Pydantic schemas
            allocation = {ch: round(float(val), 2) for ch, val in zip(channels, sol)}
            # Hard enforce budget sum if it slightly breached due to numerical noise
            current_sum = sum(allocation.values())
            if current_sum > total_budget:
                ratio = total_budget / current_sum
                allocation = {ch: round(val * ratio, 2) for ch, val in allocation.items()}
                
            pareto_solutions.append(allocation)
            
    logger.info(f"Optimization completed. Found {len(pareto_solutions)} Pareto optimal solutions.")
    
    return {
        "status": "success",
        "pareto_optimal_budgets": pareto_solutions,
        "objectives": res.F.tolist() if res.F is not None else []
    }
