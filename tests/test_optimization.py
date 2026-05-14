"""
Unit Test Suite for Optimization Engine (pymoo NSGA-II)
"""
import numpy as np
import pytest
from src.simulation.optimization import run_genetic_optimization

def mock_eval_function(x: np.ndarray) -> float:
    """
    Mock objective function.
    Suppose Meta (x[0]) has a high ROI, Google (x[1]) has medium ROI, and TikTok (x[2]) has low ROI.
    """
    return float(np.sum(x * np.array([1.5, 1.2, 1.0])))

class TestGeneticOptimization:

    def test_run_genetic_optimization(self) -> None:
        """
        Tests the execution of the NSGA-II algorithm.
        Verifies the structure of the outputs and enforces budget constraints.
        """
        channels = ["Meta", "Google", "TikTok"]
        total_budget = 1000.0
        
        result = run_genetic_optimization(
            channels=channels,
            total_budget=total_budget,
            eval_func=mock_eval_function
        )
        
        # 1. Assert successful execution
        assert result["status"] == "success"
        
        # 2. Assert Pareto solutions exist
        pareto_solutions = result["pareto_optimal_budgets"]
        assert isinstance(pareto_solutions, list)
        assert len(pareto_solutions) > 0
        
        # 3. Assert budget constraints and schema
        for sol in pareto_solutions:
            assert set(sol.keys()) == set(channels)
            
            total_spend = sum(sol.values())
            # Use a tiny tolerance for floating point rounding in Genetic Algorithm
            assert total_spend <= total_budget + 0.01, (
                f"Pareto solution breached total budget! Spend: {total_spend}, Budget: {total_budget}"
            )
            
            # Spend must be non-negative
            for val in sol.values():
                assert val >= 0.0
                
        # 4. Assert Objectives output exists
        assert "objectives" in result
        assert len(result["objectives"]) == len(pareto_solutions)
