#!/usr/bin/env python3
"""
CLI inference helper that echoes JSON forecasts + SHAP structures.

Examples:

    type sample_campaign.json | python predict.py --stdin
    python predict.py --input sample_campaign.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.inference.service import PredictionService, deduce_metadata_path  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run offline inference + SHAP packaging.")
    parser.add_argument("--input", type=Path, help="JSON array of dict rows or {\"records\": [...]}.")
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Read JSON payload from stdin instead of --input.",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path(os.environ.get("PE_MODEL_PATH", "models/xgb_pipeline.joblib")),
        help="Serialized sklearn Pipeline (default PE_MODEL_PATH).",
    )
    parser.add_argument(
        "--metadata",
        type=Path,
        default=None,
        help="Optional metadata JSON path; defaults to <stem>_metadata.json beside the model.",
    )
    parser.add_argument(
        "--no-shap",
        action="store_true",
        help="Skip SHAP calculations (faster, no background data needed).",
    )
    parser.add_argument(
        "--background-parquet",
        type=Path,
        default=Path(os.environ.get("PE_BACKGROUND_PARQUET", "data/processed/train.parquet")),
        help="Parquet with feature columns for SHAP background sampling.",
    )
    parser.add_argument(
        "--background-rows",
        type=int,
        default=400,
        help="How many rows to sample from the background parquet for TreeExplainer.",
    )
    return parser.parse_args()


def load_payload(raw: str) -> list[dict[str, Any]]:
    data = json.loads(raw)
    if isinstance(data, dict) and "records" in data:
        records = data["records"]
    else:
        records = data
    if not isinstance(records, list):
        raise ValueError("JSON input must be a list of objects or {\"records\": [...]}.")
    return [dict(row) for row in records]


def main() -> None:
    args = parse_args()

    if args.stdin:
        raw = sys.stdin.read()
    elif args.input:
        raw = Path(args.input).read_text(encoding="utf-8")
    else:
        raise SystemExit("Provide --input path.json or --stdin with JSON payload.")

    records = load_payload(raw)

    model_path = args.model.expanduser()
    meta_path_bg = (
        args.metadata.expanduser()
        if args.metadata
        else deduce_metadata_path(model_path)
    )

    bg_frame: pd.DataFrame | None = None
    if not args.no_shap:
        parquet_path = args.background_parquet.expanduser()
        if not parquet_path.exists():
            raise FileNotFoundError(
                f"Background parquet missing at {parquet_path}. Train first or pass --no-shap."
            )
        frame = pd.read_parquet(parquet_path)
        if meta_path_bg.exists():
            meta = json.loads(meta_path_bg.read_text(encoding="utf-8"))
            target_col = meta.get("target_column")
            if target_col and target_col in frame.columns:
                frame = frame.drop(columns=[target_col])
        sample_n = min(args.background_rows, len(frame))
        bg_frame = frame.sample(n=sample_n, random_state=int(os.environ.get("PE_RANDOM_STATE", "42")))

    max_bg = min(200, len(bg_frame) if bg_frame is not None else 0)
    service = PredictionService(
        model_path,
        metadata_path=args.metadata.expanduser() if args.metadata else None,
        shap_background_frame=bg_frame,
        max_background_samples=max_bg or 1,
        random_state=int(os.environ.get("PE_RANDOM_STATE", "42")),
    )

    if args.no_shap:
        preds = service.predict_records(records)
        outputs = []
        for rec, pred in zip(records, preds, strict=True):
            band = service.heuristic_band(pred)
            outputs.append(
                {
                    "input": rec,
                    "prediction": pred,
                    "approx_residual_band_tutorial": band,
                    "confidence_note": band["note"],
                }
            )
    else:
        outputs = []
        for rec in records:
            outputs.append({"input": rec, **service.explain_row(rec, include_shap=True)})

    print(json.dumps({"results": outputs}, indent=2))


if __name__ == "__main__":
    main()
