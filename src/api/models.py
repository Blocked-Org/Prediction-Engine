"""
SQLAlchemy ORM models for the PredictionEngine multi-tenant schema.

Translated from  src/api/db/01_init.sql  and extended with additional
tables requested for the platform (users, organizations, transactions,
simulation_results).

All models use Row-Level Security (RLS) at the Postgres level —
see the first Alembic migration for the CREATE POLICY statements.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ── Shared declarative base ─────────────────────────────────────────
class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


# ── 1. Tenants (from 01_init.sql) ───────────────────────────────────
class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationships
    organizations: Mapped[list["Organization"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    users: Mapped[list["User"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    channels: Mapped[list["Channel"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    campaigns: Mapped[list["Campaign"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    simulation_results: Mapped[list["SimulationResult"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    api_keys: Mapped[list["ApiKey"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )


# ── 2. Organizations (new) ──────────────────────────────────────────
class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    org_name: Mapped[str] = mapped_column(String(255), nullable=False)
    clerk_org_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True,
        comment="Clerk Organization ID (e.g. org_2xyz...) for JWT → tenant mapping",
    )
    slug: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="organizations")


# ── 3. Users (new) ──────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), server_default="member")
    clerk_user_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="users")


# ── 4. Channels (from 01_init.sql) ──────────────────────────────────
class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    channel_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="channels")
    campaigns: Mapped[list["Campaign"]] = relationship(
        back_populates="channel", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_channels_tenant_id", "tenant_id"),
    )


# ── 5. Campaigns (from 01_init.sql) ─────────────────────────────────
class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    channel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_age_range: Mapped[Optional[str]] = mapped_column(String(50))
    target_gender: Mapped[Optional[str]] = mapped_column(String(50))
    target_interest: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), server_default="active")

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="campaigns")
    channel: Mapped["Channel"] = relationship(back_populates="campaigns")
    daily_performance: Mapped[list["DailyAdPerformance"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    simulation_results: Mapped[list["SimulationResult"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_campaigns_tenant_id", "tenant_id"),
        Index("idx_campaigns_channel_id", "channel_id"),
    )


# ── 6. Daily Ad Performance (from 01_init.sql — TimescaleDB hypertable) ─
class DailyAdPerformance(Base):
    __tablename__ = "daily_ad_performance"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        primary_key=True,
    )
    spend: Mapped[float] = mapped_column(
        Numeric(12, 2), server_default="0.00"
    )
    impressions: Mapped[int] = mapped_column(Integer, server_default="0")
    clicks: Mapped[int] = mapped_column(Integer, server_default="0")
    conversions: Mapped[int] = mapped_column(Integer, server_default="0")
    revenue: Mapped[float] = mapped_column(
        Numeric(12, 2), server_default="0.00"
    )

    # relationships
    campaign: Mapped["Campaign"] = relationship(
        back_populates="daily_performance"
    )

    __table_args__ = (
        Index(
            "idx_daily_performance_tenant_campaign_date",
            "tenant_id",
            "campaign_id",
            date.desc(),  # type: ignore[union-attr]
        ),
    )


# ── 7. Transactions (new) ───────────────────────────────────────────
class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
    )
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), server_default="USD")
    type: Mapped[str] = mapped_column(
        String(50), server_default="spend"
    )  # e.g. spend, refund, payout
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="transactions")
    campaign: Mapped[Optional["Campaign"]] = relationship(
        back_populates="transactions"
    )


# ── 8. Simulation Results (new) ─────────────────────────────────────
class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
    )
    projected_roi: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))
    incremental_roas: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))
    pareto_budgets: Mapped[Optional[Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="simulation_results")
    campaign: Mapped[Optional["Campaign"]] = relationship(
        back_populates="simulation_results"
    )


# ── 9. API Keys (new) ──────────────────────────────────────────────────
class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    key_prefix: Mapped[str] = mapped_column(String(8), nullable=False)
    scopes: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="api_keys")
