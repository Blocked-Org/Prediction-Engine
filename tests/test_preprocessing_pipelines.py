import pandas as pd
import numpy as np
import pytest
from src.preprocessing.pipelines import build_feature_preprocessor, ensure_feature_frame
from src.preprocessing.config import DatasetConfig, OutlierConfig

def test_build_feature_preprocessor_with_outliers():
    cfg = DatasetConfig(
        raw_glob="data/raw/*.csv",
        target_column="target",
        numeric_features=["num1", "num2"],
        categorical_features=["cat1"],
        scale_numeric=True,
        outlier=OutlierConfig(enabled=True, iqr_clip_columns=["num1"], iqr_multiplier=1.5)
    )
    pipe = build_feature_preprocessor(cfg)
    
    # Check steps
    step_names = [name for name, _ in pipe.steps]
    assert "iqr_clip" in step_names
    assert "column_prep" in step_names
    
    # Test execution
    df = pd.DataFrame({
        "num1": [1, 2, 3, 100],
        "num2": [10, 20, 30, 40],
        "cat1": ["a", "b", "a", "c"]
    })
    
    transformed = pipe.fit_transform(df)
    assert transformed.shape[0] == 4
    # with one-hot, cat1 (3 unique vals) expects 3 columns, and 2 numeric columns => total 5 columns
    assert transformed.shape[1] == 5

def test_build_feature_preprocessor_no_outliers():
    cfg = DatasetConfig(
        raw_glob="data/raw/*.csv",
        target_column="target",
        numeric_features=["num1"],
        categorical_features=[],
        scale_numeric=False,
        outlier=OutlierConfig(enabled=False)
    )
    pipe = build_feature_preprocessor(cfg)
    step_names = [name for name, _ in pipe.steps]
    assert "iqr_clip" not in step_names
    assert "column_prep" in step_names

def test_ensure_feature_frame():
    # From DataFrame
    df = pd.DataFrame({"A": [1], "B": [2], "C": [3]})
    res = ensure_feature_frame(df, ["A", "B"])
    assert list(res.columns) == ["A", "B"]
    
    # From Numpy array (1D)
    arr_1d = np.array([10, 20])
    res2 = ensure_feature_frame(arr_1d, ["X", "Y"])
    assert res2.shape == (1, 2)
    assert list(res2.columns) == ["X", "Y"]
    
    # From Numpy array (2D)
    arr_2d = np.array([[10, 20], [30, 40]])
    res3 = ensure_feature_frame(arr_2d, ["X", "Y"])
    assert res3.shape == (2, 2)
    assert list(res3.columns) == ["X", "Y"]
