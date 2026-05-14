"""Pydantic contracts shared by FastAPI routers and batch CLIs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Annotated
import datetime

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


class SimulationRequest(BaseModel):
    """
    Request payload for a marketing simulation, defining timeframe, audience, and budgets.
    """
    model_config = ConfigDict(extra="forbid")

    campaign_timeframe: tuple[datetime.date, datetime.date] = Field(
        ..., description="Tuple of start and end dates for the campaign timeframe."
    )
    target_demographics: dict[str, str | int | float] = Field(
        ..., description="Key-value pairs defining target demographics."
    )
    budget_allocation: dict[str, Annotated[float, Field(ge=0.0)]] = Field(
        ..., description="Budget allocated per channel, e.g., {'meta_ads': 1500.0}. Must be >= 0."
    )


class SimulationResponse(BaseModel):
    """
    Response payload containing the results of a marketing simulation.
    """
    model_config = ConfigDict(extra="forbid")

    projected_roi: float = Field(
        ..., description="The projected Return on Investment."
    )
    incremental_roas: float = Field(
        ..., description="The incremental Return on Ad Spend."
    )
    pareto_optimal_budgets: list[dict[str, float]] = Field(
        ..., description="List of dictionaries showing alternative budget spreads."
    )


class HistoricalSpendRecord(BaseModel):
    """
    A single record of historical spend data used for forecasting.
    """
    model_config = ConfigDict(extra="forbid")

    date: datetime.date = Field(..., description="Date of the historical spend.")
    channel: str = Field(..., description="The marketing channel used.")
    spend: float = Field(..., ge=0.0, 
        description="Amount spent on the channel."
    )


class ForecastRequest(BaseModel):
    """
    Request payload for generating sales forecasts based on historical data.
    """
    model_config = ConfigDict(extra="forbid")

    historical_spend_data: list[HistoricalSpendRecord] = Field(
        ..., description="List of historical spend records."
    )
    exogenous_factors: dict[str, float] = Field(
        ..., description="External factors impacting the forecast, e.g., competitor_share_of_voice."
    )


class ForecastResponse(BaseModel):
    """
    Response payload containing baseline, incremental sales, and a confidence range.
    """
    model_config = ConfigDict(extra="forbid")

    baseline_sales: float = Field(
        ..., description="The projected baseline sales without intervention."
    )
    incremental_sales: float = Field(
        ..., description="The projected incremental sales driven by marketing."
    )
    confidence_interval: tuple[float, float] = Field(
        ..., description="Tuple of lower and upper bounds of the confidence interval."
    )
