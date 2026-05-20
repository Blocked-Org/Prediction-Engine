from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.api.auth import ClerkAuth, Role, get_auth, require_role
from src.api.db.database import SessionLocal
from src.api.models import ApiKey

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/keys", tags=["keys"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Pydantic Request / Response schemas ────────────────────────────────
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="A friendly name for this key")
    expires_at: Optional[datetime] = Field(None, description="Optional expiry timestamp")


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    key_prefix: str
    created_by: str
    expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreatedResponse(ApiKeyResponse):
    raw_key: str  # Only returned once on creation


# ── Route Handlers ─────────────────────────────────────────────────────

@router.get("", response_model=List[ApiKeyResponse])
def list_keys(
    db: Session = Depends(get_db),
    auth: ClerkAuth = Depends(get_auth),
    role: Role = Depends(require_role(Role.owner, Role.admin)),
) -> List[ApiKey]:
    """
    List all active API keys for the current tenant.
    Never returns the full key or hash, only the prefix.
    """
    try:
        tenant_uuid = uuid.UUID(auth.tenant_id)
        keys = (
            db.query(ApiKey)
            .filter(ApiKey.tenant_id == tenant_uuid, ApiKey.is_active == True)
            .order_by(ApiKey.created_at.desc())
            .all()
        )
        return keys
    except Exception as exc:
        logger.error("Failed to list API keys: %s", exc)
        raise HTTPException(
            status_code=500, detail="Internal server error listing keys"
        ) from exc


@router.post("", response_model=ApiKeyCreatedResponse, status_code=201)
def create_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    auth: ClerkAuth = Depends(get_auth),
    role: Role = Depends(require_role(Role.owner, Role.admin)),
) -> ApiKeyCreatedResponse:
    """
    Generate and store a new tenant-scoped API key.
    Returns the plaintext raw key exactly once.
    """
    try:
        tenant_uuid = uuid.UUID(auth.tenant_id)
        
        # 1. Generate secure raw key: pe_k_{token}
        token = secrets.token_urlsafe(32)
        raw_key = f"pe_k_{token}"
        
        # 2. Extract prefix (first 8 chars) and SHA-256 hash
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        db_key = ApiKey(
            tenant_id=tenant_uuid,
            name=payload.name,
            key_hash=key_hash,
            key_prefix=key_prefix,
            created_by=auth.user_id,
            expires_at=payload.expires_at,
            is_active=True,
        )
        db.add(db_key)
        db.commit()
        db.refresh(db_key)
        
        # 3. Construct response mapping directly from database model attributes
        return ApiKeyCreatedResponse(
            id=db_key.id,
            tenant_id=db_key.tenant_id,
            name=db_key.name,
            key_prefix=db_key.key_prefix,
            created_by=db_key.created_by,
            expires_at=db_key.expires_at,
            is_active=db_key.is_active,
            created_at=db_key.created_at,
            raw_key=raw_key,
        )
    except Exception as exc:
        logger.error("Failed to create API key: %s", exc)
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Internal server error creating key"
        ) from exc


@router.delete("/{key_id}", status_code=204)
def delete_key(
    key_id: uuid.UUID,
    db: Session = Depends(get_db),
    auth: ClerkAuth = Depends(get_auth),
    role: Role = Depends(require_role(Role.owner, Role.admin)),
):
    """
    Soft-delete an API key by ID (sets is_active=False).
    Only allowed for keys belonging to the current tenant.
    """
    try:
        tenant_uuid = uuid.UUID(auth.tenant_id)
        db_key = (
            db.query(ApiKey)
            .filter(ApiKey.id == key_id, ApiKey.tenant_id == tenant_uuid)
            .first()
        )
        
        if db_key is None:
            raise HTTPException(status_code=404, detail="API key not found")
            
        db_key.is_active = False
        db.commit()
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete API key: %s", exc)
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Internal server error deleting key"
        ) from exc
