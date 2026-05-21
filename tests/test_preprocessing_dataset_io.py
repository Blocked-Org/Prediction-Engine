import pytest
import pandas as pd
import json

from src.preprocessing.dataset_io import (
    load_raw_dataframe, 
    build_xy, 
    stratified_splits, 
    persist_processed_splits
)
from src.preprocessing.config import DatasetConfig

@pytest.fixture
def mock_cfg():
    return DatasetConfig(
        raw_glob="data/raw/*.csv",
        target_column="target",
        numeric_features=["num1", "num2"],
        categorical_features=["cat1"],
        drop_columns=["id"],
        test_size=0.2,
        val_size=0.2,
        random_state=42
    )

def test_load_raw_dataframe(mock_cfg, tmp_path):
    # Setup temporary directory and mock CSVs
    raw_dir = tmp_path / "data" / "raw"
    raw_dir.mkdir(parents=True)
    df1 = pd.DataFrame({"id": [1, 2], "target": [10, 20]})
    df1.to_csv(raw_dir / "data1.csv", index=False)
    
    # Needs to match raw_glob which is usually 'data/raw/*.csv'
    mock_cfg.raw_glob = "data/raw/*.csv"
    
    df = load_raw_dataframe(mock_cfg, tmp_path)
    assert len(df) == 2
    assert "target" in df.columns

def test_load_raw_dataframe_empty(mock_cfg, tmp_path):
    mock_cfg.raw_glob = "data/raw/*.csv"
    with pytest.raises(FileNotFoundError):
        load_raw_dataframe(mock_cfg, tmp_path)

def test_build_xy(mock_cfg):
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "num1": [10, 20, 30],
        "num2": [100, 200, 300],
        "cat1": ["a", "b", "c"],
        "target": [1, 0, 1]
    })
    
    X, y = build_xy(df, mock_cfg)
    
    assert "id" not in X.columns
    assert "target" not in X.columns
    assert list(X.columns) == ["num1", "num2", "cat1"]
    assert list(y) == [1, 0, 1]

def test_build_xy_missing_target(mock_cfg):
    df = pd.DataFrame({"num1": [1], "num2": [2], "cat1": ["a"]})
    with pytest.raises(KeyError, match="Target column"):
        build_xy(df, mock_cfg)

def test_build_xy_missing_features(mock_cfg):
    df = pd.DataFrame({"num1": [1], "target": [1]})
    with pytest.raises(KeyError, match="Configured features not found"):
        build_xy(df, mock_cfg)

def test_stratified_splits(mock_cfg):
    X = pd.DataFrame({"num1": range(100), "num2": range(100), "cat1": ["a"] * 100})
    y = pd.Series(range(100))
    
    X_train, y_train, X_val, y_val, X_test, y_test = stratified_splits(X, y, mock_cfg)
    
    # total 100
    # test 0.2 -> 20
    # val 0.2 -> 20
    # train -> 60
    assert len(X_train) == 60
    assert len(X_val) == 20
    assert len(X_test) == 20
    assert len(X_train) == len(y_train)
    assert len(X_val) == len(y_val)
    assert len(X_test) == len(y_test)

def test_stratified_splits_invalid_fractions(mock_cfg):
    X = pd.DataFrame({"num1": range(100)})
    y = pd.Series(range(100))
    
    mock_cfg.test_size = 0.9
    mock_cfg.val_size = 0.2
    
    with pytest.raises(ValueError, match="val_size too large relative to test_size"):
        stratified_splits(X, y, mock_cfg)

def test_persist_processed_splits(mock_cfg, tmp_path):
    X_train = pd.DataFrame({"num1": [1], "num2": [2], "cat1": ["a"]})
    y_train = pd.Series([10])
    
    mock_cfg.processed_dir = str(tmp_path / "processed")
    mock_cfg.train_filename = "train.parquet"
    mock_cfg.val_filename = "val.parquet"
    mock_cfg.test_filename = "test.parquet"
    mock_cfg.manifest_filename = "info.json"
    
    manifest_path = persist_processed_splits(
        X_train, y_train, X_train, y_train, X_train, y_train,
        mock_cfg, "target"
    )
    
    assert manifest_path.exists()
    assert (tmp_path / "processed" / "train.parquet").exists()
    
    data = json.loads(manifest_path.read_text())
    assert data["row_counts"]["train"] == 1
    assert data["target_column"] == "target"
