"""Pydantic models for the simulation onboarding wizard (four input matrices)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PrimaryChannel = Literal["Meta", "Google", "TikTok"]
AgeRange = Literal["18-24", "25-34", "35-44", "45-54", "55+"]

DEFAULT_COMPETITORS: list[str] = ["Category Benchmark A", "Category Benchmark B"]
DEFAULT_MACRO_FLAGS: list[str] = ["baseline_market_conditions"]
DEFAULT_INTENT_CLUSTERS: list[str] = ["general_intent"]


class EndogenousMatrix(BaseModel):
    """Controllable campaign inputs (endogenous matrix)."""

    model_config = ConfigDict(extra="forbid")

    budget: float = Field(..., gt=0, description="Monthly ad spend.")
    primary_channels: list[PrimaryChannel] = Field(
        ...,
        min_length=1,
        description="Paid media channels (Meta, Google, TikTok).",
    )
    base_price: float = Field(..., gt=0, description="Base product price.")
    cpc: float = Field(default=1.5, gt=0, description="Cost per click (default if omitted).")
    discount_rate: float = Field(
        default=0.0,
        ge=0,
        le=1,
        description="Promotional discount rate (0–1).",
    )


class TransactionalMatrix(BaseModel):
    """Financial baselines (transactional matrix)."""

    model_config = ConfigDict(extra="forbid")

    aov: float = Field(..., gt=0, description="Average order value.")
    cac: float = Field(..., ge=0, description="Customer acquisition cost.")
    historical_revenue: float | None = Field(
        default=None,
        ge=0,
        description="Historical revenue baseline (derived from AOV if omitted).",
    )
    ltv: float | None = Field(
        default=None,
        gt=0,
        description="Customer lifetime value (derived from AOV if omitted).",
    )

    @model_validator(mode="after")
    def derive_financial_defaults(self) -> TransactionalMatrix:
        if self.historical_revenue is None:
            self.historical_revenue = self.aov * 1000.0
        if self.ltv is None:
            self.ltv = self.aov * 3.0
        return self


class AudienceMatrix(BaseModel):
    """Target demographics (audience matrix)."""

    model_config = ConfigDict(extra="forbid")

    regions: list[str] = Field(
        ...,
        min_length=1,
        description="Geographic regions to target.",
    )
    target_age_range: AgeRange = Field(
        ...,
        description="Primary target age band for agent clustering.",
    )
    intent_clusters: list[str] = Field(
        default_factory=lambda: list(DEFAULT_INTENT_CLUSTERS),
        description="Behavioral intent clusters.",
    )


class ExogenousMatrix(BaseModel):
    """Market and competitor context (exogenous matrix) — optional with baselines."""

    model_config = ConfigDict(extra="forbid")

    competitors: list[str] = Field(
        default_factory=lambda: list(DEFAULT_COMPETITORS),
        description="Named competitors in the category.",
    )
    macroeconomic_flags: list[str] = Field(
        default_factory=lambda: list(DEFAULT_MACRO_FLAGS),
        description="Macro signals affecting demand (e.g. inflation, FX).",
    )


class SimulationInitRequest(BaseModel):
    """Payload for POST /api/v1/simulate/init — four interconnected input matrices."""

    model_config = ConfigDict(extra="forbid")

    clerk_user_id: str = Field(..., min_length=1, description="Clerk user ID for graph ownership.")
    endogenous: EndogenousMatrix
    transactional: TransactionalMatrix
    audience: AudienceMatrix
    exogenous: ExogenousMatrix = Field(default_factory=ExogenousMatrix)


class SimulationNodeCounts(BaseModel):
    """Counts of nodes created or linked in the init transaction."""

    model_config = ConfigDict(extra="forbid")

    competitors: int = Field(..., ge=0)
    macro_contexts: int = Field(..., ge=0)


class SimulationInitResponse(BaseModel):
    """Graph node identifiers returned after Neo4j persistence."""

    model_config = ConfigDict(extra="forbid")

    campaign_id: str
    agent_cluster_id: str
    competitor_ids: list[str]
    macro_context_ids: list[str] = Field(default_factory=list)
    node_counts: SimulationNodeCounts
    is_onboarded: bool = True


class SimulationOnboardingStatus(BaseModel):
    """Whether the user has completed onboarding (metadata or graph backfill)."""

    model_config = ConfigDict(extra="forbid")

    clerk_user_id: str
    is_onboarded: bool
    has_campaign: bool = False
