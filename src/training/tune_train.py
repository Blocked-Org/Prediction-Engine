"""Hyperparameter tuning and persistence for sklearn + XGBoost."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import loguniform, randint, uniform
from sklearn.base import clone
from sklearn.model_selection import RandomizedSearchCV
from sklearn.pipeline import Pipeline
from xgboost import XGBRegressor

from src.preprocessing.config import DatasetConfig
from src.preprocessing.pipelines import build_feature_preprocessor


def build_model_pipeline(cfg: DatasetConfig, random_state: int) -> Pipeline:
    """Preprocessor (from YAML) plus XGBoost regressor."""
    preprocessor = build_feature_preprocessor(cfg)
    regressor = XGBRegressor(
        objective="reg:squarederror",
        random_state=int(random_state),
        tree_method="hist",
        n_estimators=500,
        n_jobs=-1,
    )
    return Pipeline(steps=[("preprocessing", preprocessor), ("regressor", regressor)])


def tune_hyperparameters(
    X_train,
    y_train,
    *,
    cfg: DatasetConfig,
    n_iter: int = 25,
    random_state: int = 42,
    cv: int = 3,
) -> tuple[Pipeline, dict[str, Any]]:
    """
    Randomized search over XGBoost knobs while refitting preprocessing each CV fold.

    Returns the best estimator and a small tuning metadata dictionary.
    """
    base_pipe = build_model_pipeline(cfg, random_state=random_state)
    param_dist: dict[str, Any] = {
        "regressor__learning_rate": loguniform(1e-2, 3e-1),
        "regressor__max_depth": randint(2, 12),
        "regressor__min_child_weight": loguniform(0.25, 10.0),
        "regressor__subsample": uniform(0.55, 0.45),
        "regressor__colsample_bytree": uniform(0.55, 0.45),
        "regressor__reg_lambda": loguniform(1e-3, 1e2),
        "regressor__reg_alpha": loguniform(1e-4, 10.0),
        "regressor__n_estimators": randint(200, 1500),
        "regressor__gamma": loguniform(1e-4, 1.0),
    }
    search = RandomizedSearchCV(
        estimator=base_pipe,
        param_distributions=param_dist,
        n_iter=int(n_iter),
        cv=int(cv),
        scoring="neg_mean_squared_error",
        random_state=int(random_state),
        n_jobs=-1,
        verbose=1,
    )
    search.fit(X_train, y_train)
    best: Pipeline = search.best_estimator_
    tuning_meta = {
        "best_params": search.best_params_,
        "best_cv_score_rmse": float(np.sqrt(-search.best_score_)) if search.best_score_ <= 0 else None,
        "n_iter": int(n_iter),
        "cv": int(cv),
    }
    return best, tuning_meta


def finalize_on_train_plus_val(
    best_pipe: Pipeline,
    X_train,
    y_train,
    X_val,
    y_val,
) -> Pipeline:
    """Refit a clone of the best pipeline on train+val rows (test remains untouched)."""
    final = clone(best_pipe)
    X_merged = pd.concat([X_train, X_val], axis=0)
    y_merged = pd.concat([y_train, y_val], axis=0)
    final.fit(X_merged, y_merged)
    return final


def save_training_artifact(
    model: Pipeline,
    metrics_by_split: dict[str, dict[str, float]],
    residual_stats: dict[str, float],
    cfg: DatasetConfig,
    tuning_meta: dict[str, Any],
    path_model: Path,
    path_metadata: Path,
) -> None:
    """Persist joblib model + JSON sidecar for inference heuristics."""
    import joblib

    path_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path_model)

    payload: dict[str, Any] = {
        "metrics": metrics_by_split,
        "residual_dispersion_val": residual_stats,
        "target_column": cfg.target_column,
        "feature_columns": cfg.feature_columns(),
        "numeric_features": list(cfg.numeric_features),
        "categorical_features": list(cfg.categorical_features),
        "tuning": tuning_meta,
        "approx_heuristic_z_95": 1.96,
    }
    path_metadata.write_text(json.dumps(payload, indent=2), encoding="utf-8")
