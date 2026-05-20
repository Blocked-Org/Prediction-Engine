"""
FastAPI middleware for Clerk multi-tenant authentication.

Provides ``ClerkTenantMiddleware`` — a Starlette BaseHTTPMiddleware that:
  1. Skips public routes (health checks, docs, OpenAPI schema)
  2. Decodes the Clerk JWT from ``Authorization: Bearer <token>``
  3. Resolves ``org_id`` → ``tenant_id`` via the organizations table
  4. Sets ``tenant_context`` ContextVar for PostgreSQL RLS
  5. Adds ``X-Tenant-ID`` to the request state for downstream use

Routes that need to opt-out of auth (webhooks, etc.) can be added to
``PUBLIC_PATHS``.
"""

from __future__ import annotations

import logging
from typing import Set

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

import src.api.auth as auth
from src.api.db.database import SessionLocal, tenant_context

logger = logging.getLogger(__name__)

# Paths that do NOT require authentication
PUBLIC_PATHS: Set[str] = {
    "/health",
    "/healthz",
    "/docs",
    "/redoc",
    "/openapi.json",
}

# Path prefixes that are public
PUBLIC_PREFIXES: tuple[str, ...] = (
    "/docs",
    "/redoc",
)


class ClerkTenantMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that enforces Clerk JWT authentication on every request
    and injects the resolved ``tenant_id`` into the request's ContextVar.

    After this middleware runs, any SQLAlchemy session opened via
    ``get_db_session`` will automatically have RLS scoped to the tenant.

    The resolved ``ClerkAuth`` object is attached to ``request.state.auth``
    so route handlers can access ``request.state.auth.tenant_id`` for
    Neo4j queries without re-decoding the JWT.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # --- Skip public routes ---
        if path in PUBLIC_PATHS or path.startswith(PUBLIC_PREFIXES):
            return await call_next(request)

        # --- Skip OPTIONS (CORS preflight) ---
        if request.method == "OPTIONS":
            return await call_next(request)

        # --- Extract Bearer token ---
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={
                    "detail": (
                        "Missing or malformed Authorization header. "
                        "Expected 'Bearer <token>'."
                    )
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Empty Bearer token."},
                headers={"WWW-Authenticate": "Bearer"},
            )

        # --- Verify JWT ---
        try:
            claims = auth.verify_clerk_token(token)
        except Exception as exc:
            # verify_clerk_token raises HTTPException — convert for middleware
            detail = getattr(exc, "detail", "Could not validate credentials.")
            status_code = getattr(exc, "status_code", 401)
            return JSONResponse(
                status_code=status_code,
                content={"detail": detail},
            )

        # --- Extract identity ---
        user_id: str = claims.get("sub", "")
        org_id: str = claims.get("org_id", "")
        org_role = claims.get("org_role")

        if not user_id:
            return JSONResponse(
                status_code=401,
                content={"detail": "JWT missing 'sub' claim."},
            )

        if not org_id:
            return JSONResponse(
                status_code=403,
                content={
                    "detail": (
                        "No organization selected. Please select or create "
                        "an organization in the Clerk dashboard first."
                    )
                },
            )

        # --- Resolve tenant_id ---
        db = SessionLocal()
        try:
            try:
                tenant_id = auth._resolve_tenant_id(org_id, db)
            except Exception as exc:
                detail = getattr(exc, "detail", "Organization not provisioned.")
                status_code = getattr(exc, "status_code", 403)
                return JSONResponse(
                    status_code=status_code,
                    content={"detail": detail},
                )
        finally:
            db.close()

        # --- Inject tenant context ---
        token_reset = tenant_context.set(tenant_id)

        # Attach resolved auth to request.state for route handlers
        request.state.auth = auth.ClerkAuth(
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
