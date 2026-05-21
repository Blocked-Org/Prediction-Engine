"""SHAP TreeExplainer utilities and matplotlib artifacts (no synthetic prose)."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping

import numpy as np
import pandas as pd
import shap
from matplotlib import pyplot as plt
from sklearn.pipeline import Pipeline


def _transform_features(pipeline: Pipeline, X: pd.DataFrame | np.ndarray) -> np.ndarray:
    pre = pipeline.named_steps["preprocessing"]
    return np.asarray(pre.transform(X))


def get_feature_names(pipeline: Pipeline) -> np.ndarray:
    pre = pipeline.named_steps["preprocessing"]
    return np.asarray(pre.get_feature_names_out(), dtype=str)


class ShapExplanationEngine:
    """
    Thin wrapper around shap.TreeExplainer for sklearn XGBRegressor.

    TreeExplainer is fit with a bounded background dataset for scalable interventional
    approximations; see README for methodological caveats.
    """

    def __init__(
        self,
        pipeline: Pipeline,
        background_x: pd.DataFrame,
        max_background_samples: int = 200,
        random_state: int = 42,
    ) -> None:
        self.pipeline = pipeline
        self.background_x = background_x
        self.max_background_samples = int(max_background_samples)
        self.random_state = int(random_state)

        rng = np.random.default_rng(int(random_state))
        bg_frame = pd.DataFrame(background_x)
        n = len(bg_frame)
        if n > self.max_background_samples:
            bg_frame = bg_frame.sample(n=self.max_background_samples, random_state=rng)

        bg_matrix = _transform_features(self.pipeline, bg_frame)
        self.feature_names_: np.ndarray = get_feature_names(self.pipeline)

        self.explainer = shap.TreeExplainer(
            pipeline.named_steps["regressor"],
            data=bg_matrix,
            feature_perturbation="interventional",
        )

    def explain(
        self,
        x_row: pd.DataFrame | Mapping[str, Any],
    ) -> dict[str, Any]:
        """Return SHAP-derived structures for a single row (no natural-language generation)."""
        frame = x_row if isinstance(x_row, pd.DataFrame) else pd.DataFrame([dict(x_row)])
        x_t = _transform_features(self.pipeline, frame)
        shap_vals_raw = np.asarray(self.explainer.shap_values(x_t), dtype=float)
        if shap_vals_raw.ndim == 1:
            shap_vals_mat = shap_vals_raw.reshape(1, -1)
        else:
            shap_vals_mat = shap_vals_raw

        expected = np.asarray(self.explainer.expected_value, dtype=float)
        if isinstance(expected, np.ndarray) and expected.size > 1:
            raise ValueError(
                "SHAP regression expected value unexpectedly multi-output; downgrade XGBoost/SHAP or adjust config."
            )
        base_val = expected.item() if expected.size == 1 else float(expected)
        contrib = np.ravel(shap_vals_mat[0])
        if contrib.shape[0] != self.feature_names_.shape[0]:
            raise AssertionError(
                f"Mismatch between SHAP length {contrib.shape} and "
                f"feature_names {self.feature_names_.shape[0]}."
            )

        shap_series = contrib
        preds = pipeline_predict_raw(self.pipeline, frame)
        margin = preds[0] - base_val
        # SHAP decomposition + constant should align with model margin (trees; minor float noise).
        sum_check = dict(
            prediction=float(np.ravel(preds)[0]),
            base_value=float(base_val),
            sum_shap=np.float64(float(np.sum(shap_series))),
            margin=np.float64(margin),
            residual_sum_shap_vs_margin=float(margin - float(np.sum(shap_series))),
        )

        feats = [(name, float(val)) for name, val in zip(self.feature_names_.tolist(), shap_series)]

        positive_only = [t for t in feats if t[1] > 0.0]
        negative_only = [t for t in feats if t[1] < 0.0]
        feats_sorted_positive = sorted(positive_only, key=lambda t: t[1], reverse=True)
        feats_sorted_negative = sorted(negative_only, key=lambda t: t[1])

        return {
            "prediction": float(np.ravel(preds)[0]),
            "base_value": float(base_val),
            "shap_values": {k: v for k, v in feats},
            "top_positive_contributions": feats_sorted_positive[:10],
            "top_negative_contributions": feats_sorted_negative[:10],
            "sum_shap_approx_check": sum_check,
        }


def pipeline_predict_raw(pipeline: Pipeline, X: pd.DataFrame) -> np.ndarray:
    """Mirror sklearn predict but keep explicit feature order handling."""
    return np.asarray(pipeline.predict(X), dtype=float)


def save_summary_bar_plot(
    engine: ShapExplanationEngine,
    sample_x: pd.DataFrame,
    out_path: Path,
    max_display: int = 20,
) -> None:
    """Write a SHAP summary bar chart to disk."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    x_t = _transform_features(engine.pipeline, sample_x)
    shap_vals = np.asarray(engine.explainer.shap_values(x_t), dtype=float)
    plt.figure(figsize=(12, max(4, max_display // 5)))
    shap.summary_plot(
        shap_vals,
        features=x_t,
        feature_names=engine.feature_names_.tolist(),
        plot_type="bar",
        max_display=max_display,
        show=False,
    )
    plt.tight_layout()
    plt.savefig(out_path, dpi=140, bbox_inches="tight")
    plt.close()


def save_waterfall_plot(
    engine: ShapExplanationEngine,
    x_row: pd.DataFrame | Mapping[str, Any],
    out_path: Path,
    max_display: int = 20,
) -> None:
    """Write a waterfall plot for a single transformed instance."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    frame = x_row if isinstance(x_row, pd.DataFrame) else pd.DataFrame([dict(x_row)])
    x_t = _transform_features(engine.pipeline, frame)
    sv = np.asarray(engine.explainer.shap_values(x_t), dtype=float)
    sv_row = np.ravel(sv) if sv.ndim == 1 else np.ravel(sv[0])
    base_expected = np.ravel(engine.explainer.expected_value)[0]
    feats = np.ravel(np.asarray(x_t[0]))

    waterfall_expl = shap.Explanation(
        values=sv_row,
        base_values=float(base_expected),
        data=feats,
        feature_names=engine.feature_names_.tolist(),
    )
    plt.figure()
    plotted = False
    plots_ns = getattr(shap, "plots", None)
    if plots_ns is not None and hasattr(plots_ns, "waterfall"):
        plots_ns.waterfall(waterfall_expl, max_display=max_display, show=False)
        plotted = True
    elif hasattr(shap, "waterfall_plot"):
        shap.waterfall_plot(waterfall_expl, max_display=max_display, show=False)
        plotted = True
    if not plotted:
        order = np.argsort(np.abs(sv_row))[::-1][:max_display]
        picked_names = np.asarray(engine.feature_names_)[order]
        picked_vals = sv_row[order]
        plt.barh(np.arange(len(picked_vals)), picked_vals.astype(float)[::-1])
        plt.yticks(np.arange(len(picked_vals))[::-1], list(picked_names[::-1]))
        plt.axvline(0.0, color="#333333", linewidth=0.8)
        plt.title("Approximate waterfall fallback (matplotlib bar of SHAP contributions)")
    plt.tight_layout()
    plt.savefig(out_path, dpi=140, bbox_inches="tight")
    plt.close()


# ---------------------------------------------------------------------------
# LLM-oriented formatting
# ---------------------------------------------------------------------------


def format_shap_for_llm(shap_values_dict: dict[str, Any]) -> str:
    """Convert the output of ``ShapExplanationEngine.explain()`` into strict
    markdown suitable for injection into an LLM system prompt.

    The returned string contains:
    * Model prediction and base value
    * Top positive drivers with absolute SHAP units and percentage of total
      variance explained
    * Top negative suppressors in the same format

    Parameters
    ----------
    shap_values_dict:
        Dict with keys ``prediction``, ``base_value``, ``shap_values``,
        ``top_positive_contributions``, and ``top_negative_contributions``
        as produced by :meth:`ShapExplanationEngine.explain`.

    Returns
    -------
    str
        Markdown-formatted SHAP attribution block.
    """
    prediction = shap_values_dict.get("prediction", 0.0)
    base_value = shap_values_dict.get("base_value", 0.0)
    all_shap: dict[str, float] = shap_values_dict.get("shap_values", {})

    total_abs = sum(abs(v) for v in all_shap.values()) or 1.0  # avoid div-by-zero

    top_pos: list[tuple[str, float] | list[Any]] = shap_values_dict.get(
        "top_positive_contributions", []
    )
    top_neg: list[tuple[str, float] | list[Any]] = shap_values_dict.get(
        "top_negative_contributions", []
    )

    lines: list[str] = [
        "### SHAP Feature Attribution (Grounding Data)",
        f"**Model Prediction**: {prediction:,.4f}",
        f"**Base Value (population avg)**: {base_value:,.4f}",
        "",
    ]

    # Positive drivers
    if top_pos:
        lines.append("#### Top Positive Drivers")
        for item in top_pos:
            name, val = (item[0], item[1]) if isinstance(item, (list, tuple)) else ("?", 0.0)
            pct = abs(float(val)) / total_abs * 100
            lines.append(
                f"- **{name}**: +{pct:.1f}% of variance (+{float(val):,.4f} SHAP units)"
            )
        lines.append("")

    # Negative suppressors
    if top_neg:
        lines.append("#### Top Negative Suppressors")
        for item in top_neg:
            name, val = (item[0], item[1]) if isinstance(item, (list, tuple)) else ("?", 0.0)
            pct = abs(float(val)) / total_abs * 100
            lines.append(
                f"- **{name}**: -{pct:.1f}% of variance ({float(val):,.4f} SHAP units)"
            )
        lines.append("")

    return "\n".join(lines)
