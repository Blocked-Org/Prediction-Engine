"""Regression metrics persisted next to serialized models."""

from __future__ import annotations

from typing import Any, Mapping

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Return RMSE, MAE, and R² for convenience."""
    y_true = np.asarray(y_true, dtype=float).ravel()
    y_pred = np.asarray(y_pred, dtype=float).ravel()
    mse = mean_squared_error(y_true, y_pred)
    rmse = float(np.sqrt(mse))
    mae = float(mean_absolute_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))
    return {"rmse": rmse, "mae": mae, "r2": r2}


def residual_dispersion(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Simple residual statistics derived from validation predictions."""
    residuals = np.asarray(y_true, dtype=float).ravel() - np.asarray(y_pred, dtype=float).ravel()
    return {"residual_std": float(residuals.std(ddof=0)), "residual_mean": float(residuals.mean())}
