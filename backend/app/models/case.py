"""Case library ORM models."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


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
    category_id: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("case_categories.id")
    )
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Optional["CaseCategory"]] = relationship(back_populates="cases")
    keywords: Mapped[list["CaseKeyword"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    landlord_scripts: Mapped[list["CaseLandlordScript"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    legal_bases: Mapped[list["CaseLegalBasis"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    action_steps: Mapped[list["CaseActionStep"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="CaseActionStep.step_num",
    )
    templates: Mapped[list["CaseTemplate"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    complaint_channels: Mapped[list["CaseComplaintChannel"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    outcome_examples: Mapped[list["CaseOutcomeExample"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    evidence_needed: Mapped[list["CaseEvidenceNeeded"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


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


class CaseSubmission(Base):
    __tablename__ = "case_submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    category_id: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("case_categories.id")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(50))
    deposit_amount: Mapped[Optional[float]] = mapped_column()
    rent_months: Mapped[Optional[int]] = mapped_column(SmallInteger)
    outcome: Mapped[Optional[str]] = mapped_column(String(50))
    recovered_amount: Mapped[Optional[float]] = mapped_column()
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id")
    )
    review_note: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    published_case_id: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("cases.id")
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
