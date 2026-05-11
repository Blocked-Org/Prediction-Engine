"""Pydantic contracts shared by FastAPI routers and batch CLIs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ShapContribution(BaseModel):
    feature: str
    shap_value: float


class PredictionRequest(BaseModel):
    """Feature payload before preprocessing (business-level columns only)."""

    features: dict[str, Any]


class BatchPredictionRequest(BaseModel):
    records: list[dict[str, Any]] = Field(min_length=1)


class PredictionResponse(BaseModel):
    prediction: float
    approximate_band: dict[str, Any]
    confidence_note: str


class ExplanationResponse(BaseModel):
    prediction: float
    base_value: float
    shap_values: dict[str, float]
    top_positive_contributions: list[list[Any]]
    top_negative_contributions: list[list[Any]]
    sum_shap_approx_check: dict[str, float]


class FullPredictionEnvelope(BaseModel):
    input: dict[str, Any]
    prediction_body: ExplanationResponse


class ApiHealth(BaseModel):
    status: str = "ok"

