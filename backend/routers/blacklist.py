"""房东/中介黑名单"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from database import get_db
from db_models import BlacklistEntry, User
from middleware.auth_middleware import get_optional_user, get_current_user, require_admin
import uuid

router = APIRouter(prefix="/api/blacklist", tags=["blacklist"])


class ReportRequest(BaseModel):
    entity_type: str  # 'landlord' | 'agency'
    entity_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address_hint: Optional[str] = None
    dispute_type: Optional[str] = None
    amount: Optional[float] = None
    description: str
    is_anonymous: bool = False


def mask_name(name: str) -> str:
    if len(name) <= 1:
        return name
    return name[0] + "*" * (len(name) - 1)


def mask_phone(phone: str) -> str:
    if not phone or len(phone) < 7:
        return phone
    return phone[:3] + "****" + phone[-4:]


def entry_to_dict(e: BlacklistEntry, show_details: bool = False) -> dict:
    return {
        "id": e.id,
        "entity_type": e.entity_type,
        "entity_name": e.entity_name if show_details else mask_name(e.entity_name),
        "phone": mask_phone(e.phone) if e.phone else None,
        "city": e.city, "district": e.district,
        "address_hint": e.address_hint,
        "dispute_type": e.dispute_type,
        "amount": float(e.amount) if e.amount else None,
        "description": e.description,
        "status": e.status,
        "report_count": e.report_count,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.post("/report", status_code=201)
async def report(
    req: ReportRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    entry = BlacklistEntry(
        id=str(uuid.uuid4()),
        reporter_id=user.id if user and not req.is_anonymous else None,
        entity_type=req.entity_type,
        entity_name=req.entity_name,
        phone=req.phone,
        city=req.city,
        district=req.district,
        address_hint=req.address_hint,
        dispute_type=req.dispute_type,
        amount=req.amount,
        description=req.description,
        status="pending",
    )
    db.add(entry)
    await db.commit()
    return {"id": entry.id, "status": "pending", "message": "举报已提交，审核通过后将公开显示。感谢你保护其他租客！"}


@router.get("/search")
async def search(
    q: str = Query("", description="姓名/电话/地址关键词"),
    city: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(BlacklistEntry).where(BlacklistEntry.status == "verified")

    if q:
        query = query.where(or_(
            BlacklistEntry.entity_name.ilike(f"%{q}%"),
            BlacklistEntry.phone.ilike(f"%{q}%"),
            BlacklistEntry.address_hint.ilike(f"%{q}%"),
        ))
    if city:
        query = query.where(BlacklistEntry.city == city)
    if entity_type:
        query = query.where(BlacklistEntry.entity_type == entity_type)

    query = query.order_by(desc(BlacklistEntry.report_count), desc(BlacklistEntry.created_at))
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    entries = result.scalars().all()

    show_details = user is not None
    return {
        "entries": [entry_to_dict(e, show_details) for e in entries],
        "disclaimer": "以上信息均为用户举报，已经人工审核，但不保证完全准确。如有异议请联系我们。"
    }


# 管理员审核接口
@router.patch("/admin/{entry_id}")
async def admin_review(
    entry_id: str,
    data: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(BlacklistEntry).where(BlacklistEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="条目不存在")

    if "status" in data:
        entry.status = data["status"]
    await db.commit()
    return entry_to_dict(entry, show_details=True)
