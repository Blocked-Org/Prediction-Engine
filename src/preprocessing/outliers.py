"""Train-only IQR clipping for obvious numeric outliers."""

from __future__ import annotations

from typing import Any, Optional

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class IQRClipper(BaseEstimator, TransformerMixin):
    """
    Clip selected numeric columns to [Q1 - k*IQR, Q3 + k*IQR] using training statistics.

    Preserves all columns; non-configured columns pass through unchanged.
    """

    def __init__(self, columns: list[str], iqr_multiplier: float = 1.5) -> None:
        self.columns = columns
        self.iqr_multiplier = iqr_multiplier
        self.bounds_: dict[str, tuple[float, float]] = {}
        self.feature_names_in_: Optional[np.ndarray] = None
        self.n_features_in_: Optional[int] = None

    def fit(self, X: Any, y: Any = None) -> IQRClipper:
        frame = X if isinstance(X, pd.DataFrame) else pd.DataFrame(X)
        self.feature_names_in_ = np.asarray(frame.columns, dtype=object)
        self.n_features_in_ = frame.shape[1]
        self.bounds_.clear()
        mult = float(self.iqr_multiplier)
        for col in self.columns:
            if col not in frame.columns:
                continue
            series = pd.to_numeric(frame[col], errors="coerce")
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lo = float(q1 - mult * iqr)
            hi = float(q3 + mult * iqr)
            self.bounds_[col] = (lo, hi)
        return self

    def transform(self, X: Any) -> pd.DataFrame:
        self._check_is_fitted()
        frame = X if isinstance(X, pd.DataFrame) else pd.DataFrame(X, columns=self.feature_names_in_)
        out = frame.copy()
        for col, (lo, hi) in self.bounds_.items():
            if col in out.columns:
                num = pd.to_numeric(out[col], errors="coerce")
                out[col] = num.clip(lower=lo, upper=hi)
        return out

    def get_feature_names_out(self, input_features: Optional[Any] = None) -> np.ndarray:
        self._check_is_fitted()
        if input_features is not None:
            return np.asarray(input_features, dtype=object)
        return np.asarray(self.feature_names_in_, dtype=object)

    def _check_is_fitted(self) -> None:
        if self.feature_names_in_ is None:
            raise RuntimeError("IQRClipper has not been fitted yet.")
