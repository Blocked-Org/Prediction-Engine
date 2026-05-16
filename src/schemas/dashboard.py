"""Dashboard API response models (matches frontend simulation contract)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

from src.shared.contracts import OptimizationResult, SimulationScenario

DashboardStatus = Literal["ready", "no_campaign", "processing"]


class DashboardResultsResponse(BaseModel):
    """GET /api/v1/simulate/results/{clerk_user_id} payload."""

    model_config = ConfigDict(extra="forbid")

    status: DashboardStatus
    simulation_scenario: SimulationScenario | None = None
    optimization_result: OptimizationResult | None = None
