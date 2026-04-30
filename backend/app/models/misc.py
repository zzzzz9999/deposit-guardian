"""Miscellaneous ORM models: blacklist, city, documents, deposit calc."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ── 黑名单 ────────────────────────────────────────────────────────────────────

class BlacklistEntry(Base):
    __tablename__ = "blacklist_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    reporter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    entity_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    id_card_last4: Mapped[Optional[str]] = mapped_column(String(4))
    agency_name: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(50))
    district: Mapped[Optional[str]] = mapped_column(String(50))
    address_hint: Mapped[Optional[str]] = mapped_column(String(200))
    dispute_type: Mapped[Optional[str]] = mapped_column(String(50))
    amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    report_count: Mapped[int] = mapped_column(Integer, default=1)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ── 城市专项信息 ──────────────────────────────────────────────────────────────

class City(Base):
    __tablename__ = "cities"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    province: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)

    policies: Mapped[list["CityPolicy"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["CityContact"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    verdicts: Mapped[list["CityVerdict"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )


class CityPolicy(Base):
    __tablename__ = "city_policies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    city_id: Mapped[str] = mapped_column(String(50), ForeignKey("cities.id"))
    policy_type: Mapped[Optional[str]] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    effective_date: Mapped[Optional[datetime]] = mapped_column(Date)
    source_url: Mapped[Optional[str]] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    city: Mapped["City"] = relationship(back_populates="policies")


class CityContact(Base):
    __tablename__ = "city_contacts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    city_id: Mapped[str] = mapped_column(String(50), ForeignKey("cities.id"))
    department: Mapped[Optional[str]] = mapped_column(String(100))
    contact_type: Mapped[Optional[str]] = mapped_column(String(20))
    value: Mapped[Optional[str]] = mapped_column(String(300))
    note: Mapped[Optional[str]] = mapped_column(String(200))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    city: Mapped["City"] = relationship(back_populates="contacts")


class CityVerdict(Base):
    __tablename__ = "city_verdicts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    city_id: Mapped[str] = mapped_column(String(50), ForeignKey("cities.id"))
    case_reference: Mapped[Optional[str]] = mapped_column(String(200))
    court: Mapped[Optional[str]] = mapped_column(String(100))
    year: Mapped[Optional[int]] = mapped_column(SmallInteger)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    outcome: Mapped[Optional[str]] = mapped_column(String(50))
    source_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    city: Mapped["City"] = relationship(back_populates="verdicts")


# ── 生成文档记录 ──────────────────────────────────────────────────────────────

class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    doc_type: Mapped[str] = mapped_column(String(30), nullable=False)
    form_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ── 押金计算记录 ──────────────────────────────────────────────────────────────

class DepositCalculation(Base):
    __tablename__ = "deposit_calculations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    deposit_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    rent_monthly: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    rent_months: Mapped[Optional[int]] = mapped_column(SmallInteger)
    city: Mapped[Optional[str]] = mapped_column(String(50))
    deduction_items: Mapped[Optional[dict]] = mapped_column(JSON)
    recoverable_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    calculation_detail: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
