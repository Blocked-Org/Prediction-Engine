"""Offline inference + SHAP packaging for CLI and future APIs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

import joblib
import numpy as np
import pandas as pd

from src.explainability.shap_tools import ShapExplanationEngine


def deduce_metadata_path(model_path: Path) -> Path:
    """Locate JSON sidecar beside the serialized pipeline (``<stem>_metadata.json``)."""
    return model_path.with_name(f"{model_path.stem}_metadata.json")


class PredictionService:
    """
    Load a trained sklearn Pipeline plus training metadata produced by ``train.py``.

    Exposes batch prediction and SHAP explanations without inventing natural-language stories.
    """

    def __init__(
        self,
        model_path: Path | str,
        metadata_path: Optional[Path | str] = None,
        *,
        shap_background_frame: Optional[pd.DataFrame] = None,
        max_background_samples: int = 200,
        random_state: int = 42,
    ) -> None:
        self.model_path = Path(model_path)
        inferred_meta = deduce_metadata_path(self.model_path)
        self.metadata_path = Path(metadata_path) if metadata_path else inferred_meta
        self.pipeline = joblib.load(self.model_path)

        meta_raw = Path(self.metadata_path).read_text(encoding="utf-8") if Path(self.metadata_path).exists() else "{}"
        payload = json.loads(meta_raw) if meta_raw.strip() else {}
        self.metadata: dict[str, Any] = payload
        residual_block = payload.get("residual_dispersion_val") or payload.get(
            "residual_dispersion", {}
        )
        self.val_mae_heuristic = float(residual_block.get("mae", payload.get("val_mae", 0.0)))
        self.approx_z = float(payload.get("approx_heuristic_z_95", 1.96))

        def _fallback_mae() -> float:
            met = payload.get("metrics") or {}
            cand = met.get("val_candidate_model_before_merge") or met.get("validation") or {}
            return float(cand.get("mae", 0.0))

        if self.val_mae_heuristic == 0.0:
            self.val_mae_heuristic = _fallback_mae()

        self.feature_columns: list[str] = list(
            payload.get("feature_columns") or self._guess_feature_columns()
        )

        self._shap_engine: Optional[ShapExplanationEngine] = None
        if shap_background_frame is not None and len(shap_background_frame) > 0:
            self._shap_engine = ShapExplanationEngine(
                pipeline=self.pipeline,
                background_x=shap_background_frame,
                max_background_samples=max_background_samples,
                random_state=random_state,
            )

    def _guess_feature_columns(self) -> list[str]:
        pre = self.pipeline.named_steps.get("preprocessing")
        ct = getattr(pre, "named_steps", {}).get("column_prep") if hasattr(pre, "named_steps") else None
        if ct is None:
            return []
        transformers = getattr(ct, "transformers_", None)
        if not transformers:
            return []
        num_cols = list(transformers[0][2])
        cat_cols = list(transformers[1][2])
        return list(dict.fromkeys([*num_cols, *cat_cols]))

    def predict_dataframe(self, frame: pd.DataFrame) -> np.ndarray:
        missing = [c for c in self.feature_columns if c not in frame.columns]
        if missing:
            raise KeyError(f"Input missing required feature columns: {missing!r}")
        ordered = frame[self.feature_columns]
        return np.asarray(self.pipeline.predict(ordered), dtype=float)

    def predict_records(self, records: Iterable[Mapping[str, Any]]) -> list[float]:
        frame = pd.DataFrame(list(records))
        return [float(x) for x in self.predict_dataframe(frame)]

    def heuristic_band(self, prediction: float) -> dict[str, Any]:
        half_width = float(self.approx_z * self.val_mae_heuristic)
        return {
            "lower": prediction - half_width,
            "upper": prediction + half_width,
            "z": self.approx_z,
            "mae_prior": float(self.val_mae_heuristic),
            "note": (
                "Heuristic symmetric band from validation MAE; not calibrated predictive uncertainty."
            ),
        }

    def explain_row(
        self,
        record: Mapping[str, Any],
        *,
        include_shap: bool = True,
    ) -> dict[str, Any]:
        """Return prediction + optional SHAP-derived structures."""
        frame = pd.DataFrame([dict(record)])
        preds = self.predict_dataframe(frame)
        pred = float(preds[0])
        band = self.heuristic_band(pred)

        result: dict[str, Any] = {
            "prediction": pred,
            "approx_residual_band_tutorial": band,
            "confidence_note": band["note"],
        }

        if include_shap:
            if self._shap_engine is None:
                raise RuntimeError(
                    "SHAP explanations require shap_background_frame when constructing PredictionService."
                )
            result["shap"] = self._shap_engine.explain(frame.iloc[[0]][self.feature_columns])
        return result

    def explain_batch(self, records: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
        return [self.explain_row(rec, include_shap=True) for rec in records]
