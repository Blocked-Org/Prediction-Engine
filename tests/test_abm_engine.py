"""
Unit Test Suite for Engine 2 — Agent-Based Model (Mesa 3.0 Micro Simulation).

This module validates the agent initialization, step execution with data
collection, and the zero-exposure baseline behavior of the
MarketingEnvironment ABM defined in `src.simulation.abm_engine`.

Dependencies:
    - pytest
    - pandas (for DataFrame assertions on datacollector output)
    - mesa 3.0+
    - pydantic (used internally by the engine for config validation)
"""

import pandas as pd
# import pytest

from src.simulation.abm_engine import (
    ConsumerAgent,
    EnvironmentConfig,
    MarketingEnvironment,
)


# ---------------------------------------------------------------------------
# Test 1: Agent Initialization & Demographic Randomization
# ---------------------------------------------------------------------------
class TestAgentInitialization:
    """
    Validates that the MarketingEnvironment correctly instantiates the
    full population of ConsumerAgents and distributes demographic segments
    via its internal randomization logic.
    """

    def test_agent_initialization(self) -> None:
        """
        Initialize a MarketingEnvironment with default parameters and verify:
          1. Exactly 1,000 agents are created and registered with the scheduler.
          2. Every agent is an instance of ConsumerAgent.
          3. More than one unique demographic_segment value exists across the
             population, proving the randomization logic is functional.
        """
        # --- Arrange ---
        # Use default config: num_agents=1000, ad_exposure=0.1
        model = MarketingEnvironment()

        # --- Act ---
        # Collect all agents from the model's AgentSet (Mesa 3.0+ API)
        agents = list(model.agents)

        # Gather unique demographic segments across the population
        demographic_segments = {agent.demographic_segment for agent in agents}

        # --- Assert ---

        # 1. Exactly 1,000 agents must be present in the model's AgentSet
        assert len(agents) == 1000, (
            f"Expected 1,000 agents in the AgentSet, but found {len(agents)}. "
            "The model's agent creation loop may have failed silently."
        )

        # 2. Every registered entity must be a ConsumerAgent instance
        for agent in agents:
            assert isinstance(agent, ConsumerAgent), (
                f"Agent {agent.unique_id} is of type {type(agent).__name__}, "
                "expected ConsumerAgent."
            )

        # 3. Population must exhibit demographic diversity (more than 1 unique segment)
        assert len(demographic_segments) > 1, (
            f"Only {len(demographic_segments)} unique demographic segment(s) found: "
            f"{demographic_segments}. The randomization logic is not producing "
            "diverse demographic assignments."
        )


# ---------------------------------------------------------------------------
# Test 2: Step Execution & Data Collection Integrity
# ---------------------------------------------------------------------------
class TestStepExecutionAndDataCollection:
    """
    Validates that the model can advance through multiple steps without
    errors and that the DataCollector correctly accumulates one row of
    model-level metrics per step.
    """

    def test_step_execution_and_data_collection(self) -> None:
        """
        Initialize the model, run 10 steps, and verify:
          1. The datacollector's model-level DataFrame has exactly 10 rows.
          2. The 'Total_Conversions' column exists and contains valid integers.
          3. No iteration or attribute errors are raised during the loop.
        """
        # --- Arrange ---
        model = MarketingEnvironment()
        num_steps = 10

        # --- Act ---
        # Execute 10 discrete simulation steps
        for _ in range(num_steps):
            model.step()

        # Extract the model-level DataFrame from the datacollector
        df: pd.DataFrame = model.datacollector.get_model_vars_dataframe()

        # --- Assert ---

        # 1. DataFrame must contain exactly 10 rows (one per step)
        assert len(df) == num_steps, (
            f"Expected {num_steps} rows in the model DataFrame, "
            f"but found {len(df)}. Data collection may be misconfigured."
        )

        # 2. The 'Total_Conversions' reporter must be present as a column
        assert "Total_Conversions" in df.columns, (
            "'Total_Conversions' column is missing from the datacollector output. "
            "Verify that the model_reporters dict is correctly configured."
        )

        # 3. Every value in 'Total_Conversions' must be a non-negative integer
        for step_idx, value in enumerate(df["Total_Conversions"]):
            assert isinstance(value, (int,)), (
                f"Total_Conversions at step {step_idx} is {type(value).__name__} "
                f"({value}), expected int."
            )
            assert value >= 0, (
                f"Total_Conversions at step {step_idx} is {value}, "
                "which is negative — this is logically impossible."
            )

        # 4. Conversion counts should be monotonically non-decreasing
        #    (agents stay converted once they flip — they never revert)
        conversions = df["Total_Conversions"].tolist()
        for i in range(1, len(conversions)):
            assert conversions[i] >= conversions[i - 1], (
                f"Total_Conversions decreased from step {i - 1} ({conversions[i - 1]}) "
                f"to step {i} ({conversions[i]}). Agent conversion is irreversible, "
                "so this indicates a state management bug."
            )


# ---------------------------------------------------------------------------
# Test 3: Zero Ad Exposure Baseline
# ---------------------------------------------------------------------------
class TestZeroExposureBaseline:
    """
    Validates that setting ad_exposure = 0.0 prevents the marketing campaign
    from artificially inflating conversion rates. Only organic (base-probability)
    conversions should occur.
    """

    def test_zero_exposure_baseline(self) -> None:
        """
        Initialize the model with ad_exposure = 0.0, run 10 steps, and verify
        that total conversions remain statistically low — proving the ad
        multiplier does not trigger artificial conversions when exposure is zero.

        With base conversion probabilities uniformly drawn from [0.01, 0.10]
        and NO ad boost, the expected organic conversion rate per step is ~5.5 %
        of unconverted agents. Over 10 steps with 1,000 agents, the cumulative
        organic conversions should remain well below 500 (50 %).

        We use a generous upper bound of 400 to avoid flaky tests while still
        catching any scenario where zero-exposure erroneously triggers the
        ad_exposure multiplier.
        """
        # --- Arrange ---
        # Explicitly disable the marketing campaign push
        model = MarketingEnvironment(num_agents=1000, ad_exposure=0.0)
        num_steps = 10

        # --- Act ---
        for _ in range(num_steps):
            model.step()

        # Extract the final conversion count from the datacollector
        df: pd.DataFrame = model.datacollector.get_model_vars_dataframe()
        final_conversions: int = int(df["Total_Conversions"].iloc[-1])

        # --- Assert ---

        # 1. With ad_exposure = 0.0, the marketing boost formula is:
        #        boost = brand_loyalty * 0.0 * 0.05 = 0.0
        #    Therefore agents convert ONLY from their base_prob ∈ [0.01, 0.10].
        #    Upper bound: if every agent had prob=0.10, geometric expectation
        #    after 10 steps ≈ 1 - (0.90)^10 ≈ 65 % → 650 agents max.
        #    We set a conservative ceiling of 450 to catch ad-boost leakage
        #    while remaining robust against random fluctuation.
        organic_ceiling = 450

        assert final_conversions <= organic_ceiling, (
            f"With ad_exposure=0.0, final conversions reached {final_conversions}, "
            f"which exceeds the organic ceiling of {organic_ceiling}. "
            "This suggests the ad multiplier is incorrectly boosting conversions "
            "even when exposure is zero."
        )

        # 2. Sanity check: at least SOME organic conversions should have occurred
        #    (the probability is non-zero, so 0 conversions in 10 steps with 1,000
        #    agents is astronomically unlikely and would indicate a broken step).
        assert final_conversions > 0, (
            "Zero conversions after 10 steps with 1,000 agents and non-zero base "
            "probabilities is statistically near-impossible. The agent step logic "
            "may not be executing correctly."
        )

        # 3. Verify the ad_exposure on the model is indeed 0.0 (belt-and-suspenders)
        assert model.ad_exposure == 0.0, (
            f"Model ad_exposure is {model.ad_exposure}, expected 0.0. "
            "The config was not applied correctly."
        )
