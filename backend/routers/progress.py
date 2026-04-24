"""维权进度追踪"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from db_models import ProgressTracker, ProgressEvent, User
from middleware.auth_middleware import get_current_user
import uuid

router = APIRouter(prefix="/api/progress", tags=["progress"])

STAGES = ["notice", "complaint", "mediation", "arbitration", "lawsuit", "enforcement"]
STAGE_LABELS = {
    "notice": "发催款通知", "complaint": "投诉住建委",
    "mediation": "申请调解", "arbitration": "申请仲裁",
    "lawsuit": "提起诉讼", "enforcement": "申请执行",
}


class TrackerCreate(BaseModel):
    title: str
    category_id: Optional[str] = None
    deposit_amount: Optional[float] = None
    rent_end_date: Optional[date] = None
    landlord_name: Optional[str] = None
    city: Optional[str] = None
    chat_session_id: Optional[str] = None


class TrackerUpdate(BaseModel):
    current_stage: Optional[str] = None
    status: Optional[str] = None
    recovered_amount: Optional[float] = None


class EventCreate(BaseModel):
    stage: str
    event_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    event_date: date
    is_milestone: bool = False


def tracker_to_dict(t: ProgressTracker) -> dict:
    return {
        "id": t.id, "title": t.title, "category_id": t.category_id,
        "deposit_amount": float(t.deposit_amount) if t.deposit_amount else None,
        "landlord_name": t.landlord_name, "city": t.city,
        "current_stage": t.current_stage,
        "current_stage_label": STAGE_LABELS.get(t.current_stage, t.current_stage),
        "status": t.status,
        "recovered_amount": float(t.recovered_amount) if t.recovered_amount else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def event_to_dict(e: ProgressEvent) -> dict:
    return {
        "id": e.id, "stage": e.stage, "stage_label": STAGE_LABELS.get(e.stage, e.stage),
        "event_type": e.event_type, "title": e.title, "description": e.description,
        "event_date": e.event_date.isoformat() if e.event_date else None,
        "is_milestone": e.is_milestone,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.post("", status_code=201)
async def create_tracker(
    req: TrackerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tracker = ProgressTracker(
        id=str(uuid.uuid4()), user_id=user.id,
        title=req.title, category_id=req.category_id,
        deposit_amount=req.deposit_amount,
        rent_end_date=req.rent_end_date,
        landlord_name=req.landlord_name, city=req.city,
        chat_session_id=req.chat_session_id,
    )
    db.add(tracker)
    await db.commit()
    return tracker_to_dict(tracker)


@router.get("")
async def list_trackers(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProgressTracker)
        .where(ProgressTracker.user_id == user.id)
        .order_by(desc(ProgressTracker.updated_at))
    )
    return {"trackers": [tracker_to_dict(t) for t in result.scalars().all()]}


@router.get("/{tracker_id}")
async def get_tracker(tracker_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProgressTracker).where(ProgressTracker.id == tracker_id, ProgressTracker.user_id == user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="进度追踪不存在")

    events_result = await db.execute(
        select(ProgressEvent).where(ProgressEvent.tracker_id == tracker_id).order_by(ProgressEvent.event_date)
    )
    events = events_result.scalars().all()
    data = tracker_to_dict(t)
    data["events"] = [event_to_dict(e) for e in events]
    data["stages"] = [{"id": s, "label": STAGE_LABELS[s]} for s in STAGES]
    return data


@router.patch("/{tracker_id}")
async def update_tracker(
    tracker_id: str, req: TrackerUpdate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProgressTracker).where(ProgressTracker.id == tracker_id, ProgressTracker.user_id == user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="进度追踪不存在")

    if req.current_stage is not None:
        t.current_stage = req.current_stage
    if req.status is not None:
        t.status = req.status
    if req.recovered_amount is not None:
        t.recovered_amount = req.recovered_amount
    await db.commit()
    return tracker_to_dict(t)


@router.post("/{tracker_id}/events", status_code=201)
async def add_event(
    tracker_id: str, req: EventCreate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProgressTracker).where(ProgressTracker.id == tracker_id, ProgressTracker.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="进度追踪不存在")

    event = ProgressEvent(
        id=str(uuid.uuid4()), tracker_id=tracker_id,
        stage=req.stage, event_type=req.event_type,
        title=req.title, description=req.description,
        event_date=req.event_date, is_milestone=req.is_milestone,
    )
    db.add(event)
    await db.commit()
    return event_to_dict(event)


@router.delete("/{tracker_id}")
async def delete_tracker(tracker_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProgressTracker).where(ProgressTracker.id == tracker_id, ProgressTracker.user_id == user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="进度追踪不存在")
    await db.delete(t)
    await db.commit()
    return {"message": "已删除"}
