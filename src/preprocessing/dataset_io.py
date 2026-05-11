"""Load raw CSVs, split, persist processed tables + manifest."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional, Tuple

import pandas as pd
from sklearn.model_selection import train_test_split

from src.preprocessing.config import DatasetConfig, iter_raw_files


def load_raw_dataframe(cfg: DatasetConfig, project_root: Path) -> pd.DataFrame:
    """Load and concatenate all CSV files matching raw_glob."""
    paths = list(iter_raw_files(cfg.raw_glob, project_root))
    if not paths:
        raise FileNotFoundError(
            f"No CSV files found for glob {cfg.raw_glob!r} under {project_root}. "
            "Place Kaggle exports in data/raw/."
        )
    frames = [pd.read_csv(p) for p in paths]
    return pd.concat(frames, axis=0, ignore_index=True)


def build_xy(
    df: pd.DataFrame,
    cfg: DatasetConfig,
    target_override: Optional[str] = None,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Apply drop_columns guardrails; return X (features only) and y (target)."""
    target = target_override or cfg.target_column
    if target not in df.columns:
        raise KeyError(
            f"Target column {target!r} missing. Available columns: {list(df.columns)!r}"
        )
    if target in cfg.drop_columns:
        raise ValueError("target_column must not appear in drop_columns.")

    cleaned = df.drop(
        columns=[c for c in cfg.drop_columns if c in df.columns],
        errors="ignore",
    )
    feature_cols = cfg.feature_columns()
    missing_feat = [c for c in feature_cols if c not in cleaned.columns]
    if missing_feat:
        raise KeyError(
            f"Configured features not found in CSV after drops: {missing_feat!r}. "
            f"Present columns include: {list(cleaned.columns)!r}"
        )
    X = cleaned[feature_cols].copy()
    y = cleaned[target].copy()
    return X, y


def stratified_splits(
    X: pd.DataFrame,
    y: pd.Series,
    cfg: DatasetConfig,
    random_state: Optional[int] = None,
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """
    Train / validation / test split via shuffling (classic regression workflow).

    Despite the historical name ("stratified"), this splits **without** categorical stratifying.
    Fractions applied sequentially: hold out test, then divide the remainder between train & val.
    """
    rnd = cfg.random_state if random_state is None else int(random_state)
    test_frac = cfg.test_size
    val_frac = cfg.val_size
    if not (0 < test_frac < 1) or not (0 < val_frac < 1):
        raise ValueError("val_size and test_size must be in (0, 1)")
    X_temp, X_test, y_temp, y_test = train_test_split(
        X,
        y,
        test_size=test_frac,
        random_state=rnd,
        shuffle=True,
    )
    # Adjust val proportion relative to the remaining temp fraction.
    val_relative = val_frac / (1.0 - test_frac)
    if val_relative >= 1.0:
        raise ValueError("val_size too large relative to test_size leaves no training rows.")

    X_train, X_val, y_train, y_val = train_test_split(
        X_temp,
        y_temp,
        test_size=val_relative,
        random_state=rnd,
        shuffle=True,
    )
    return X_train, y_train, X_val, y_val, X_test, y_test


def persist_processed_splits(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    cfg: DatasetConfig,
    target_column: str,
    extra_manifest: Optional[dict[str, Any]] = None,
) -> Path:
    """Write parquet splits and a JSON manifest beside them."""
    out_dir = Path(cfg.processed_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    def bundle(X: pd.DataFrame, ys: pd.Series) -> pd.DataFrame:
        out = X.copy()
        out[target_column] = ys.values
        return out

    train_path = out_dir / cfg.train_filename
    val_path = out_dir / cfg.val_filename
    test_path = out_dir / cfg.test_filename

    bundle(X_train, y_train).to_parquet(train_path, index=False)
    bundle(X_val, y_val).to_parquet(val_path, index=False)
    bundle(X_test, y_test).to_parquet(test_path, index=False)

    manifest: dict[str, Any] = {
        "target_column": target_column,
        "feature_columns": cfg.feature_columns(),
        "numeric_features": list(cfg.numeric_features),
        "categorical_features": list(cfg.categorical_features),
        "row_counts": {
            "train": int(len(X_train)),
            "val": int(len(X_val)),
            "test": int(len(X_test)),
        },
        "files": {
            "train": str(train_path.resolve()),
            "val": str(val_path.resolve()),
            "test": str(test_path.resolve()),
        },
        "random_state": cfg.random_state,
    }
    if extra_manifest:
        manifest.update(extra_manifest)

    manifest_path = out_dir / cfg.manifest_filename
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest_path
