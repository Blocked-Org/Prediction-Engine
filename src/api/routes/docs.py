import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.api.auth import Role, require_role
from src.api.db.database import get_global_db
from src.api.models import PlatformDocsSettings, Tenant, Organization, User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Docs"])

# ── Schemas ─────────────────────────────────────────────────────────
class DocsScheduleSchema(BaseModel):
    enabled: bool
    startDate: str
    endDate: str
    overrideActive: bool

class DocsConfigResponse(BaseModel):
    schedule: DocsScheduleSchema
    team_members: List[Dict[str, Any]]
    pitch_sections: List[Dict[str, Any]]

class DocsConfigRequest(BaseModel):
    schedule: DocsScheduleSchema
    team_members: List[Dict[str, Any]]
    pitch_sections: List[Dict[str, Any]]

class MetricsResponse(BaseModel):
    total_tenants: int
    total_users: int
    total_organizations: int
    uptime_days: int

# ── Public Endpoints ────────────────────────────────────────────────

@router.get("/api/v1/public/docs/config", response_model=DocsConfigResponse)
def get_public_docs_config(db: Session = Depends(get_global_db)):
    """Fetch the global docs configuration (schedule, team, sections)."""
    settings = db.query(PlatformDocsSettings).first()
    
    if not settings:
        # Return default if not initialized in DB yet
        return DocsConfigResponse(
            schedule=DocsScheduleSchema(
                enabled=True,
                startDate=datetime.now(timezone.utc).isoformat(),
                endDate=datetime.now(timezone.utc).isoformat(),
                overrideActive=False
            ),
            team_members=[],
            pitch_sections=[]
        )

    return DocsConfigResponse(
        schedule=DocsScheduleSchema(
            enabled=settings.is_enabled,
            startDate=settings.start_date.isoformat(),
            endDate=settings.end_date.isoformat(),
            overrideActive=settings.override_active
        ),
        team_members=settings.team_members or [],
        pitch_sections=settings.pitch_sections or []
    )

@router.get("/api/v1/public/metrics", response_model=MetricsResponse)
def get_public_metrics(db: Session = Depends(get_global_db)):
    """Fetch high-level aggregate platform metrics for the Live Data view."""
    total_tenants = db.query(Tenant).count()
    total_users = db.query(User).count()
    total_orgs = db.query(Organization).count()
    
    # Mock uptime for demonstration
    uptime_days = 120 
    
    return MetricsResponse(
        total_tenants=total_tenants,
        total_users=total_users,
        total_organizations=total_orgs,
        uptime_days=uptime_days
    )

# ── Admin Endpoints ─────────────────────────────────────────────────

@router.put("/api/v1/admin/docs/config", response_model=DocsConfigResponse)
def update_docs_config(
    payload: DocsConfigRequest,
    db: Session = Depends(get_global_db),
    role: Role = Depends(require_role(Role.owner, Role.admin))
):
    """Update the global docs configuration. Restricted to admin/owner."""
    settings = db.query(PlatformDocsSettings).first()
    
    try:
        start_dt = datetime.fromisoformat(payload.schedule.startDate.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(payload.schedule.endDate.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Must be ISO 8601.")
        
    if not settings:
        settings = PlatformDocsSettings(
            is_enabled=payload.schedule.enabled,
            start_date=start_dt,
            end_date=end_dt,
            override_active=payload.schedule.overrideActive,
            team_members=payload.team_members,
            pitch_sections=payload.pitch_sections
        )
        db.add(settings)
    else:
        settings.is_enabled = payload.schedule.enabled
        settings.start_date = start_dt
        settings.end_date = end_dt
        settings.override_active = payload.schedule.overrideActive
        settings.team_members = payload.team_members
        settings.pitch_sections = payload.pitch_sections

    db.commit()
    db.refresh(settings)
    
    return DocsConfigResponse(
        schedule=DocsScheduleSchema(
            enabled=settings.is_enabled,
            startDate=settings.start_date.isoformat(),
            endDate=settings.end_date.isoformat(),
            overrideActive=settings.override_active
        ),
        team_members=settings.team_members,
        pitch_sections=settings.pitch_sections
    )
