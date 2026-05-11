"""Reusable adapter that keeps FastAPI imports out of model training code."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

from src.inference.service import PredictionService


class FastApiPredictionFacade:
    """
    Lightweight wrapper so FastAPI routers can stay thin (`Depends` only).

    The heavy lifting lives inside `PredictionService`, which encapsulates sklearn + SHAP.
    """

    def __init__(self, service: PredictionService) -> None:
        self._service = service

    @classmethod
    def from_paths(
        cls,
        model_path: Path,
        metadata_path: Path | None = None,
        background_parquet: Path | None = None,
        *,
        background_rows: int = 400,
        random_state: int = 42,
    ) -> FastApiPredictionFacade:
        bg_frame: pd.DataFrame | None = None
        if background_parquet and background_parquet.exists():
            frame = pd.read_parquet(background_parquet)
            meta_path = metadata_path or model_path.with_name(f"{model_path.stem}_metadata.json")
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                target_col = meta.get("target_column")
                if target_col and target_col in frame.columns:
                    frame = frame.drop(columns=[target_col])
            sample_n = min(background_rows, len(frame))
            bg_frame = frame.sample(n=sample_n, random_state=random_state)
        max_bg = min(200, len(bg_frame) if bg_frame is not None else 0)
        service = PredictionService(
            model_path,
            metadata_path=metadata_path,
            shap_background_frame=bg_frame,
            max_background_samples=max_bg or 1,
            random_state=random_state,
        )
        return cls(service)

    def predict_batch_payload(self, records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
        return list(self._service.explain_batch(records))

    def predict_json_row(self, record: dict[str, Any]) -> dict[str, Any]:
        return self._service.explain_row(record, include_shap=True)["shap"]
