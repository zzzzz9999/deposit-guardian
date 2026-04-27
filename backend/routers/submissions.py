"""案例投稿"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from db_models import CaseSubmission, User
from middleware.auth_middleware import get_optional_user, get_current_user, require_admin
import uuid

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


class SubmissionCreate(BaseModel):
    category_id: Optional[str] = None
    title: str
    description: str
    city: Optional[str] = None
    deposit_amount: Optional[float] = None
    rent_months: Optional[int] = None
    outcome: Optional[str] = None  # 'won'|'lost'|'settled'|'ongoing'
    recovered_amount: Optional[float] = None
    is_anonymous: bool = False
    contact_email: Optional[str] = None


def sub_to_dict(s: CaseSubmission, full: bool = False) -> dict:
    d = {
        "id": s.id, "category_id": s.category_id,
        "title": s.title, "city": s.city,
        "outcome": s.outcome, "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
    if full:
        d["description"] = s.description
        d["deposit_amount"] = float(s.deposit_amount) if s.deposit_amount else None
        d["recovered_amount"] = float(s.recovered_amount) if s.recovered_amount else None
        d["review_note"] = s.review_note
    return d


@router.post("", status_code=201)
async def submit(
    req: SubmissionCreate,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    sub = CaseSubmission(
        id=str(uuid.uuid4()),
        user_id=user.id if user and not req.is_anonymous else None,
        category_id=req.category_id,
        title=req.title, description=req.description,
        city=req.city, deposit_amount=req.deposit_amount,
        rent_months=req.rent_months, outcome=req.outcome,
        recovered_amount=req.recovered_amount,
        is_anonymous=req.is_anonymous,
        contact_email=req.contact_email,
    )
    db.add(sub)
    await db.commit()
    return {"id": sub.id, "status": "pending", "message": "投稿已提交！审核通过后将加入案例库，感谢你的贡献。"}


@router.get("/my")
async def my_submissions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CaseSubmission)
        .where(CaseSubmission.user_id == user.id)
        .order_by(desc(CaseSubmission.created_at))
    )
    return {"submissions": [sub_to_dict(s, full=True) for s in result.scalars().all()]}


# 管理员接口
@router.get("/admin/pending")
async def admin_list(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CaseSubmission).where(CaseSubmission.status == "pending").order_by(CaseSubmission.created_at)
    )
    return {"submissions": [sub_to_dict(s, full=True) for s in result.scalars().all()]}


@router.patch("/admin/{sub_id}")
async def admin_review(
    sub_id: str, data: dict,
    admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(CaseSubmission).where(CaseSubmission.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="投稿不存在")

    from datetime import datetime, timezone
    from db_models import Case as CaseModel
    import uuid as _uuid

    new_status = data.get("status", sub.status)
    sub.status = new_status
    sub.review_note = data.get("review_note")
    sub.reviewed_by = admin.id
    sub.reviewed_at = datetime.now(timezone.utc)

    # 审核通过时将投稿写入案例库
    if new_status == "approved" and not sub.published_case_id:
        case_id = f"usr_{sub.id[:8]}"
        new_case = CaseModel(
            id=case_id,
            category_id=sub.category_id,
            title=sub.title,
            subtitle=f"{sub.city or ''}·用户真实案例" if sub.city else "用户真实案例",
            difficulty="medium",
            success_rate=_infer_success_rate(sub.outcome),
            description=sub.description,
            source="user_submission",
            court_reference=None,
            verdict_year=datetime.now(timezone.utc).year,
            is_published=True,
            is_featured=False,
        )
        db.add(new_case)
        sub.published_case_id = case_id

    await db.commit()
    return sub_to_dict(sub, full=True)


def _infer_success_rate(outcome: Optional[str]) -> int:
    return {"won": 90, "settled": 70, "lost": 20, "ongoing": 50}.get(outcome or "", 60)
