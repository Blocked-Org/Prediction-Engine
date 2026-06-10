"""Pydantic schemas for the workspace management API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreateRequest(BaseModel):
    """POST /api/v1/workspaces — create a new workspace."""

    model_config = ConfigDict(extra="forbid")

    workspace_name: str = Field(
        ..., min_length=1, max_length=255,
        description="Display name for this workspace, e.g. 'Summer 2025 Campaign'.",
    )


class WorkspaceSummary(BaseModel):
    """Lightweight workspace summary for listing."""

    model_config = ConfigDict(extra="forbid")

    id: str
    workspace_name: str
    workspace_slot: int
    campaign_id: str
    is_active: bool
    created_at: str | None = None
    updated_at: str | None = None
    has_simulation_result: bool = False


class WorkspaceListResponse(BaseModel):
    """GET /api/v1/workspaces — list all workspaces for a user."""

    model_config = ConfigDict(extra="forbid")

    workspaces: list[WorkspaceSummary]
    max_workspaces: int = 3
    can_create: bool = True


class WorkspaceActivateRequest(BaseModel):
    """PUT /api/v1/workspaces/activate — switch active workspace."""

    model_config = ConfigDict(extra="forbid")

    workspace_slot: int = Field(..., ge=1, le=3, description="Slot to activate (1-3).")


class WorkspaceDeleteRequest(BaseModel):
    """DELETE /api/v1/workspaces — delete a workspace."""

    model_config = ConfigDict(extra="forbid")

    workspace_slot: int = Field(..., ge=1, le=3, description="Slot to delete (1-3).")
