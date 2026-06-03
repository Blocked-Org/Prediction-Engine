"""
Configurable demographic heuristics for the ABM simulation.

Maps frontend user inputs (age, gender, interest) to weighted agent population
distributions. Extracted from abm_engine.py to allow easy tuning without
modifying core simulation logic.

These weights are designed for the Bangladeshi SME e-commerce market.
Adjust them based on market research as the product evolves.
"""

from __future__ import annotations



# ──────────────────────────────────────────────────────────────────────────── #
# Canonical ABM segments — referenced by name across the engine
# ──────────────────────────────────────────────────────────────────────────── #
SEGMENTS = ["gen_z_student", "urban_millennial", "suburban_family", "rural"]


# ──────────────────────────────────────────────────────────────────────────── #
# Base weights indexed by age range → segment probability
# ──────────────────────────────────────────────────────────────────────────── #
AGE_WEIGHT_MAP: dict[str, dict[str, float]] = {
    # age range → {segment: probability}
    "18-24": {"gen_z_student": 0.60, "urban_millennial": 0.25, "suburban_family": 0.05, "rural": 0.10},
    "25-29": {"gen_z_student": 0.20, "urban_millennial": 0.50, "suburban_family": 0.15, "rural": 0.15},
    "25-34": {"gen_z_student": 0.15, "urban_millennial": 0.50, "suburban_family": 0.20, "rural": 0.15},
    "30-34": {"gen_z_student": 0.10, "urban_millennial": 0.45, "suburban_family": 0.25, "rural": 0.20},
    "35-39": {"gen_z_student": 0.05, "urban_millennial": 0.25, "suburban_family": 0.45, "rural": 0.25},
    "35-44": {"gen_z_student": 0.05, "urban_millennial": 0.20, "suburban_family": 0.50, "rural": 0.25},
    "40-44": {"gen_z_student": 0.05, "urban_millennial": 0.15, "suburban_family": 0.50, "rural": 0.30},
    "45-49": {"gen_z_student": 0.02, "urban_millennial": 0.13, "suburban_family": 0.40, "rural": 0.45},
    "45-54": {"gen_z_student": 0.02, "urban_millennial": 0.13, "suburban_family": 0.40, "rural": 0.45},
    "50+":   {"gen_z_student": 0.02, "urban_millennial": 0.08, "suburban_family": 0.35, "rural": 0.55},
    "55+":   {"gen_z_student": 0.02, "urban_millennial": 0.08, "suburban_family": 0.35, "rural": 0.55},
}


# ──────────────────────────────────────────────────────────────────────────── #
# Gender modifiers: applied as multiplicative shifts on top of age weights.
# Values > 1.0 boost the segment; < 1.0 suppress it.
# ──────────────────────────────────────────────────────────────────────────── #
GENDER_MODIFIERS: dict[str, dict[str, float]] = {
    "M": {"gen_z_student": 1.05, "urban_millennial": 1.10, "suburban_family": 0.90, "rural": 0.95},
    "F": {"gen_z_student": 1.00, "urban_millennial": 0.95, "suburban_family": 1.10, "rural": 0.95},
}


# ──────────────────────────────────────────────────────────────────────────── #
# Interest modifiers: secondary adjustments based on audience interest vertical.
# ──────────────────────────────────────────────────────────────────────────── #
INTEREST_MODIFIERS: dict[str, dict[str, float]] = {
    "Travel":  {"gen_z_student": 0.90, "urban_millennial": 1.15, "suburban_family": 1.00, "rural": 0.95},
    "Sports":  {"gen_z_student": 1.10, "urban_millennial": 1.05, "suburban_family": 0.95, "rural": 0.90},
    "Tech":    {"gen_z_student": 1.15, "urban_millennial": 1.10, "suburban_family": 0.85, "rural": 0.90},
    "Fashion": {"gen_z_student": 1.10, "urban_millennial": 1.05, "suburban_family": 1.00, "rural": 0.85},
    "Food":    {"gen_z_student": 0.95, "urban_millennial": 0.95, "suburban_family": 1.10, "rural": 1.00},
}

# Default (uniform) fallback when an input does not match any key above.
UNIFORM_WEIGHTS: dict[str, float] = {seg: 1.0 / len(SEGMENTS) for seg in SEGMENTS}


def compute_segment_weights(
    age: str,
    gender: str,
    interest: str,
) -> dict[str, float]:
    """
    Compute normalized segment probability weights from user demographics.

    The function applies three layers:
    1. **Age base weights** — primary distribution driver.
    2. **Gender modifier** — multiplicative shift (±5-10%).
    3. **Interest modifier** — multiplicative shift (±5-15%).

    Weights are then re-normalized to sum to 1.0.

    Args:
        age: Age range string (e.g. "18-24", "25-29", "35-44").
        gender: "M" or "F".
        interest: Interest vertical (e.g. "Travel", "Tech").

    Returns:
        dict mapping segment name → probability weight (sums to 1.0).
    """
    # 1. Start from age base weights (fall back to uniform if unknown age)
    base = dict(AGE_WEIGHT_MAP.get(age, UNIFORM_WEIGHTS))

    # 2. Apply gender modifier
    g_mod = GENDER_MODIFIERS.get(gender, {seg: 1.0 for seg in SEGMENTS})
    for seg in SEGMENTS:
        base[seg] *= g_mod.get(seg, 1.0)

    # 3. Apply interest modifier
    i_mod = INTEREST_MODIFIERS.get(interest, {seg: 1.0 for seg in SEGMENTS})
    for seg in SEGMENTS:
        base[seg] *= i_mod.get(seg, 1.0)

    # 4. Re-normalize so weights sum to 1.0
    total = sum(base.values())
    if total > 0:
        return {seg: w / total for seg, w in base.items()}
    return dict(UNIFORM_WEIGHTS)
