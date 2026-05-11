#!/usr/bin/env python3
"""
Train an XGBoost regressor with sklearn preprocessing + optional SHAP diagnostics.

Run from the repo root with:

    python train.py --config configs/dataset.yaml
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.explainability.shap_tools import (  # noqa: E402
    save_summary_bar_plot,
    save_waterfall_plot,
    ShapExplanationEngine,
)
from src.preprocessing.config import load_dataset_config  # noqa: E402
from src.preprocessing.dataset_io import (  # noqa: E402
    build_xy,
    load_raw_dataframe,
    persist_processed_splits,
    stratified_splits,
)
from src.training.metrics import regression_metrics, residual_dispersion  # noqa: E402
from src.training.tune_train import (  # noqa: E402
    finalize_on_train_plus_val,
    save_training_artifact,
    tune_hyperparameters,
)


def metadata_path_for_model(model_path: Path) -> Path:
    return model_path.with_name(f"{model_path.stem}_metadata.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train marketing regression + XGBoost tuning.")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(os.environ.get("PE_CONFIG_PATH", "configs/dataset.yaml")),
        help="YAML config path (default: PE_CONFIG_PATH or configs/dataset.yaml).",
    )
    parser.add_argument(
        "--n-iter",
        type=int,
        default=20,
        help="RandomizedSearchCV iterations.",
    )
    parser.add_argument(
        "--skip-shap-plots",
        action="store_true",
        help="Skip writing SHAP diagnostics to artifacts/shap/.",
    )
    parser.add_argument(
        "--shap-background-rows",
        type=int,
        default=300,
        help="Rows sampled for TreeExplainer background data.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cfg = load_dataset_config(args.config.expanduser().resolve(), project_root=ROOT)

    target_override = os.environ.get("PE_TARGET_COLUMN")
    if target_override:
        cfg.target_column = target_override

    rng = int(cfg.random_state)
    raw_df = load_raw_dataframe(cfg, ROOT)
    X, y = build_xy(raw_df, cfg, target_override=target_override)

    X_train, y_train, X_val, y_val, X_test, y_test = stratified_splits(X, y, cfg)

    manifest_extra = {
        "source_config": str(args.config.resolve()),
        "target_column_resolved": cfg.target_column,
    }
    persist_processed_splits(
        X_train,
        y_train,
        X_val,
        y_val,
        X_test,
        y_test,
        cfg,
        cfg.target_column,
        extra_manifest=manifest_extra,
    )

    best_pipe, tuning_meta = tune_hyperparameters(
        X_train,
        y_train,
        cfg=cfg,
        n_iter=args.n_iter,
        random_state=rng,
        cv=3,
    )

    preds_val = best_pipe.predict(X_val)
    preds_test = best_pipe.predict(X_test)

    metrics_val_candidate = regression_metrics(np.asarray(y_val), np.asarray(preds_val))
    metrics_test_candidate = regression_metrics(np.asarray(y_test), np.asarray(preds_test))
    residual_stats = {
        **residual_dispersion(np.asarray(y_val), np.asarray(preds_val)),
        "mae": metrics_val_candidate["mae"],
    }

    final_pipe = finalize_on_train_plus_val(best_pipe, X_train, y_train, X_val, y_val)
    preds_test_final = final_pipe.predict(X_test)
    metrics_test_final = regression_metrics(np.asarray(y_test), np.asarray(preds_test_final))

    metrics_payload = {
        "val_candidate_model_before_merge": metrics_val_candidate,
        "test_candidate_model_before_merge": metrics_test_candidate,
        "test_final_model_after_merge": metrics_test_final,
    }

    model_path = Path(cfg.model_output_path)
    meta_path = metadata_path_for_model(model_path)

    tuning_meta_full = dict(tuning_meta)
    tuning_meta_full["candidate_metrics_reference"] = "Val residuals use the pre-merge estimator for calibrated heuristics."

    save_training_artifact(
        final_pipe,
        metrics_payload,
        residual_stats,
        cfg,
        tuning_meta_full,
        path_model=model_path,
        path_metadata=meta_path,
    )

    if not args.skip_shap_plots:
        background = pd.concat([X_train, X_val], axis=0).sample(
            n=min(args.shap_background_rows, len(X_train) + len(X_val)),
            random_state=rng,
        )
        engine = ShapExplanationEngine(
            pipeline=final_pipe,
            background_x=background,
            max_background_samples=min(200, len(background)),
            random_state=rng,
        )

        plots_dir = Path(os.environ.get("PE_ARTIFACTS_DIR", ROOT / "artifacts")) / "shap"
        sample_rows = pd.concat([X_train, X_val], axis=0).sample(
            n=min(400, len(X_train) + len(X_val)),
            random_state=rng + 1,
        )
        save_summary_bar_plot(
            engine,
            sample_rows,
            plots_dir / "summary_bar.png",
            max_display=20,
        )
        waterfall_seed = pd.concat([X_train, X_val], axis=0).iloc[[0]][cfg.feature_columns()]
        save_waterfall_plot(engine, waterfall_seed, plots_dir / "waterfall_example.png")


if __name__ == "__main__":
    main()
