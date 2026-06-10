"""Campaign workspace persistence layer — replaces both the volatile
``_user_campaigns`` in-memory dict **and** the removed Neo4j graph store.

All functions use **synchronous** SQLAlchemy sessions so they can be called
from both async FastAPI routes (via ``run_in_executor``) and from the
synchronous Celery worker without an event-loop dependency.

Workspace Rules
---------------
* Each user may have at most **3 workspaces** (slot 1-3).
* Only **one** workspace is ``is_active=True`` at a time per user.
* The dashboard / analytics endpoints always read the **active** workspace.
* Creating a new workspace automatically deactivates the previous one.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.api.db.database import SessionLocal
from src.api.models import CampaignWorkspace

logger = logging.getLogger(__name__)

# Maximum workspace slots per user (enforced at DB level too via CHECK).
MAX_WORKSPACES = 3


# ── Internal helper ─────────────────────────────────────────────────────────

def _get_session() -> Session:
    """Return a fresh SQLAlchemy session (caller MUST close)."""
    return SessionLocal()


# ── Workspace CRUD ──────────────────────────────────────────────────────────

def create_workspace(
    *,
    clerk_user_id: str,
    tenant_id: str,
    workspace_name: str,
    campaign_id: str,
    campaign_data: dict[str, Any],
) -> CampaignWorkspace:
    """Create a new workspace in the next available slot.

    Raises ``ValueError`` if the user already has 3 workspaces.
    """
    db = _get_session()
    try:
        # Count existing workspaces
        existing = (
            db.execute(
                select(CampaignWorkspace.workspace_slot)
                .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
                .order_by(CampaignWorkspace.workspace_slot)
            )
            .scalars()
            .all()
        )

        if len(existing) >= MAX_WORKSPACES:
            raise ValueError(
                f"User {clerk_user_id} already has {MAX_WORKSPACES} workspaces. "
                "Delete one before creating a new one."
            )

        # Find next free slot (1, 2, or 3)
        used_slots = set(existing)
        next_slot = next(s for s in range(1, MAX_WORKSPACES + 1) if s not in used_slots)

        # Deactivate all existing workspaces for this user
        db.execute(
            update(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .values(is_active=False)
        )

        workspace = CampaignWorkspace(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            clerk_user_id=clerk_user_id,
            workspace_name=workspace_name,
            workspace_slot=next_slot,
            campaign_id=campaign_id,
            campaign_data=campaign_data,
            simulation_result=None,
            competitor_context=None,
            is_active=True,
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

        logger.info(
            "Created workspace '%s' (slot %d) for user %s",
            workspace_name, next_slot, clerk_user_id,
        )
        return workspace
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def upsert_workspace(
    *,
    clerk_user_id: str,
    tenant_id: str,
    workspace_name: str = "Default Workspace",
    campaign_id: str,
    campaign_data: dict[str, Any],
    workspace_slot: int = 1,
) -> CampaignWorkspace:
    """Insert or update a workspace at a specific slot.

    This is the primary method called by ``/simulate/init``.  On first
    onboarding it creates slot 1; on re-onboarding it overwrites the
    campaign data and clears the cached simulation result.
    """
    db = _get_session()
    try:
        # Deactivate all other workspaces for this user
        db.execute(
            update(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .where(CampaignWorkspace.workspace_slot != workspace_slot)
            .values(is_active=False)
        )

        # Check if workspace already exists at this slot
        existing = db.execute(
            select(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .where(CampaignWorkspace.workspace_slot == workspace_slot)
        ).scalar_one_or_none()

        if existing:
            existing.workspace_name = workspace_name
            existing.campaign_id = campaign_id
            existing.campaign_data = campaign_data
            existing.simulation_result = None  # Clear cached result on re-init
            existing.is_active = True
            existing.tenant_id = uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id
            db.commit()
            db.refresh(existing)
            logger.info("Updated workspace slot %d for user %s", workspace_slot, clerk_user_id)
            return existing
        else:
            workspace = CampaignWorkspace(
                id=uuid.uuid4(),
                tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
                clerk_user_id=clerk_user_id,
                workspace_name=workspace_name,
                workspace_slot=workspace_slot,
                campaign_id=campaign_id,
                campaign_data=campaign_data,
                simulation_result=None,
                competitor_context=None,
                is_active=True,
            )
            db.add(workspace)
            db.commit()
            db.refresh(workspace)
            logger.info("Created workspace slot %d for user %s", workspace_slot, clerk_user_id)
            return workspace
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── Read helpers ────────────────────────────────────────────────────────────

def get_active_workspace(clerk_user_id: str) -> CampaignWorkspace | None:
    """Return the user's currently active workspace, or None."""
    db = _get_session()
    try:
        return db.execute(
            select(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .where(CampaignWorkspace.is_active == True)  # noqa: E712
        ).scalar_one_or_none()
    finally:
        db.close()


def get_workspace_by_campaign_id(campaign_id: str) -> CampaignWorkspace | None:
    """Lookup a workspace by its campaign_id (used by analytics endpoints)."""
    db = _get_session()
    try:
        return db.execute(
            select(CampaignWorkspace)
            .where(CampaignWorkspace.campaign_id == campaign_id)
        ).scalar_one_or_none()
    finally:
        db.close()


def list_workspaces(clerk_user_id: str) -> list[dict[str, Any]]:
    """Return all workspaces for a user (for the workspace switcher UI)."""
    db = _get_session()
    try:
        rows = db.execute(
            select(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .order_by(CampaignWorkspace.workspace_slot)
        ).scalars().all()

        return [
            {
                "id": str(ws.id),
                "workspace_name": ws.workspace_name,
                "workspace_slot": ws.workspace_slot,
                "campaign_id": ws.campaign_id,
                "is_active": ws.is_active,
                "created_at": ws.created_at.isoformat() if ws.created_at else None,
                "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
                "has_simulation_result": ws.simulation_result is not None,
            }
            for ws in rows
        ]
    finally:
        db.close()


def get_workspace_count(clerk_user_id: str) -> int:
    """Return the number of workspaces for a user."""
    db = _get_session()
    try:
        rows = db.execute(
            select(CampaignWorkspace.id)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
        ).scalars().all()
        return len(rows)
    finally:
        db.close()


# ── Activate / Switch ───────────────────────────────────────────────────────

def activate_workspace(clerk_user_id: str, workspace_slot: int) -> bool:
    """Set a workspace slot as active and deactivate all others.

    Returns True if the slot was found and activated.
    """
    db = _get_session()
    try:
        target = db.execute(
            select(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .where(CampaignWorkspace.workspace_slot == workspace_slot)
        ).scalar_one_or_none()

        if target is None:
            return False

        # Deactivate all
        db.execute(
            update(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .values(is_active=False)
        )
        # Activate target
        target.is_active = True
        db.commit()
        logger.info("Activated workspace slot %d for user %s", workspace_slot, clerk_user_id)
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def delete_workspace(clerk_user_id: str, workspace_slot: int) -> bool:
    """Delete a workspace. If it was active, activate the lowest remaining slot.

    Returns True if a workspace was deleted.
    """
    db = _get_session()
    try:
        target = db.execute(
            select(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .where(CampaignWorkspace.workspace_slot == workspace_slot)
        ).scalar_one_or_none()

        if target is None:
            return False

        was_active = target.is_active
        db.delete(target)
        db.flush()

        # If we deleted the active workspace, activate the lowest remaining
        if was_active:
            remaining = db.execute(
                select(CampaignWorkspace)
                .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
                .order_by(CampaignWorkspace.workspace_slot)
            ).scalar_one_or_none()
            if remaining:
                remaining.is_active = True

        db.commit()
        logger.info("Deleted workspace slot %d for user %s", workspace_slot, clerk_user_id)
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── Simulation result caching ───────────────────────────────────────────────

def save_simulation_result(
    clerk_user_id: str,
    result: dict[str, Any],
    *,
    campaign_id: str | None = None,
) -> bool:
    """Persist a computed simulation result to the active workspace.

    If ``campaign_id`` is given, matches by campaign_id instead of active flag.
    Returns True if a workspace was updated.
    """
    db = _get_session()
    try:
        if campaign_id:
            ws = db.execute(
                select(CampaignWorkspace)
                .where(CampaignWorkspace.campaign_id == campaign_id)
            ).scalar_one_or_none()
        else:
            ws = db.execute(
                select(CampaignWorkspace)
                .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
                .where(CampaignWorkspace.is_active == True)  # noqa: E712
            ).scalar_one_or_none()

        if ws is None:
            logger.warning("No workspace found to save simulation result for user %s", clerk_user_id)
            return False

        ws.simulation_result = result
        db.commit()
        logger.info("Saved simulation result to workspace '%s' for user %s", ws.workspace_name, clerk_user_id)
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_simulation_result(clerk_user_id: str) -> dict[str, Any] | None:
    """Return the cached simulation result from the active workspace, or None."""
    ws = get_active_workspace(clerk_user_id)
    if ws is None or ws.simulation_result is None:
        return None
    return ws.simulation_result


# ── Competitor context (replaces Neo4j CompetitorContext nodes) ──────────────

def save_competitor_context(
    clerk_user_id: str,
    competitor_data: list[dict[str, Any]],
) -> bool:
    """Append or replace competitor scrape results on the active workspace."""
    db = _get_session()
    try:
        ws = db.execute(
            select(CampaignWorkspace)
            .where(CampaignWorkspace.clerk_user_id == clerk_user_id)
            .where(CampaignWorkspace.is_active == True)  # noqa: E712
        ).scalar_one_or_none()

        if ws is None:
            return False

        ws.competitor_context = competitor_data
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_competitor_count(clerk_user_id: str) -> int:
    """Return the number of competitor context entries (replaces Neo4j
    ``MATCH (c:CompetitorContext) RETURN count(c)`` query)."""
    ws = get_active_workspace(clerk_user_id)
    if ws is None or ws.competitor_context is None:
        return 0
    if isinstance(ws.competitor_context, list):
        return len(ws.competitor_context)
    return 0
