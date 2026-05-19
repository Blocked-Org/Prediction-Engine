import os
from typing import Generator, Optional
from contextvars import ContextVar

from fastapi import Header, HTTPException
from sqlalchemy import create_engine, event, Engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base

# Define the connection URL (this should be configured via environment variables)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://app_user:secure_password_here@localhost:5432/postgres"
)

# 1. Thread-safe ContextVar to manage current_tenant_id
# ContextVar natively supports async/await and thread-based concurrency models in FastAPI
tenant_context: ContextVar[Optional[str]] = ContextVar("tenant_context", default=None)

# 2. SQLAlchemy Engine and Session Setup
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 3. SQLAlchemy Event Listener for RLS
# Note: You requested @event.listens_for(Session, "before_cursor_execute").
# In SQLAlchemy, "before_cursor_execute" is actually an event on the Engine or Connection object.
# Attempting to attach it to Session will throw an InvalidRequestError.
# Therefore, I am attaching it to the Engine, which achieves exactly what you want: 
# intercepting the raw cursor right before it executes the query.

@event.listens_for(Engine, "before_cursor_execute")
def set_tenant_context(conn, cursor, statement, parameters, context, executemany):
    """
    Automatically injects the SET LOCAL command before a query executes
    if a tenant_id exists in the current thread/async context.
    """
    tenant_id = tenant_context.get()
    
    if tenant_id:
        # We must prevent infinite recursion by ensuring we don't intercept our own SET LOCAL command
        if not statement.startswith("SET LOCAL"):
            # SET LOCAL is scoped to the current transaction.
            cursor.execute(f"SET LOCAL app.current_tenant_id = '{tenant_id}';")

# Alternative: If you specifically want to attach an event to the Session object,
# the correct SQLAlchemy 2.0 event is 'do_orm_execute' or 'after_begin':
#
# @event.listens_for(Session, "after_begin")
# def receive_after_begin(session, transaction, connection):
#     tenant_id = tenant_context.get()
#     if tenant_id:
#         connection.exec_driver_sql(f"SET LOCAL app.current_tenant_id = '{tenant_id}';")


# 4. FastAPI Dependency
def get_db_session(x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")) -> Generator[Session, None, None]:
    """
    FastAPI dependency that extracts the tenant_id from the incoming request header,
    binds it to the ContextVar, and yields an isolated database session.
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=400, 
            detail="X-Tenant-ID header is missing. Tenant context is required."
        )
    
    # Set the ContextVar for the current request flow
    token = tenant_context.set(x_tenant_id)
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Reset the context variable to its previous state to ensure no bleed-over
        tenant_context.reset(token)
