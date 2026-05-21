"""
FastAPI middleware for Clerk multi-tenant authentication.

Provides ``ClerkTenantMiddleware`` — a **non-blocking** Starlette middleware
that enriches requests with tenant context when a valid Clerk JWT is present.

Behaviour
---------
- If a valid ``Authorization: Bearer <token>`` is present, the middleware
  decodes it, resolves ``org_id`` → ``tenant_id``, sets the ``tenant_context``
  ContextVar, and attaches a ``ClerkAuth`` to ``request.state.auth``.
- If no token or an invalid token is provided, the request **passes through**
  without auth context.  Route handlers that require auth should use
  ``Depends(get_current_tenant)`` from ``src.api.auth`` which will reject
  unauthenticated requests with 401/403.

This design lets existing unauthenticated routes continue working while
new routes opt-in to tenant-scoped auth via the dependency.
"""

from __future__ import annotations

import logging
from typing import Set

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

import src.api.auth as auth_module
from src.api.db.database import SessionLocal, tenant_context

logger = logging.getLogger(__name__)


class ClerkTenantMiddleware(BaseHTTPMiddleware):
    """
    **Non-blocking** ASGI middleware that enriches requests with tenant context.

    When a valid Clerk JWT is found, it:
      1. Decodes the JWT via JWKS verification
      2. Resolves ``org_id`` → ``tenant_id`` via the organizations table
      3. Sets ``tenant_context`` ContextVar for PostgreSQL RLS
      4. Attaches ``ClerkAuth`` to ``request.state.auth``

    When no token is present, the request passes through unchanged.
    Use ``Depends(get_current_tenant)`` on individual routes to enforce auth.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # --- Try to extract Bearer token ---
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return await call_next(request)

        # --- Attempt JWT verification (non-blocking on failure) ---
        try:
            claims = auth_module.verify_clerk_token(token)
        except Exception as exc:
            logger.debug("JWT verification failed (non-blocking): %s", exc)
            return await call_next(request)

        # --- Extract identity ---
        user_id: str = claims.get("sub", "")
        org_id: str = claims.get("org_id", "")
        org_role = claims.get("org_role")

        if not user_id or not org_id:
            return await call_next(request)

        # --- Resolve tenant_id (non-blocking on failure) ---
        db = SessionLocal()
        try:
            try:
                tenant_id = auth_module._resolve_tenant_id(org_id, db)
            except Exception:
                logger.debug(
                    "Tenant resolution failed for org=%s (non-blocking)", org_id
                )
                return await call_next(request)
        finally:
            db.close()

        # --- Inject tenant context ---
        token_reset = tenant_context.set(tenant_id)

        # Attach resolved auth to request.state for route handlers
        request.state.auth = auth_module.ClerkAuth(
            user_id=user_id,
            org_id=org_id,
            org_role=org_role,
            tenant_id=tenant_id,
            claims=claims,
        )

        try:
            response = await call_next(request)
        finally:
            # Reset ContextVar to prevent bleed between requests
            tenant_context.reset(token_reset)

        return response
