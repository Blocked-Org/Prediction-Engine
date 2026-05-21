import pandas as pd
import pytest
from src.preprocessing.outliers import IQRClipper

def test_iqr_clipper_fit_transform():
    # Arrange: Create test data with known outliers
    df = pd.DataFrame({
        "A": [1, 2, 3, 4, 5, 100],  # 100 is an outlier
        "B": [10, 20, 30, 40, 50, 60], # Linear, no big outliers
        "C": ["text", "text", "text", "text", "text", "text"] # Ignored
    })
    
    clipper = IQRClipper(columns=["A", "B"], iqr_multiplier=1.5)
    
    # Act
    clipper.fit(df)
    transformed = clipper.transform(df)
    
    # Assert feature names and bounds
    assert "A" in clipper.bounds_
    assert "B" in clipper.bounds_
    
    # Check that 100 in 'A' was clipped
    # Quantiles for A: Q1 = 2.25, Q3 = 4.75 -> IQR = 2.5
    # Upper bound = 4.75 + 1.5 * 2.5 = 8.5
    expected_clipped_max = 8.5
    assert transformed["A"].iloc[-1] == expected_clipped_max
    
    # Values not exceeding bounds should remain unchanged
    assert transformed["A"].iloc[0] == 1.0
    assert transformed["B"].iloc[-1] == 60.0 # Upper bound around 50 + 1.5*20 = 80
    assert list(transformed["C"]) == ["text"] * 6

def test_iqr_clipper_not_fitted():
    clipper = IQRClipper(columns=["A"])
    # Act / Assert
    with pytest.raises(RuntimeError, match="has not been fitted yet"):
        clipper.transform(pd.DataFrame({"A": [1, 2, 3]}))

def test_iqr_clipper_missing_columns():
    df = pd.DataFrame({"X": [1, 2, 3]})
    clipper = IQRClipper(columns=["A"]) # Column doesn't exist
    clipper.fit(df)
    transformed = clipper.transform(df)
    
    assert "A" not in clipper.bounds_
    assert list(transformed["X"]) == [1, 2, 3]

def test_iqr_clipper_get_feature_names_out():
    df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
    clipper = IQRClipper(columns=["A"])
    clipper.fit(df)
    
    names = clipper.get_feature_names_out()
    assert list(names) == ["A", "B"]
    
    names_override = clipper.get_feature_names_out(["X", "Y"])
    assert list(names_override) == ["X", "Y"]
