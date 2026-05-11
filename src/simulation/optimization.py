from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize
from pymoo.core.problem import ElementwiseProblem
import numpy as np

class BudgetOptimizationProblem(ElementwiseProblem):
    def __init__(self, num_channels=3, total_budget=10000.0):
        # n_var = number of channels, n_obj = 2 (e.g., maximize conversions, minimize risk)
        super().__init__(n_var=num_channels, n_obj=2, n_ieq_constr=1, xl=0.0, xu=total_budget)
        self.total_budget = total_budget

    def _evaluate(self, x, out, *args, **kwargs):
        # x is the budget allocation per channel
        # Constraint: sum(x) <= total_budget (rewritten as sum(x) - total_budget <= 0)
        out["G"] = np.sum(x) - self.total_budget
        
        # Objective 1: Maximize conversions (minimize negative conversions)
        # Placeholder: f1 = - (x[0]*0.05 + x[1]*0.08 + x[2]*0.04)
        f1 = -np.sum(x * np.array([0.05, 0.08, 0.04]))
        
        # Objective 2: Minimize risk/variance
        f2 = np.std(x)
        
        out["F"] = [f1, f2]

def run_genetic_optimization(total_budget: float, num_channels: int):
    """
    Run Genetic Algorithms (NSGA-II) to find the Pareto frontier for budget allocation.
    """
    print("Running Genetic Optimization to find Pareto frontier...")
    problem = BudgetOptimizationProblem(num_channels=num_channels, total_budget=total_budget)
    
    algorithm = NSGA2(pop_size=100)
    
    res = minimize(problem,
                   algorithm,
                   ('n_gen', 50),
                   seed=1,
                   verbose=False)
                   
    # res.X contains the Pareto optimal solutions
    # res.F contains the objective values
    
    print(f"Optimization completed. Found {len(res.X) if res.X is not None else 0} Pareto optimal solutions.")
    return {
        "status": "success",
        "pareto_solutions": res.X.tolist() if res.X is not None else [],
        "objectives": res.F.tolist() if res.F is not None else []
    }
