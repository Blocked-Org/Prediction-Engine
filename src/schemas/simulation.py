"""Pydantic models for the simulation onboarding wizard (four input matrices)."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

PrimaryChannel = Literal["Meta", "Google", "TikTok"]
AgeRange = Literal["18-24", "25-34", "35-44", "45-54", "55+"]

DEFAULT_COMPETITORS: list[str] = ["Category Benchmark A", "Category Benchmark B"]
DEFAULT_MACRO_FLAGS: list[str] = ["baseline_market_conditions"]
DEFAULT_INTENT_CLUSTERS: list[str] = ["general_intent"]


class EndogenousMatrix(BaseModel):
    """Controllable campaign inputs (endogenous matrix)."""

    model_config = ConfigDict(extra="ignore")

    Impressions: float = Field(..., ge=0, description="Number of ad impressions.")
    Clicks: int = Field(..., ge=0, description="Number of ad clicks.")
    spend_meta: float = Field(..., ge=0, description="Meta Ads spend budget.")
    spend_google: float = Field(..., ge=0, description="Google Ads spend budget.")
    spend_tiktok: float = Field(..., ge=0, description="TikTok Ads spend budget.")

    @property
    def total_spend(self) -> float:
        """Total spend across all channels."""
        return self.spend_meta + self.spend_google + self.spend_tiktok


class TransactionalMatrix(BaseModel):
    """Financial baselines (transactional matrix)."""

    model_config = ConfigDict(extra="ignore")

    Total_Conversion: int = Field(..., ge=0, description="Total number of conversions.")
    revenue: float = Field(..., ge=0, description="Historical total revenue.")
    aov: Optional[float] = Field(default=None, description="Derived average order value (revenue / conversions).")
    cac: Optional[float] = Field(default=None, description="Derived customer acquisition cost (total_spend / conversions).")


class AudienceMatrix(BaseModel):
    """Target demographics (audience matrix)."""

    model_config = ConfigDict(extra="ignore")

    age: str = Field(..., description="Target age range.")
    gender: str = Field(..., description="Target gender.")
    interest: str = Field(..., description="Target interest.")


class ExogenousMatrix(BaseModel):
    """Market and competitor context (exogenous matrix) — optional with baselines."""

    model_config = ConfigDict(extra="forbid")

    competitors: list[str] = Field(
        default_factory=lambda: list(DEFAULT_COMPETITORS),
        description="Named competitors in the category.",
    )
    competitor_urls: list[HttpUrl] = Field(
        default_factory=list,
        description="Competitor website URLs for Firecrawl scraping. Must be valid HTTP(S) URLs.",
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
    """Identifiers returned after PostgreSQL workspace persistence."""

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


class SimulationRequest(BaseModel):
    """Nested payload for POST /api/v1/simulate"""

    model_config = ConfigDict(extra="ignore")

    clerk_user_id: str = Field(..., min_length=1)
    endogenous: EndogenousMatrix
    transactional: TransactionalMatrix
    audience: AudienceMatrix
    exogenous: ExogenousMatrix = Field(default_factory=ExogenousMatrix)
    budget_overrides: dict[str, float] | None = Field(default=None, description="Optional overrides for specific channels.")
