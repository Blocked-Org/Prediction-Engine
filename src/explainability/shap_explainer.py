"""
Explainability Module using SHAP (SHapley Additive exPlanations).

This module provides tools for interpreting the outputs of complex
simulation models, computing feature contributions to predictions.
"""

import logging
from typing import Dict, List, Callable
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import shap

logger = logging.getLogger(__name__)

class MathematicalExplainer:
    """
    Calculates and structures mathematical explanations for model outputs.

    This explainer is responsible for computing Shapley values or other
    feature attribution metrics to demystify black-box predictions.
    """

    def __init__(self) -> None:
        """
        Initializes the MathematicalExplainer.
        """
        logger.info("Initializing MathematicalExplainer")

    def compute_feature_contributions(
        self,
        model_wrapper: Callable[[Dict[str, List[float]]], List[float]],
        input_data: Dict[str, List[float]],
        num_samples: int = 500
    ) -> Dict[str, float]:
        """
        Computes the percentage contribution of each feature to the model's prediction.
        
        Since Bayesian/Mesa models are complex black-boxes, this uses LIME-like 
        neighborhood sampling to train a surrogate RandomForestRegressor, which 
        is then explained precisely via SHAP TreeExplainer.

        Args:
            model_wrapper: A callable that accepts a dictionary of lists (features)
                           and returns a list of float predictions.
            input_data: A dictionary mapping feature names to their corresponding 
                        input values.
            num_samples: Number of synthetic neighborhood samples to generate.

        Returns:
            Dict[str, float]: A dictionary mapping feature names to their percentage 
                              contribution (0.0 to 1.0).
        """
        logger.info("Computing feature contributions using SHAP TreeExplainer.")
        
        df_input = pd.DataFrame(input_data)
        
        # 1. Generate synthetic neighborhood data around the input points
        synthetic_data = {}
        for col in df_input.columns:
            mean_val = df_input[col].mean()
            std_val = df_input[col].std()
            if pd.isna(std_val) or std_val == 0:
                std_val = abs(mean_val) * 0.1 + 1e-5
            synthetic_data[col] = np.random.normal(loc=mean_val, scale=std_val, size=num_samples)
            
        df_synthetic = pd.DataFrame(synthetic_data)
        
        # 2. Query the original complex model to get target values
        y_synthetic = model_wrapper(df_synthetic.to_dict(orient='list'))
        
        # 3. Train a Tree-based Surrogate model on the neighborhood
        surrogate = RandomForestRegressor(n_estimators=100, random_state=42)
        surrogate.fit(df_synthetic, y_synthetic)
        
        # 4. Explain the original input via SHAP TreeExplainer
        explainer = shap.TreeExplainer(surrogate)
        shap_values = explainer.shap_values(df_input)
        
        # Calculate mean absolute SHAP values across the input data
        if len(shap_values.shape) > 1:
            mean_abs_shap = np.abs(shap_values).mean(axis=0)
        else:
            mean_abs_shap = np.abs(shap_values)
            
        total_shap = np.sum(mean_abs_shap)
        if total_shap == 0:
            return {col: 0.0 for col in df_input.columns}
            
        # Convert absolute SHAP values to normalized percentage contributions
        contributions = {
            col: float(val / total_shap) 
            for col, val in zip(df_input.columns, mean_abs_shap)
        }
        
        return contributions
