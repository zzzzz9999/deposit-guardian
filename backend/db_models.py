"""所有 SQLAlchemy ORM 表定义"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, Boolean, Integer, SmallInteger, Numeric,
    DateTime, Date, ForeignKey, ARRAY, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base


def gen_uuid():
    return str(uuid.uuid4())


# ── 用户系统 ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    progress_trackers: Mapped[list["ProgressTracker"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    device_info: Mapped[Optional[str]] = mapped_column(String(200))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


# ── 案例库 ────────────────────────────────────────────────────────────────────

class CaseCategory(Base):
    __tablename__ = "case_categories"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(10))
    color: Mapped[Optional[str]] = mapped_column(String(20))
    group_name: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)

    cases: Mapped[list["Case"]] = relationship(back_populates="category")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    category_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("case_categories.id"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[Optional[str]] = mapped_column(String(300))
    difficulty: Mapped[Optional[str]] = mapped_column(String(20))
    success_rate: Mapped[Optional[int]] = mapped_column(SmallInteger)
    description: Mapped[Optional[str]] = mapped_column(Text)
    source: Mapped[Optional[str]] = mapped_column(String(100))
    court_reference: Mapped[Optional[str]] = mapped_column(String(300))
    verdict_year: Mapped[Optional[int]] = mapped_column(SmallInteger)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category: Mapped[Optional["CaseCategory"]] = relationship(back_populates="cases")
    keywords: Mapped[list["CaseKeyword"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    landlord_scripts: Mapped[list["CaseLandlordScript"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    legal_bases: Mapped[list["CaseLegalBasis"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    action_steps: Mapped[list["CaseActionStep"]] = relationship(back_populates="case", cascade="all, delete-orphan", order_by="CaseActionStep.step_num")
    templates: Mapped[list["CaseTemplate"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    complaint_channels: Mapped[list["CaseComplaintChannel"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    outcome_examples: Mapped[list["CaseOutcomeExample"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    evidence_needed: Mapped[list["CaseEvidenceNeeded"]] = relationship(back_populates="case", cascade="all, delete-orphan")


class CaseKeyword(Base):
    __tablename__ = "case_keywords"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    keyword: Mapped[str] = mapped_column(String(100), nullable=False)
    case: Mapped["Case"] = relationship(back_populates="keywords")


class CaseLandlordScript(Base):
    __tablename__ = "case_landlord_scripts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    script: Mapped[str] = mapped_column(Text, nullable=False)
    case: Mapped["Case"] = relationship(back_populates="landlord_scripts")


class CaseLegalBasis(Base):
    __tablename__ = "case_legal_bases"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    law: Mapped[Optional[str]] = mapped_column(String(100))
    content: Mapped[Optional[str]] = mapped_column(Text)
    case: Mapped["Case"] = relationship(back_populates="legal_bases")


class CaseActionStep(Base):
    __tablename__ = "case_action_steps"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    step_num: Mapped[Optional[int]] = mapped_column(SmallInteger)
    title: Mapped[Optional[str]] = mapped_column(String(100))
    detail: Mapped[Optional[str]] = mapped_column(Text)
    case: Mapped["Case"] = relationship(back_populates="action_steps")


class CaseTemplate(Base):
    __tablename__ = "case_templates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    title: Mapped[Optional[str]] = mapped_column(String(100))
    content: Mapped[Optional[str]] = mapped_column(Text)
    case: Mapped["Case"] = relationship(back_populates="templates")


class CaseComplaintChannel(Base):
    __tablename__ = "case_complaint_channels"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    name: Mapped[Optional[str]] = mapped_column(String(100))
    type: Mapped[Optional[str]] = mapped_column(String(20))
    case: Mapped["Case"] = relationship(back_populates="complaint_channels")


class CaseOutcomeExample(Base):
    __tablename__ = "case_outcome_examples"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    example: Mapped[Optional[str]] = mapped_column(Text)
    case: Mapped["Case"] = relationship(back_populates="outcome_examples")


class CaseEvidenceNeeded(Base):
    __tablename__ = "case_evidence_needed"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("cases.id", ondelete="CASCADE"))
    evidence: Mapped[Optional[str]] = mapped_column(Text)
    case: Mapped["Case"] = relationship(back_populates="evidence_needed")


# ── AI 对话历史 ───────────────────────────────────────────────────────────────

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    __table_args__ = (Index("ix_chatsession_user_updated", "user_id", "updated_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(200))
    category: Mapped[Optional[str]] = mapped_column(String(50))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chatmessage_session_created", "session_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["ChatSession"] = relationship(back_populates="messages")


# ── 维权进度追踪 ──────────────────────────────────────────────────────────────

class ProgressTracker(Base):
    __tablename__ = "progress_trackers"
    __table_args__ = (Index("ix_progress_user_updated", "user_id", "updated_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("case_categories.id"))
    deposit_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    rent_end_date: Mapped[Optional[datetime]] = mapped_column(Date)
    landlord_name: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(50))
    current_stage: Mapped[str] = mapped_column(String(30), default="notice")
    status: Mapped[str] = mapped_column(String(20), default="active")
    recovered_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    chat_session_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("chat_sessions.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="progress_trackers")
    events: Mapped[list["ProgressEvent"]] = relationship(back_populates="tracker", cascade="all, delete-orphan", order_by="ProgressEvent.event_date")


class ProgressEvent(Base):
    __tablename__ = "progress_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tracker_id: Mapped[str] = mapped_column(String(36), ForeignKey("progress_trackers.id", ondelete="CASCADE"), nullable=False)
    stage: Mapped[str] = mapped_column(String(30), nullable=False)
    event_type: Mapped[Optional[str]] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    event_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tracker: Mapped["ProgressTracker"] = relationship(back_populates="events")


# ── 案例投稿 ──────────────────────────────────────────────────────────────────

class CaseSubmission(Base):
    __tablename__ = "case_submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    category_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("case_categories.id"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(50))
    deposit_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    rent_months: Mapped[Optional[int]] = mapped_column(SmallInteger)
    outcome: Mapped[Optional[str]] = mapped_column(String(50))
    recovered_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    review_note: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    published_case_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("cases.id"))
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ── 黑名单 ────────────────────────────────────────────────────────────────────

class BlacklistEntry(Base):
    __tablename__ = "blacklist_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    reporter_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ── 城市专项信息 ──────────────────────────────────────────────────────────────

class City(Base):
    __tablename__ = "cities"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    province: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)

    policies: Mapped[list["CityPolicy"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    contacts: Mapped[list["CityContact"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    verdicts: Mapped[list["CityVerdict"]] = relationship(back_populates="city", cascade="all, delete-orphan")


class CityPolicy(Base):
    __tablename__ = "city_policies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    city_id: Mapped[str] = mapped_column(String(50), ForeignKey("cities.id"))
    policy_type: Mapped[Optional[str]] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    effective_date: Mapped[Optional[datetime]] = mapped_column(Date)
    source_url: Mapped[Optional[str]] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    city: Mapped["City"] = relationship(back_populates="policies")


class CityContact(Base):
    __tablename__ = "city_contacts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    city_id: Mapped[str] = mapped_column(String(50), ForeignKey("cities.id"))
    department: Mapped[Optional[str]] = mapped_column(String(100))
    contact_type: Mapped[Optional[str]] = mapped_column(String(20))
    value: Mapped[Optional[str]] = mapped_column(String(300))
    note: Mapped[Optional[str]] = mapped_column(String(200))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    city: Mapped["City"] = relationship(back_populates="verdicts")


# ── 生成文档记录 ──────────────────────────────────────────────────────────────

class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    doc_type: Mapped[str] = mapped_column(String(30), nullable=False)
    form_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ── 押金计算记录 ──────────────────────────────────────────────────────────────

class DepositCalculation(Base):
    __tablename__ = "deposit_calculations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    deposit_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    rent_monthly: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    rent_months: Mapped[Optional[int]] = mapped_column(SmallInteger)
    city: Mapped[Optional[str]] = mapped_column(String(50))
    deduction_items: Mapped[Optional[dict]] = mapped_column(JSON)
    recoverable_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    calculation_detail: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
