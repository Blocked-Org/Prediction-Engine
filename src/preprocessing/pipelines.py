"""sklearn preprocessing: optional IQR clip + ColumnTransformer."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, RobustScaler

from src.preprocessing.config import DatasetConfig, OutlierConfig
from src.preprocessing.outliers import IQRClipper


def _maybe_set_pandas_output(obj: Any) -> None:
    """Use DataFrame output when sklearn supports it (easier SHAP column alignment)."""
    setter = getattr(obj, "set_output", None)
    if callable(setter):
        try:
            setter(transform="pandas")
        except (TypeError, ValueError):
            pass


def build_feature_preprocessor(cfg: DatasetConfig) -> Pipeline:
    """
    Build sklearn Pipeline: optional IQRClipper -> ColumnTransformer (impute/encode/scale).

    The regressor is attached later in training to keep this module focused.
    """
    steps: list[tuple[str, Any]] = []

    out_cfg: OutlierConfig = cfg.outlier
    if out_cfg.enabled and out_cfg.iqr_clip_columns:
        clip = IQRClipper(
            columns=list(out_cfg.iqr_clip_columns),
            iqr_multiplier=out_cfg.iqr_multiplier,
        )
        _maybe_set_pandas_output(clip)
        steps.append(("iqr_clip", clip))

    numeric_steps: list[tuple[str, Any]] = [
        ("imputer", SimpleImputer(strategy="median")),
    ]
    if cfg.scale_numeric:
        numeric_steps.append(("scaler", RobustScaler(with_centering=True, with_scaling=True)))

    numeric_pipe = Pipeline(numeric_steps)
    _maybe_set_pandas_output(numeric_pipe)

    categorical_pipe = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            (
                "onehot",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                    min_frequency=None,
                ),
            ),
        ]
    )
    _maybe_set_pandas_output(categorical_pipe)

    column_transformer = ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, list(cfg.numeric_features)),
            ("cat", categorical_pipe, list(cfg.categorical_features)),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    _maybe_set_pandas_output(column_transformer)
    steps.append(("column_prep", column_transformer))

    preprocessor = Pipeline(steps)
    _maybe_set_pandas_output(preprocessor)
    return preprocessor


def ensure_feature_frame(X: Any, feature_columns: list[str]) -> pd.DataFrame:
    """Coerce model input to a DataFrame with stable column order."""
    if isinstance(X, pd.DataFrame):
        return X[feature_columns].copy()
    arr = np.asarray(X)
    if arr.ndim == 1:
        arr = arr.reshape(1, -1)
    return pd.DataFrame(arr, columns=feature_columns)
