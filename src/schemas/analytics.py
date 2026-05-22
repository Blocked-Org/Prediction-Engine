"""Pydantic schemas for the analytics endpoints (ROI tracking + Markov funnel)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ── ROI / iROAS time-series ────────────────────────────────────────────────


class ROIDataPoint(BaseModel):
    """A single observation in the iROAS time-series."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(..., description="ISO date string, e.g. '2024-01-15'.")
    iroas: float = Field(..., description="Incremental Return on Ad Spend for this period.")
    lower: float = Field(..., description="Lower bound of the 90% credible interval.")
    upper: float = Field(..., description="Upper bound of the 90% credible interval.")


class ROIAnalyticsResponse(BaseModel):
    """GET /api/v1/analytics/roi/{campaign_id} payload."""

    model_config = ConfigDict(extra="forbid")

    campaign_id: str
    data_points: list[ROIDataPoint]


# ── Markov funnel graph ────────────────────────────────────────────────────


class MarkovNode(BaseModel):
    """A node in the Markov funnel diagram."""

    model_config = ConfigDict(extra="forbid")

    id: str
    label: str
    trafficShare: float = Field(
        ..., ge=0.0, le=1.0, description="Fraction of total traffic reaching this node."
    )


class MarkovEdge(BaseModel):
    """A directed edge in the Markov funnel diagram."""

    model_config = ConfigDict(extra="forbid")

    # Field is named `from_id` to avoid the Python reserved word `from`.
    # The frontend expects `from`, so the endpoint serialises with alias.
    from_id: str = Field(..., alias="from", serialization_alias="from")
    to: str
    probability: float = Field(..., ge=0.0, le=1.0)

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class MarkovAnalyticsResponse(BaseModel):
    """GET /api/v1/analytics/markov/{campaign_id} payload."""

    model_config = ConfigDict(extra="forbid")

    campaign_id: str
    nodes: list[MarkovNode]
    edges: list[MarkovEdge]
