"""
Unit Test Suite for Engine 4 - Explainability (SHAP)
"""
import numpy as np
from typing import Dict, List
import pytest
from src.explainability.shap_explainer import MathematicalExplainer

def mock_linear_model(data: Dict[str, List[float]]) -> List[float]:
    """
    A simple deterministic linear model for testing SHAP values.
    Returns: 10 * Meta + 2 * Google
    This means Meta should have a much higher SHAP feature contribution than Google.
    """
    meta_spend = np.array(data["Meta"])
    google_spend = np.array(data["Google"])
    return (10 * meta_spend + 2 * google_spend).tolist()

class TestMathematicalExplainer:
    
    def test_feature_contributions(self) -> None:
        """
        Validates that the SHAP TreeExplainer surrogate accurately captures
        feature importances of a deterministic mock model.
        """
        np.random.seed(42)
        explainer = MathematicalExplainer()
        
        input_data = {
            "Meta": [100.0],
            "Google": [100.0]
        }
        
        contributions = explainer.compute_feature_contributions(
            model_wrapper=mock_linear_model,
            input_data=input_data,
            num_samples=100  # Smaller sample size for fast testing
        )
        
        # 1. Assert structure
        assert isinstance(contributions, dict)
        assert set(contributions.keys()) == {"Meta", "Google"}
        
        # 2. Assert percentages sum to exactly 1.0 (with slight fp tolerance)
        total_contribution = sum(contributions.values())
        assert pytest.approx(total_contribution, 0.001) == 1.0
        
        # 3. Assert logic: Meta has a multiplier of 10, Google has 2.
        # Therefore, Meta's contribution must be significantly higher than Google's.
        assert contributions["Meta"] > contributions["Google"], (
            f"Expected Meta to have higher contribution than Google, "
            f"got Meta: {contributions['Meta']}, Google: {contributions['Google']}"
        )

    def test_zero_contribution(self) -> None:
        """
        Tests when the model returns a constant value, SHAP should return 0.0 for all features.
        """
        def constant_model(data: Dict[str, List[float]]) -> List[float]:
            return [5.0] * len(data[list(data.keys())[0]])
            
        np.random.seed(42)
        explainer = MathematicalExplainer()
        contributions = explainer.compute_feature_contributions(
            model_wrapper=constant_model,
            input_data={"Meta": [100.0]},
            num_samples=10
        )
        
        assert contributions["Meta"] == 0.0
