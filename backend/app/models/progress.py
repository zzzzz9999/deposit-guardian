"""Progress tracker and event ORM models."""
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Date, ForeignKey, Index, Numeric, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User


def gen_uuid() -> str:
    return str(uuid.uuid4())


class ProgressTracker(Base):
    __tablename__ = "progress_trackers"
    __table_args__ = (Index("ix_progress_user_updated", "user_id", "updated_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category_id: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("case_categories.id")
    )
    deposit_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    rent_end_date: Mapped[Optional[datetime]] = mapped_column(Date)
    landlord_name: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(50))
    current_stage: Mapped[str] = mapped_column(String(30), default="notice")
    status: Mapped[str] = mapped_column(String(20), default="active")
    recovered_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    chat_session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("chat_sessions.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="progress_trackers")
    events: Mapped[list["ProgressEvent"]] = relationship(
        back_populates="tracker",
        cascade="all, delete-orphan",
        order_by="ProgressEvent.event_date",
    )


class ProgressEvent(Base):
    __tablename__ = "progress_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    tracker_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("progress_trackers.id", ondelete="CASCADE"), nullable=False
    )
    stage: Mapped[str] = mapped_column(String(30), nullable=False)
    event_type: Mapped[Optional[str]] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    event_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    tracker: Mapped["ProgressTracker"] = relationship(back_populates="events")
