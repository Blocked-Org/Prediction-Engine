"""
Clerk JWT authentication for the PredictionEngine backend.

Provides:
  - ``verify_clerk_token``  — decodes & verifies a Clerk-issued JWT via JWKS
  - ``_resolve_tenant_id``  — maps ``org_id`` → ``tenant_id`` via the
    ``organizations`` table
  - ``ClerkAuth``           — lightweight value object passed through
    ``request.state.auth`` and available to route handlers
  - ``get_current_tenant``  — FastAPI dependency that wires everything
    together (JWT → org_id → tenant_id → ContextVar)

Security model
--------------
The Clerk front-end SDK sends an ``Authorization: Bearer <token>`` header
whose payload includes ``org_id`` (the currently-selected Clerk
Organization).  This module validates the signature against Clerk's JWKS
endpoint, extracts ``org_id``, resolves it to our internal ``tenant_id``,
and writes the result into ``tenant_context`` (a ``ContextVar``).

The ``ClerkTenantMiddleware`` in ``src.api.middleware`` invokes these
helpers *before* any route handler runs, so downstream code (SQLAlchemy
RLS, PostgreSQL queries) automatically operates in the correct tenant scope.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from functools import lru_cache
from typing import Any, Dict, Optional

import jwt  # PyJWT — kept at module scope so tests can patch ``src.api.auth.jwt``
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from src.api.db.database import SessionLocal, tenant_context
from src.api.models import Organization

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# RBAC & Role Management
# ---------------------------------------------------------------------------

class Role(str, Enum):
    owner = "owner"
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


def _normalize_clerk_role(role_str: Optional[str]) -> Role:
    """Map Clerk's 'org:admin' or similar role strings to our Role enum."""
    if not role_str:
        return Role.viewer

    cleaned = role_str.lower().strip()
    # Strip any prefix like 'org:' or 'role:' just in case
    if ":" in cleaned:
        cleaned = cleaned.split(":", 1)[1]

    if cleaned == "owner":
        return Role.owner
    elif cleaned == "admin":
        return Role.admin
    elif cleaned == "analyst":
        return Role.analyst
    else:
        return Role.viewer




# ---------------------------------------------------------------------------
# Configuration — sourced from environment variables
# ---------------------------------------------------------------------------
# Clerk publishes its JWKS at ``https://<your-clerk-domain>/.well-known/jwks.json``
# The frontend's publishable key encodes the domain, but the backend only needs
# the JWKS URL and expected issuer/audience.

_CLERK_JWKS_URL: str = os.getenv(
    "CLERK_JWKS_URL",
    # Fallback: derive from the Clerk domain env-var (the frontend's
    # publishable-key domain is usually ``<slug>.clerk.accounts.dev``).
    "https://driven-crab-79.clerk.accounts.dev/.well-known/jwks.json",
)

_CLERK_ISSUER: str | None = os.getenv("CLERK_ISSUER")  # e.g. "https://driven-crab-79.clerk.accounts.dev"
_CLERK_AUDIENCE: str | None = os.getenv("CLERK_AUDIENCE")  # optional; set if you configured an audience in Clerk

# JWT algorithms accepted — Clerk signs with RS256.
_JWT_ALGORITHMS: list[str] = ["RS256"]


# ---------------------------------------------------------------------------
# JWKS Client (cached singleton)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    """Return a cached ``PyJWKClient`` pointing at Clerk's JWKS endpoint."""
    return PyJWKClient(_CLERK_JWKS_URL)


# ---------------------------------------------------------------------------
# JWT verification
# ---------------------------------------------------------------------------

def verify_clerk_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a Clerk-issued JWT.

    Parameters
    ----------
    token : str
        Raw JWT string (without the ``Bearer `` prefix).

    Returns
    -------
    dict
        The decoded JWT claims (``sub``, ``org_id``, ``org_role``, etc.).

    Raises
    ------
    fastapi.HTTPException
        401 if the token is expired, malformed, or its signature is invalid.
    """
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)

        # Build decode options -------------------------------------------------
        decode_kwargs: Dict[str, Any] = {
            "algorithms": _JWT_ALGORITHMS,
        }

        # Clerk tokens always have ``iss``; only enforce it if we configured one.
        if _CLERK_ISSUER:
            decode_kwargs["issuer"] = _CLERK_ISSUER

        # Audience is optional — Clerk doesn't set ``aud`` by default.
        if _CLERK_AUDIENCE:
            decode_kwargs["audience"] = _CLERK_AUDIENCE
        else:
            # Don't fail on missing audience when we haven't configured one.
            decode_kwargs["options"] = {"verify_aud": False}

        claims = jwt.decode(token, signing_key.key, **decode_kwargs)
        return claims

    except jwt.ExpiredSignatureError as exc:
        logger.warning("Clerk JWT expired: %s", exc)
        raise HTTPException(
            status_code=401,
            detail="Token has expired. Please re-authenticate.",
        ) from exc

    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid Clerk JWT: %s", exc)
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials.",
        ) from exc

    except Exception as exc:
        # Catch-all for network errors fetching JWKS, etc.
        logger.error("Unexpected error verifying Clerk JWT: %s", exc)
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials.",
        ) from exc


# ---------------------------------------------------------------------------
# Org → Tenant mapping
# ---------------------------------------------------------------------------

def _resolve_tenant_id(org_id: str, db: Session) -> str:
    """
    Look up ``org_id`` (Clerk's Organization ID, e.g. ``org_2xYz…``) in the
    ``organizations`` table and return the corresponding ``tenant_id`` as a
    string UUID.

    Parameters
    ----------
    org_id : str
        The ``org_id`` claim from the Clerk JWT.
    db : Session
        An open SQLAlchemy session.

    Returns
    -------
    str
        The UUID of the tenant (as a string).

    Raises
    ------
    fastapi.HTTPException
        403 if the org is not provisioned in our database.
    """
    row = (
        db.query(Organization)
        .filter(Organization.clerk_org_id == org_id)
        .first()
    )

    if row is None:
        logger.warning(
            "Clerk org_id '%s' is not mapped to any tenant — rejecting request.",
            org_id,
        )
        raise HTTPException(
            status_code=403,
            detail=f"Organization '{org_id}' is not provisioned. "
                   f"Please contact your administrator.",
        )

    return str(row.tenant_id)


# ---------------------------------------------------------------------------
# ClerkAuth value object
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ClerkAuth:
    """
    Immutable value object carrying the resolved identity for one request.

    Attached to ``request.state.auth`` by the middleware so that any route
    handler can access the tenant-scoped identity:

        auth: ClerkAuth = request.state.auth
        # PostgreSQL RLS is automatically scoped via tenant_context ContextVar
    """

    user_id: str
    org_id: str
    tenant_id: str
    org_role: Optional[str] = None
    claims: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# FastAPI dependency (alternative to the middleware — useful for per-route
# opt-in auth or testing individual endpoints)
# ---------------------------------------------------------------------------

def get_current_tenant(request: Request) -> ClerkAuth:
    """
    FastAPI dependency that:
      1. Extracts the Bearer token from the ``Authorization`` header
      2. Verifies the Clerk JWT
      3. Resolves ``org_id`` → ``tenant_id`` via the organizations table
      4. Sets ``tenant_context`` ContextVar for PostgreSQL RLS
      5. Returns a ``ClerkAuth`` object

    Usage::

        @app.get("/api/v1/my-route")
        def my_route(auth: ClerkAuth = Depends(get_current_tenant)):
            ...

    Raises
    ------
    fastapi.HTTPException
        401 for missing / invalid token; 403 for missing org or unmapped org.
    """
    # --- Extract Bearer token ------------------------------------------------
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header. "
                   "Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Empty Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- Verify JWT ----------------------------------------------------------
    claims = verify_clerk_token(token)

    # --- Extract identity ----------------------------------------------------
    user_id: str = claims.get("sub", "")
    org_id: str = claims.get("org_id", "")
    org_role = claims.get("org_role")

    if not user_id:
        raise HTTPException(status_code=401, detail="JWT missing 'sub' claim.")

    if not org_id:
        raise HTTPException(
            status_code=403,
            detail="No organization selected. Please select or create "
                   "an organization in the Clerk dashboard first.",
        )

    # --- Resolve tenant_id ---------------------------------------------------
    db = SessionLocal()
    try:
        tenant_id = _resolve_tenant_id(org_id, db)
    finally:
        db.close()

    # --- Set ContextVar for RLS ----------------------------------------------
    tenant_context.set(tenant_id)

    return ClerkAuth(
        user_id=user_id,
        org_id=org_id,
        org_role=org_role,
        tenant_id=tenant_id,
        claims=claims,
    )


def get_current_user_role(auth_obj: ClerkAuth = Depends(get_current_tenant)) -> Role:
    """FastAPI dependency that reads org_role from auth context and normalizes it."""
    if not auth_obj:
        # Safely default to viewer if no auth state is found
        return Role.viewer
    return _normalize_clerk_role(auth_obj.org_role)


def require_role(*allowed_roles: Role):
    """Dependency factory that returns a dependency callable enforcing specific roles."""
    def dependency(role: Role = Depends(get_current_user_role)) -> Role:
        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Role '{role.value}' does not have access. Allowed roles: {[r.value for r in allowed_roles]}",
            )
        return role
    return dependency


def get_auth(auth_obj: ClerkAuth = Depends(get_current_tenant)) -> ClerkAuth:
    """FastAPI convenience dependency that returns the authenticated tenant."""
    if not auth_obj:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials not found.",
        )
    return auth_obj


def require_authenticated_user(request: Request) -> ClerkAuth:
    """FastAPI dependency that validates the JWT but does NOT require ``org_id``.

    This is designed for routes that must work before the user has created
    or selected a Clerk Organization — e.g. the onboarding ``/init`` endpoint.

    It verifies the token signature and extracts ``sub`` (user_id), but
    allows ``org_id`` to be empty.  If an ``org_id`` *is* present, tenant
    resolution is attempted (best-effort, non-blocking on 403).
    """
    # --- Extract Bearer token ------------------------------------------------
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header. "
                   "Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Empty Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- Verify JWT ----------------------------------------------------------
    claims = verify_clerk_token(token)

    user_id: str = claims.get("sub", "")
    org_id: str = claims.get("org_id", "")
    org_role = claims.get("org_role")

    if not user_id:
        raise HTTPException(status_code=401, detail="JWT missing 'sub' claim.")

    # --- Best-effort tenant resolution (org_id is optional) ------------------
    tenant_id = ""
    if org_id:
        db = SessionLocal()
        try:
            tenant_id = _resolve_tenant_id(org_id, db)
            tenant_context.set(tenant_id)
        except HTTPException:
            # Org not provisioned yet — that's OK for onboarding
            logger.debug(
                "Org '%s' not provisioned yet (user=%s) — proceeding without tenant.",
                org_id,
                user_id,
            )
        finally:
            db.close()

    return ClerkAuth(
        user_id=user_id,
        org_id=org_id,
        org_role=org_role,
        tenant_id=tenant_id,
        claims=claims,
    )
