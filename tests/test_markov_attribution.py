import pytest
import numpy as np
import pandas as pd
from src.simulation.markov_attribution import build_transition_matrix, calculate_removal_effect


def test_matrix_fallback_infinite_loop():
    """
    Test that an inescapable infinite loop between channels (without reaching Conversion or Null)
    does not cause a np.linalg.LinAlgError during inversion, but instead triggers
    the defensive matrix exponentiation fallback.
    """
    # Create a mock dataset that forms a perfect loop without reaching Conversion.
    # The built transition matrix will have a sub-matrix Q where (I - Q) is singular.
    journeys = [
        ['Channel_A', 'Channel_B', 'Channel_A', 'Channel_B', 'Channel_A']
    ]
    
    matrix = build_transition_matrix(journeys)
    
    try:
        # Run the removal effect calculation.
        # This will attempt to invert the fundamental matrix, hit a LinAlgError,
        # catch it, print a warning, and use np.linalg.matrix_power as fallback.
        # It should complete successfully without raising an exception to the caller.
        removal_effects = calculate_removal_effect(matrix)
        
        # In this specific case, since Conversion is completely unreachable from Start,
        # baseline probability is 0.0, and removal effects should return an empty dict.
        assert isinstance(removal_effects, dict)
        
    except np.linalg.LinAlgError:
        pytest.fail("LinAlgError was not handled by the fallback mechanism.")
    except Exception as e:
        pytest.fail(f"An unexpected exception occurred: {e}")


def test_removal_effect_absolute_bottleneck():
    """
    Test a scenario where all successful converting journeys must absolutely pass 
    through a specific bottleneck channel ('Meta'). Removing this channel 
    should result in a removal effect of exactly 1.0 (100% drop in conversions).
    """
    # Mock dataset with top-of-funnel channels, but all must go through 'Meta'.
    journeys = [
        ['Start', 'Google', 'Meta', 'Conversion'],
        ['Start', 'TikTok', 'Meta', 'Conversion']
    ]
    
    matrix = build_transition_matrix(journeys)
    removal_effects = calculate_removal_effect(matrix)
    
    # Check that Meta exists in the output
    assert 'Meta' in removal_effects, "'Meta' should be in the evaluated channels."
    
    # Assert that the removal effect score for 'Meta' is exactly 1.0
    # Floating point precision requires np.isclose or similar, but exactly 1.0 is expected conceptually.
    assert np.isclose(removal_effects['Meta'], 1.0), f"Expected 'Meta' to have exactly 1.0 removal effect, got {removal_effects['Meta']}"
    
    # Note: Google and TikTok will also have removal effects > 0, depending on baseline prob.,
    # but Meta is the absolute bottleneck so removing it mathematically zeros out conversions.
