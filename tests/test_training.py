"""
tests/test_training.py — Unit tests for training module.

Verifies:
- XGBoost Pipeline construction
- Hyperparameter tuning interface
"""

import pandas as pd
import pytest
from unittest.mock import patch, MagicMock

from src.preprocessing.config import DatasetConfig
from src.training.tune_train import (
    build_model_pipeline,
    tune_hyperparameters,
    finalize_on_train_plus_val,
)

@pytest.fixture
def mock_dataset_config() -> DatasetConfig:
    return DatasetConfig(
        raw_glob="data/*.csv",
        target_column="sales",
        numeric_features=["budget", "cpc", "base_price", "discount_rate"],
        categorical_features=["primary_channel", "region"],
    )

@pytest.fixture
def dummy_data() -> tuple[pd.DataFrame, pd.Series]:
    X = pd.DataFrame({
        "budget": [1000, 2000, 1500, 3000, 5000],
        "cpc": [1.5, 1.2, 1.8, 1.0, 0.8],
        "base_price": [50, 50, 45, 60, 55],
        "discount_rate": [0.0, 0.1, 0.05, 0.2, 0.0],
        "primary_channel": ["Meta", "Google", "Meta", "TikTok", "Google"],
        "region": ["Dhaka", "Dhaka", "Chittagong", "Sylhet", "Dhaka"]
    })
    y = pd.Series([12000, 25000, 18000, 35000, 60000])
    return X, y

def test_build_model_pipeline(mock_dataset_config: DatasetConfig) -> None:
    """Ensure the pipeline has preprocessing and XGBoost steps."""
    pipe = build_model_pipeline(mock_dataset_config, random_state=42)
    assert pipe is not None
    assert "preprocessing" in pipe.named_steps
    assert "regressor" in pipe.named_steps
    
    # Check that regressor is an XGBRegressor
    from xgboost import XGBRegressor
    assert isinstance(pipe.named_steps["regressor"], XGBRegressor)

@patch("src.training.tune_train.RandomizedSearchCV")
def test_tune_hyperparameters(
    mock_search: MagicMock, 
    mock_dataset_config: DatasetConfig,
    dummy_data: tuple[pd.DataFrame, pd.Series]
) -> None:
    """Ensure tuning is called correctly and returns expected outputs."""
    X, y = dummy_data
    
    # Mock the search object and its behavior
    mock_search_instance = MagicMock()
    mock_search_instance.best_estimator_ = "mock_best_pipeline"
    mock_search_instance.best_params_ = {"regressor__learning_rate": 0.1}
    mock_search_instance.best_score_ = -1500.0  # Neg MSE
    mock_search.return_value = mock_search_instance
    
    best_pipe, tuning_meta = tune_hyperparameters(
        X, y, cfg=mock_dataset_config, n_iter=2, cv=2
    )
    
    mock_search_instance.fit.assert_called_once_with(X, y)
    assert best_pipe == "mock_best_pipeline"
    assert tuning_meta["n_iter"] == 2
    assert tuning_meta["cv"] == 2
    assert "best_params" in tuning_meta
    assert "best_cv_score_rmse" in tuning_meta

@patch("src.training.tune_train.clone")
def test_finalize_on_train_plus_val(mock_clone: MagicMock, dummy_data: tuple[pd.DataFrame, pd.Series]) -> None:
    """Ensure finalize fits on combined train and val sets."""
    X_train, y_train = dummy_data
    X_val = X_train.copy()
    y_val = y_train.copy()
    
    mock_final_pipe = MagicMock()
    mock_clone.return_value = mock_final_pipe
    
    final = finalize_on_train_plus_val("dummy_pipe", X_train, y_train, X_val, y_val)
    
    assert final == mock_final_pipe
    # We expect fit to be called with a DataFrame of 2*N rows
    mock_final_pipe.fit.assert_called_once()
    args, kwargs = mock_final_pipe.fit.call_args
    assert len(args[0]) == len(X_train) + len(X_val)
    assert len(args[1]) == len(y_train) + len(y_val)
