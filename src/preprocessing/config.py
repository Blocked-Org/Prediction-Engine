"""YAML-backed dataset configuration (paths, columns, split sizes)."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Optional

import yaml


@dataclass
class OutlierConfig:
    """Optional IQR clipping on selected numeric columns (fit on train only)."""

    enabled: bool = True
    iqr_multiplier: float = 1.5
    iqr_clip_columns: list[str] = field(default_factory=list)


@dataclass
class DatasetConfig:
    """User-editable settings for loading CSVs and building the ML pipeline."""

    raw_glob: str
    target_column: str
    drop_columns: list[str] = field(default_factory=list)
    numeric_features: list[str] = field(default_factory=list)
    categorical_features: list[str] = field(default_factory=list)
    val_size: float = 0.15
    test_size: float = 0.15
    random_state: int = 42
    scale_numeric: bool = True
    outlier: OutlierConfig = field(default_factory=OutlierConfig)
    processed_dir: str = "data/processed"
    manifest_filename: str = "preprocessing_manifest.json"
    train_filename: str = "train.parquet"
    val_filename: str = "val.parquet"
    test_filename: str = "test.parquet"
    model_output_path: str = "models/xgb_pipeline.joblib"

    def resolve_paths(self, project_root: Path) -> None:
        """Normalize relative paths against project root (mutates string fields)."""
        self.processed_dir = str(project_root / self.processed_dir)
        self.model_output_path = str(project_root / self.model_output_path)

    def feature_columns(self) -> list[str]:
        """Ordered union of configured feature columns."""
        return list(dict.fromkeys([*self.numeric_features, *self.categorical_features]))


def _coerce_outlier(raw: Optional[dict[str, Any]]) -> OutlierConfig:
    if not raw:
        return OutlierConfig()
    return OutlierConfig(
        enabled=bool(raw.get("enabled", True)),
        iqr_multiplier=float(raw.get("iqr_multiplier", 1.5)),
        iqr_clip_columns=list(raw.get("iqr_clip_columns", [])),
    )


def load_dataset_config(path: Path, project_root: Optional[Path] = None) -> DatasetConfig:
    """Load dataset YAML into a DatasetConfig."""
    with path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    cfg = DatasetConfig(
        raw_glob=str(raw["raw_glob"]),
        target_column=str(raw["target_column"]),
        drop_columns=list(raw.get("drop_columns", [])),
        numeric_features=list(raw.get("numeric_features", [])),
        categorical_features=list(raw.get("categorical_features", [])),
        val_size=float(raw.get("val_size", 0.15)),
        test_size=float(raw.get("test_size", 0.15)),
        random_state=int(raw.get("random_state", 42)),
        scale_numeric=bool(raw.get("scale_numeric", True)),
        outlier=_coerce_outlier(raw.get("outlier")),
        processed_dir=str(raw.get("processed_dir", "data/processed")),
        manifest_filename=str(raw.get("manifest_filename", "preprocessing_manifest.json")),
        train_filename=str(raw.get("train_filename", "train.parquet")),
        val_filename=str(raw.get("val_filename", "val.parquet")),
        test_filename=str(raw.get("test_filename", "test.parquet")),
        model_output_path=str(raw.get("model_output_path", "models/xgb_pipeline.joblib")),
    )

    if project_root is not None:
        cfg.resolve_paths(project_root)

    return cfg


def iter_raw_files(raw_glob: str, project_root: Path) -> Iterable[Path]:
    """Resolve a glob relative to project root (for default data/raw/*.csv)."""
    pattern = Path(raw_glob)
    if not pattern.is_absolute():
        pattern = project_root / pattern
    return sorted(pattern.parent.glob(pattern.name))
