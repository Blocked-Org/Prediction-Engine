"""
Unit Test Suite for Engine 1 — Bayesian Marketing Mix Model (Macro Simulation).

This module validates the core mathematical transformations (adstock decay
and Hill saturation) and the cold-start behavior of the BayesianSimulationEngine.
All functions under test reside in `src.simulation.bayesian_mmm`.

Dependencies:
    - pytest
    - numpy (with numpy.testing for precise floating-point assertions)
    - pytensor (tensor evaluation via `.eval()`)
"""

import numpy as np
import numpy.testing as npt
import pytest
import pytensor.tensor as pt

from src.simulation.bayesian_mmm import (
    BayesianSimulationEngine,
    adstock_transformation,
    hill_function,
)


# ---------------------------------------------------------------------------
# Test 1: Adstock Decay Transformation
# ---------------------------------------------------------------------------
class TestAdstockDecay:
    """
    Validates the autoregressive adstock transformation.

    The adstock formula is:
        A_t = X_t + lambda_decay * A_{t-1}

    For a spend sequence [100.0, 0.0, 0.0] with lambda_decay = 0.8:
        A_0 = 100.0  + 0.8 * 0.0   = 100.0
        A_1 =   0.0  + 0.8 * 100.0 =  80.0
        A_2 =   0.0  + 0.8 * 80.0  =  64.0
    """

    def test_adstock_decay(self) -> None:
        """
        Feed a mock spend array with a single impulse followed by zeros.
        Assert that the carry-over decays geometrically at the given rate.
        """
        # --- Arrange ---
        # Raw media spend: single burst on day 0, then silence
        spend_input = np.array([100.0, 0.0, 0.0], dtype=np.float64)
        decay_rate = 0.8  # lambda parameter

        # Convert to PyTensor symbolic tensors (required by the function signature)
        spend_tensor = pt.as_tensor_variable(spend_input)
        lambda_tensor = pt.as_tensor_variable(decay_rate)

        # Expected output from the recursive formula
        expected_output = np.array([100.0, 80.0, 64.0], dtype=np.float64)

        # --- Act ---
        # Execute the symbolic graph and materialise a concrete NumPy array
        result_tensor = adstock_transformation(spend_tensor, lambda_tensor)
        result = result_tensor.eval()

        # --- Assert ---
        # Use numpy.testing for element-wise floating-point comparison
        # (default decimal=6, i.e. tolerance of 1e-6)
        npt.assert_almost_equal(
            result,
            expected_output,
            decimal=6,
            err_msg=(
                "Adstock decay output does not match the expected geometric "
                "carry-over series for spend=[100, 0, 0], lambda=0.8."
            ),
        )


# ---------------------------------------------------------------------------
# Test 2: Hill Saturation Function
# ---------------------------------------------------------------------------
class TestHillSaturation:
    """
    Validates the Hill (S-curve) saturation transformation.

    Hill formula: f(x) = x^S / (K^S + x^S)

    Key property: as x → ∞, f(x) → 1.0  (the theoretical asymptote).
    No finite spend should ever exceed or even reach 1.0.
    """

    def test_hill_saturation_upper_bound(self) -> None:
        """
        Feed an astronomically large budget value through the Hill function
        and assert that the output strictly remains ≤ 1.0.

        This proves the function exhibits diminishing returns and does NOT
        scale linearly with spend.
        """
        # --- Arrange ---
        # Half-saturation point: spend level producing 50 % of the max return
        K = 500.0
        # Shape parameter: controls steepness of the S-curve
        S = 2.0
        # An extremely large spend value (1 billion)
        massive_budget = 1_000_000_000

        spend_tensor = pt.as_tensor_variable(np.float64(massive_budget))
        K_tensor = pt.as_tensor_variable(np.float64(K))
        S_tensor = pt.as_tensor_variable(np.float64(S))

        # --- Act ---
        result_tensor = hill_function(spend_tensor, S_tensor, K_tensor)
        result = float(result_tensor.eval())

        # --- Assert ---
        # The Hill function's theoretical maximum is exactly 1.0.
        # Any finite input must produce a value strictly below 1.0 (or very
        # close due to floating-point precision, but never above).
        assert result <= 1.0, (
            f"Hill function returned {result}, which exceeds the theoretical "
            f"asymptote of 1.0 — the saturation guarantee is violated."
        )
        # Additionally, for such a large budget the output should be
        # extremely close to the asymptote (within machine epsilon).
        npt.assert_almost_equal(
            result,
            1.0,
            decimal=6,
            err_msg=(
                "For a massive budget the Hill output should approach but "
                "never exceed the theoretical asymptote of 1.0."
            ),
        )

    def test_hill_saturation_half_saturation_point(self) -> None:
        """
        When x == K, the Hill function should return exactly 0.5 (50 %),
        confirming the semantics of the half-saturation parameter.
        """
        # --- Arrange ---
        K = 500.0
        S = 2.0

        spend_tensor = pt.as_tensor_variable(np.float64(K))  # x == K
        K_tensor = pt.as_tensor_variable(np.float64(K))
        S_tensor = pt.as_tensor_variable(np.float64(S))

        # --- Act ---
        result = float(hill_function(spend_tensor, S_tensor, K_tensor).eval())

        # --- Assert ---
        npt.assert_almost_equal(
            result,
            0.5,
            decimal=6,
            err_msg="Hill(K, S, K) should return exactly 0.5 by definition.",
        )


# ---------------------------------------------------------------------------
# Test 3: Bayesian Cold Start — Empty Historical Data
# ---------------------------------------------------------------------------
class TestBayesianColdStart:
    """
    Validates that the BayesianSimulationEngine gracefully handles a
    cold-start scenario where no historical data is available.

    The engine must:
      1. Not raise ValueError, KeyError, or LinAlgError.
      2. Return a dictionary containing the default Bayesian priors /
         simulation results even when the input has 0 observations.
    """

    def test_bayesian_cold_start(self) -> None:
        """
        Initialize the engine, supply a budget allocation with valid
        channels but no historical DataFrame rows, and run the simulation.

        The `run_simulation` method internally builds a 1-step model using
        the provided budget allocation, so a cold-start is equivalent to
        providing only the budget dict with no prior trace data.
        """
        # --- Arrange ---
        engine = BayesianSimulationEngine()

        # A cold-start request: valid channels but the engine has never been
        # fit on historical data — only the prior is available.
        cold_start_request = {
            "budget_allocation": {
                "social_media": 5000.0,
                "search": 3000.0,
            }
        }

        # --- Act & Assert ---
        # The engine must NOT raise ValueError, KeyError, or
        # numpy.linalg.LinAlgError during a cold-start simulation.
        try:
            result = engine.run_simulation(cold_start_request)
        except (ValueError, KeyError, np.linalg.LinAlgError) as exc:
            pytest.fail(
                f"BayesianSimulationEngine raised {type(exc).__name__} during "
                f"cold-start simulation: {exc}"
            )

        # The result must be a well-formed dictionary with the expected keys
        assert isinstance(result, dict), (
            "run_simulation must return a dict."
        )

        expected_keys = {"projected_roi", "incremental_roas", "pareto_optimal_budgets"}
        assert expected_keys.issubset(result.keys()), (
            f"Missing keys in cold-start result. "
            f"Expected {expected_keys}, got {set(result.keys())}."
        )

        # projected_roi and incremental_roas should be numeric
        assert isinstance(result["projected_roi"], (int, float)), (
            "projected_roi must be a numeric value."
        )
        assert isinstance(result["incremental_roas"], (int, float)), (
            "incremental_roas must be a numeric value."
        )

        # pareto_optimal_budgets must be a non-empty list of budget dicts
        assert isinstance(result["pareto_optimal_budgets"], list), (
            "pareto_optimal_budgets must be a list."
        )
        assert len(result["pareto_optimal_budgets"]) > 0, (
            "pareto_optimal_budgets should contain at least one allocation."
        )
