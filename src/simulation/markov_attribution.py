import logging
from typing import Dict, List

import numpy as np
import pandas as pd

# Configure module-level logger for defensive programming
logger = logging.getLogger(__name__)


def build_transition_matrix(journeys: List[List[str]]) -> pd.DataFrame:
    """
    Builds a Markov Chain transition matrix from a list of user journeys.

    This function calculates the empirical transition probabilities between
    all unique states (channels), ensuring that 'Start', 'Conversion',
    and 'Null' are correctly represented. 'Conversion' and 'Null' are
    forced to be absorbing states.

    Args:
        journeys (List[List[str]]): A list of customer journeys, where each
            journey is a list of channel strings (e.g., ['Meta', 'Google', 'Conversion']).

    Returns:
        pd.DataFrame: A transition matrix containing transition probabilities
            between all identified states.
    """
    try:
        transitions: Dict[str, Dict[str, float]] = {}
        states = {'Start', 'Conversion', 'Null'}

        # Process each journey to count transitions
        for journey in journeys:
            # Ensure 'Start' is the first node if not already provided
            path = journey
            if not path or path[0] != 'Start':
                path = ['Start'] + path

            for i in range(len(path) - 1):
                curr_state = path[i]
                next_state = path[i + 1]
                
                states.add(curr_state)
                states.add(next_state)

                if curr_state not in transitions:
                    transitions[curr_state] = {}
                if next_state not in transitions[curr_state]:
                    transitions[curr_state][next_state] = 0
                transitions[curr_state][next_state] += 1

        # Create an empty DataFrame for the transition matrix
        states_list = sorted(list(states))
        matrix = pd.DataFrame(0.0, index=states_list, columns=states_list)

        # Populate the matrix with transition probabilities
        for curr_state, next_states in transitions.items():
            total_transitions = sum(next_states.values())
            if total_transitions > 0:
                for next_state, count in next_states.items():
                    matrix.loc[curr_state, next_state] = count / total_transitions

        # Handle any transient states that have no outgoing transitions (dead ends)
        for state in states_list:
            if matrix.loc[state].sum() == 0:
                matrix.loc[state, 'Null'] = 1.0

        # Enforce absorbing states for terminal outcomes
        for terminal_state in ['Conversion', 'Null']:
            matrix.loc[terminal_state, :] = 0.0
            matrix.loc[terminal_state, terminal_state] = 1.0

        return matrix

    except Exception as e:
        logger.error(f"Failed to build transition matrix: {e}", exc_info=True)
        raise


def _calculate_conversion_probability(matrix: pd.DataFrame) -> float:
    """
    Helper function to calculate the probability of absorption into 'Conversion'
    from the 'Start' state using the fundamental matrix.

    Args:
        matrix (pd.DataFrame): The transition matrix.

    Returns:
        float: The probability of reaching 'Conversion' from 'Start'.
    """
    states = list(matrix.index)
    transient_states = [s for s in states if s not in ['Conversion', 'Null']]
    absorbing_states = ['Conversion', 'Null']

    # If 'Start' is somehow missing or absorbing, return 0.0
    if 'Start' not in transient_states:
        return 0.0

    # Partition the matrix into transient and absorbing sections
    reordered_states = transient_states + absorbing_states
    P = matrix.loc[reordered_states, reordered_states]

    t = len(transient_states)
    Q = P.iloc[:t, :t].values
    R = P.iloc[:t, t:].values

    I = np.eye(t)
    
    try:
        # Fundamental matrix: N = (I - Q)^-1
        N = np.linalg.inv(I - Q)
    except np.linalg.LinAlgError:
        logger.warning("Singular matrix encountered during inversion. Falling back to matrix exponentiation.")
        # Fallback for ill-conditioned matrices (e.g. pure loops without escape)
        P_power = np.linalg.matrix_power(matrix.values, 50)
        start_idx = states.index('Start')
        conv_idx = states.index('Conversion')
        return float(P_power[start_idx, conv_idx])

    # Absorption probabilities: B = N * R
    B = np.dot(N, R)

    start_idx = transient_states.index('Start')
    
    # The columns of B correspond to the ordered absorbing states
    try:
        conv_idx = absorbing_states.index('Conversion')
        return float(B[start_idx, conv_idx])
    except ValueError:
        return 0.0


def calculate_removal_effect(transition_matrix: pd.DataFrame) -> Dict[str, float]:
    """
    Calculates the removal effect for each marketing channel.

    The removal effect is computed by measuring the baseline conversion
    probability from the 'Start' state, and then iteratively removing each
    channel (redirecting all its outbound traffic to 'Null') to see the
    percentage drop in the new conversion probability.

    Args:
        transition_matrix (pd.DataFrame): The original Markov transition matrix.

    Returns:
        Dict[str, float]: A dictionary mapping each channel name to its 
            Removal Effect percentage (e.g., 0.25 means a 25% drop).
    """
    try:
        baseline_prob = _calculate_conversion_probability(transition_matrix)
        
        # If the baseline probability is zero, no channel contributes to conversion
        if baseline_prob == 0.0:
            logger.warning("Baseline conversion probability is 0.0. Removal effects will be empty.")
            return {}

        channels = [c for c in transition_matrix.index if c not in ['Start', 'Conversion', 'Null']]
        removal_effects: Dict[str, float] = {}

        for channel in channels:
            # Create a modified environment where the channel is "removed"
            modified_matrix = transition_matrix.copy()
            
            # Redirect all outbound traffic from the removed channel to 'Null'
            modified_matrix.loc[channel, :] = 0.0
            modified_matrix.loc[channel, 'Null'] = 1.0

            # Recalculate conversion probability without this channel
            new_prob = _calculate_conversion_probability(modified_matrix)

            # Record the percentage drop in conversion probability
            drop = (baseline_prob - new_prob) / baseline_prob
            
            # Ensure no negative drops due to floating point inaccuracies
            removal_effects[channel] = max(0.0, float(drop))

        return removal_effects

    except Exception as e:
        logger.error(f"Failed to calculate removal effects: {e}", exc_info=True)
        raise
