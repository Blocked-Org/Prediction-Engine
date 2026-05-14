"""
Bayesian Marketing Mix Modeling (MMM) Engine.

This module contains the core logic for the Bayesian Simulation Engine,
utilizing PyMC for probabilistic programming to model marketing effectiveness.
"""

import logging
from typing import Dict, List, Optional

import numpy as np

import pymc as pm
import pytensor
import pytensor.tensor as pt
from pytensor.tensor.variable import TensorVariable

logger = logging.getLogger(__name__)

def adstock_transformation(x: TensorVariable, lambda_decay: TensorVariable) -> TensorVariable:
    """
    Applies an autoregressive adstock transformation to a time series.

    Models the delayed, carryover effect of advertising using the formula:
    A_t = X_t + lambda_decay * A_{t-1}

    Args:
        x (TensorVariable): The raw media spend time series (1D tensor).
        lambda_decay (TensorVariable): The decay rate of the advertising effect (scalar).

    Returns:
        TensorVariable: The transformed adstocked time series.
    """
    def step_func(x_t: TensorVariable, a_tm1: TensorVariable, decay: TensorVariable) -> TensorVariable:
        return x_t + decay * a_tm1

    # Use PyTensor scan for efficient recursive/autoregressive computation
    results = pytensor.scan(
        fn=step_func,
        sequences=[x],
        outputs_info=[pt.as_tensor_variable(np.float64(0.0))],
        non_sequences=[lambda_decay],
        strict=True,
        return_updates=False
    )
    return results

def hill_function(x: TensorVariable, S: TensorVariable, K: TensorVariable) -> TensorVariable:
    """
    Applies a Hill function transformation to model diminishing returns.

    Uses the S-curve formula: f(x) = (x^S) / (K^S + x^S)

    Args:
        x (TensorVariable): The input time series (e.g., adstocked spend).
        S (TensorVariable): The shape parameter determining the steepness.
        K (TensorVariable): The half-saturation point parameter.

    Returns:
        TensorVariable: The transformed time series incorporating saturation effects.
    """
    # PyTensor operations are natively vectorized
    x_s = pt.power(x, S)
    k_s = pt.power(K, S)
    return x_s / (k_s + x_s)

class BayesianSimulationEngine:
    """
    Engine for executing Bayesian Marketing Mix Models.

    This engine handles the construction, fitting, and prediction phases
    of Bayesian MMMs, incorporating adstock and saturation effects.
    """

    def __init__(self) -> None:
        """
        Initializes the BayesianSimulationEngine.
        """
        logger.info("Initializing BayesianSimulationEngine")
        self.model: Optional[pm.Model] = None

    def build_model(
        self,
        data_matrix: Dict[str, List[float]],
        endogenous_channels: List[str],
        exogenous_controls: List[str]
    ) -> pm.Model:
        """
        Configures a custom PyMC Marketing Mix Model with explicit priors.

        Constructs a Bayesian model incorporating adstock and saturation transformations
        for endogenous inputs (e.g., ad spend) and linear effects for exogenous 
        controls (e.g., competitor share of voice).

        Args:
            data_matrix (Dict[str, List[float]]): The dataset containing all observed variables.
                Should include 'target' variable, endogenous, and exogenous features.
            endogenous_channels (List[str]): List of column names representing media 
                channels that require adstock and saturation modeling.
            exogenous_controls (List[str]): List of column names representing 
                control variables with direct linear relationships.

        Returns:
            pm.Model: The configured PyMC model instance ready for MCMC sampling.
            
        Raises:
            ValueError: If the required columns are missing from the data_matrix.
        """
        logger.info("Building Custom Bayesian MMM with explicit priors.")
        
        target_data = data_matrix.get("target")
        if target_data is None:
            raise ValueError("data_matrix must contain a 'target' key.")
            
        coords = {
            "channel": endogenous_channels,
            "control": exogenous_controls,
            "obs": range(len(target_data))
        }

        with pm.Model(coords=coords) as mmm:
            # --- Priors for Media Effects (Endogenous) ---
            # lambda (decay rate): Beta distribution (bounded between 0 and 1)
            lambda_decay = pm.Beta("lambda_decay", alpha=2.0, beta=2.0, dims="channel")
            
            # K (half-saturation): HalfNormal distribution (must be positive)
            half_saturation = pm.HalfNormal("half_saturation", sigma=5.0, dims="channel")
            
            # S (shape/slope): Gamma distribution
            shape = pm.Gamma("shape", alpha=2.0, beta=1.0, dims="channel")
            
            # Base coefficient for media channels
            media_coef = pm.HalfNormal("media_coef", sigma=2.0, dims="channel")

            media_contributions = []
            for i, channel in enumerate(endogenous_channels):
                spend_data = data_matrix.get(channel)
                if spend_data is None:
                    raise ValueError(f"Missing endogenous channel data: {channel}")
                
                spend_tensor = pt.as_tensor_variable(spend_data)
                
                # Apply Adstock
                adstocked = adstock_transformation(spend_tensor, lambda_decay[i])
                
                # Apply Saturation S-curve
                saturated = hill_function(adstocked, shape[i], half_saturation[i])
                
                media_contributions.append(media_coef[i] * saturated)
            
            if media_contributions:
                total_media_effect = media_contributions[0]
                for contrib in media_contributions[1:]:
                    total_media_effect += contrib
            else:
                total_media_effect = 0.0

            # --- Priors for Control Variables (Exogenous) ---
            control_contributions = []
            if exogenous_controls:
                control_coef = pm.Normal("control_coef", mu=0.0, sigma=1.0, dims="control")
                for i, control in enumerate(exogenous_controls):
                    control_data = data_matrix.get(control)
                    if control_data is None:
                        raise ValueError(f"Missing exogenous control data: {control}")
                    control_tensor = pt.as_tensor_variable(control_data)
                    control_contributions.append(control_coef[i] * control_tensor)
            
            if control_contributions:
                total_control_effect = control_contributions[0]
                for contrib in control_contributions[1:]:
                    total_control_effect += contrib
            else:
                total_control_effect = 0.0
            
            # --- Baseline and Target ---
            intercept = pm.Normal("intercept", mu=0.0, sigma=2.0)
            sigma = pm.HalfNormal("sigma", sigma=1.0)
            
            mu = intercept + total_media_effect + total_control_effect
            
            # Likelihood
            pm.Normal("target_obs", mu=mu, sigma=sigma, observed=target_data, dims="obs")

        self.model = mmm
        return mmm

    def apply_adstock_transformation(
        self,
        media_spend: List[float],
        decay_rate: float
    ) -> List[float]:
        """
        Applies a geometric adstock transformation to media spend data.

        Adstock models the delayed, carryover effect of advertising.

        Args:
            media_spend (List[float]): A list of chronological media spend values.
            decay_rate (float): The rate at which the advertising effect decays
                over time (between 0 and 1).

        Returns:
            List[float]: The transformed media spend incorporating adstock effects.

        Raises:
            NotImplementedError: Always raised as this is a placeholder for Day 2.
        """
        raise NotImplementedError("To be implemented on Day 2")

    def apply_hill_function(
        self,
        adstocked_spend: List[float],
        half_saturation_point: float,
        shape_parameter: float
    ) -> List[float]:
        """
        Applies a Hill function transformation to model diminishing returns.

        The Hill function models the saturation effect of advertising spend,
        where increasing spend yields diminishing marginal returns.

        Args:
            adstocked_spend (List[float]): Media spend data after adstock transformation.
            half_saturation_point (float): The spend level at which the return
                is half of the maximum possible return.
            shape_parameter (float): Determines the steepness of the saturation curve.

        Returns:
            List[float]: The transformed spend incorporating saturation effects.

        Raises:
            NotImplementedError: Always raised as this is a placeholder for Day 2.
        """
        raise NotImplementedError("To be implemented on Day 2")

    def run_simulation(self, request_data: dict) -> dict:
        """
        Executes a simulation using the Bayesian MMM to project returns.

        Ingests SimulationRequest data, applies adstock and saturation transformations
        using the defined priors, and returns projected metrics matching the
        SimulationResponse schema. This performs a prior predictive check.

        Args:
            request_data (dict): The simulation parameters mapped from SimulationRequest.
                Must contain 'budget_allocation'.

        Returns:
            dict: A dictionary containing projected_roi, incremental_roas,
                and pareto_optimal_budgets.
                
        Raises:
            ValueError: If 'budget_allocation' is missing.
        """
        logger.info("Running simulation via prior predictive check.")
        
        budgets = request_data.get("budget_allocation")
        if not budgets or not isinstance(budgets, dict):
            raise ValueError("budget_allocation is missing or invalid in request_data.")
            
        channels = list(budgets.keys())
        spend_values = [float(spend) for spend in budgets.values()]
        total_spend = sum(spend_values)
        
        if total_spend <= 0:
            return {
                "projected_roi": 0.0,
                "incremental_roas": 0.0,
                "pareto_optimal_budgets": [budgets]
            }

        # Build a 1-step data matrix for the prior predictive pass
        data_matrix: Dict[str, List[float]] = {ch: [spend] for ch, spend in zip(channels, spend_values)}
        data_matrix["target"] = [0.0]  # Dummy target to satisfy build_model
        
        # Build the model dynamically for the simulation step
        sim_model = self.build_model(
            data_matrix=data_matrix,
            endogenous_channels=channels,
            exogenous_controls=[]
        )
        
        # Perform prior predictive check to simulate outcomes
        with sim_model:
            prior_checks = pm.sample_prior_predictive(draws=100, random_seed=42)
            
        # Extract mean predicted target from the prior
        # prior_checks.prior_predictive is an xarray.Dataset
        target_samples = prior_checks.prior_predictive["target_obs"]
        simulated_revenue = float(target_samples.mean().item())
        
        # Ensure non-negative revenue
        simulated_revenue = max(0.0, simulated_revenue)
        
        incremental_roas = simulated_revenue / total_spend
        projected_roi = (simulated_revenue - total_spend) / total_spend
        
        # Generate mock pareto optimal budgets to fulfill the schema contract
        pareto_budgets = [
            budgets,
            {ch: round(val * 1.1, 2) for ch, val in budgets.items()},
            {ch: round(val * 0.9, 2) for ch, val in budgets.items()}
        ]

        return {
            "projected_roi": projected_roi,
            "incremental_roas": incremental_roas,
            "pareto_optimal_budgets": pareto_budgets
        }

    def fit_mcmc(
        self,
        features: Dict[str, List[float]],
        target: List[float],
        draws: int = 1000,
        tune: int = 1000
    ) -> object:
        """
        Fits the Bayesian model using Markov Chain Monte Carlo (MCMC).

        Args:
            features (Dict[str, List[float]]): A dictionary mapping feature names
                to their chronological data values.
            target (List[float]): The target variable data (e.g., sales, conversions).
            draws (int, optional): The number of samples to draw. Defaults to 1000.
            tune (int, optional): The number of tuning steps. Defaults to 1000.

        Returns:
            object: The posterior trace and other inference data (typically arviz.InferenceData).

        Raises:
            NotImplementedError: Always raised as this is a placeholder for Day 2.
        """
        raise NotImplementedError("To be implemented on Day 2")
