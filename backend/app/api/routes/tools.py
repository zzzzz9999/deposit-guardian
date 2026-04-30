"""
Tool routes: deposit calculator, document generator, blacklist, cities,
landlord scripts, progress tracker, case submissions, AI cases.

All migrated from the legacy routers/ directory to the new app/api/routes/ structure.
"""
import uuid
from functools import lru_cache
from pathlib import Path
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.misc import (
    BlacklistEntry,
    City,
    DepositCalculation,
    GeneratedDocument,
)
from app.models.progress import ProgressEvent, ProgressTracker
from app.models.case import Case, CaseCategory, CaseSubmission
from app.models.user import User

router = APIRouter()


# ── Optional auth helper ──────────────────────────────────────────────────────

async def _get_optional_user(
    db: AsyncSession = Depends(get_db),
    credentials=None,
) -> Optional[User]:
    """Try to get current user but don't raise if not authenticated."""
    try:
        from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
        from fastapi import Request
        return None  # simplified - full optional auth via header parsing handled by routes
    except Exception:
        return None


# ── Deposit Calculator ────────────────────────────────────────────────────────

class DeductionItem(BaseModel):
    reason: str
    claimed_amount: float
    item_type: Optional[str] = None
    item_age_years: Optional[float] = None
    item_lifespan_years: Optional[float] = None
    is_natural_wear: bool = False


class CalcRequest(BaseModel):
    deposit_amount: float
    rent_monthly: Optional[float] = None
    rent_months: int = 12
    city: Optional[str] = None
    deductions: list[DeductionItem] = []


@router.post("/deposit-calc/calculate", tags=["tools"])
async def calculate_deposit_api(
    req: CalcRequest,
    db: AsyncSession = Depends(get_db),
):
    """Calculate recoverable deposit amount."""
    from app.services.deposit_service import calculate_deposit
    result = calculate_deposit(
        deposit_amount=req.deposit_amount,
        rent_monthly=req.rent_monthly,
        rent_months=req.rent_months,
        city=req.city,
        deductions=[d.model_dump() for d in req.deductions],
    )
    record = DepositCalculation(
        id=str(uuid.uuid4()),
        deposit_amount=req.deposit_amount,
        rent_monthly=req.rent_monthly,
        rent_months=req.rent_months,
        city=req.city,
        deduction_items=[d.model_dump() for d in req.deductions],
        recoverable_amount=result["summary"]["recoverable_amount"],
        calculation_detail=result,
    )
    db.add(record)
    await db.commit()
    return result


# ── Document Generator ────────────────────────────────────────────────────────

DOC_TYPES = {
    "complaint_letter": "投诉信",
    "lawsuit_petition": "起诉状（小额诉讼）",
}


class DocGenerateRequest(BaseModel):
    doc_type: str
    form_data: dict


@router.post("/documents/generate", tags=["documents"], status_code=201)
async def generate_doc(
    req: DocGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.doc_type not in DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文档类型，支持：{list(DOC_TYPES.keys())}",
        )
    from app.services.doc_gen_service import generate_document
    content = await generate_document(req.doc_type, req.form_data)
    doc = GeneratedDocument(
        id=str(uuid.uuid4()),
        user_id=user.id,
        doc_type=req.doc_type,
        form_data=req.form_data,
        content=content,
    )
    db.add(doc)
    await db.commit()
    return {
        "doc_id": doc.id,
        "doc_type": req.doc_type,
        "doc_type_name": DOC_TYPES[req.doc_type],
        "content": content,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.get("/documents/my", tags=["documents"])
async def my_documents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedDocument)
        .where(GeneratedDocument.user_id == user.id)
        .order_by(desc(GeneratedDocument.created_at))
        .limit(20)
    )
    docs = result.scalars().all()
    return {
        "documents": [
            {
                "id": d.id,
                "doc_type": d.doc_type,
                "doc_type_name": DOC_TYPES.get(d.doc_type, d.doc_type),
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "tenant_name": d.form_data.get("tenant_name", ""),
            }
            for d in docs
        ]
    }


@router.get("/documents/{doc_id}", tags=["documents"])
async def get_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == doc_id,
            GeneratedDocument.user_id == user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return {
        "id": doc.id,
        "doc_type": doc.doc_type,
        "form_data": doc.form_data,
        "content": doc.content,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


# ── Blacklist ─────────────────────────────────────────────────────────────────

class BlacklistCreateRequest(BaseModel):
    entity_type: str
    entity_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    agency_name: Optional[str] = None
    dispute_type: Optional[str] = None
    amount: Optional[float] = None
    description: str
    is_anonymous: bool = False


@router.get("/blacklist", tags=["blacklist"])
async def list_blacklist(
    q: str = Query(""),
    city: str = Query(None),
    entity_type: str = Query(None),
    limit: int = Query(20),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    query = select(BlacklistEntry).where(BlacklistEntry.status == "verified")
    if city:
        query = query.where(BlacklistEntry.city == city)
    if entity_type:
        query = query.where(BlacklistEntry.entity_type == entity_type)
    if q:
        query = query.where(BlacklistEntry.entity_name.ilike(f"%{q}%"))
    query = query.order_by(desc(BlacklistEntry.report_count)).offset(offset).limit(limit)
    result = await db.execute(query)
    entries = result.scalars().all()
    return {
        "entries": [
            {
                "id": e.id,
                "entity_type": e.entity_type,
                "entity_name": e.entity_name,
                "city": e.city,
                "district": e.district,
                "dispute_type": e.dispute_type,
                "amount": float(e.amount) if e.amount else None,
                "description": e.description,
                "report_count": e.report_count,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
    }


@router.post("/blacklist", tags=["blacklist"], status_code=201)
async def create_blacklist_entry(
    req: BlacklistCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = BlacklistEntry(
        id=str(uuid.uuid4()),
        reporter_id=user.id,
        entity_type=req.entity_type,
        entity_name=req.entity_name,
        phone=req.phone,
        city=req.city,
        district=req.district,
        agency_name=req.agency_name,
        dispute_type=req.dispute_type,
        amount=req.amount,
        description=req.description,
        status="pending",
    )
    db.add(entry)
    await db.commit()
    return {"id": entry.id, "message": "举报已提交，待审核"}


# ── Cities ────────────────────────────────────────────────────────────────────

@router.get("/cities", tags=["cities"])
async def list_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(City).where(City.is_active == True).order_by(City.sort_order)  # noqa: E712
    )
    cities = result.scalars().all()
    return {"cities": [{"id": c.id, "name": c.name, "province": c.province} for c in cities]}


@router.get("/cities/{city_id}", tags=["cities"])
async def get_city(city_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(City)
        .options(
            selectinload(City.policies),
            selectinload(City.contacts),
            selectinload(City.verdicts),
        )
        .where(City.id == city_id)
    )
    city = result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="城市不存在")
    return {
        "id": city.id,
        "name": city.name,
        "province": city.province,
        "policies": [
            {"title": p.title, "content": p.content, "policy_type": p.policy_type}
            for p in city.policies
        ],
        "contacts": [
            {"department": c.department, "contact_type": c.contact_type, "value": c.value}
            for c in city.contacts
        ],
        "verdicts": [
            {"case_reference": v.case_reference, "summary": v.summary, "outcome": v.outcome}
            for v in city.verdicts
        ],
    }


# ── Progress Tracker ──────────────────────────────────────────────────────────

class ProgressCreateRequest(BaseModel):
    title: str
    category_id: Optional[str] = None
    deposit_amount: Optional[float] = None
    landlord_name: Optional[str] = None
    city: Optional[str] = None


class ProgressEventRequest(BaseModel):
    stage: str
    title: str
    event_date: str
    event_type: Optional[str] = None
    description: Optional[str] = None
    is_milestone: bool = False


@router.get("/progress", tags=["progress"])
async def list_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProgressTracker)
        .where(ProgressTracker.user_id == user.id)
        .order_by(desc(ProgressTracker.updated_at))
    )
    trackers = result.scalars().all()
    return {
        "trackers": [
            {
                "id": t.id,
                "title": t.title,
                "current_stage": t.current_stage,
                "status": t.status,
                "deposit_amount": float(t.deposit_amount) if t.deposit_amount else None,
                "city": t.city,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            }
            for t in trackers
        ]
    }


@router.post("/progress", tags=["progress"], status_code=201)
async def create_progress(
    req: ProgressCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tracker = ProgressTracker(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=req.title,
        category_id=req.category_id,
        deposit_amount=req.deposit_amount,
        landlord_name=req.landlord_name,
        city=req.city,
    )
    db.add(tracker)
    await db.commit()
    return {"id": tracker.id, "title": tracker.title}


# ── Submissions ───────────────────────────────────────────────────────────────

class SubmissionCreateRequest(BaseModel):
    title: str
    description: str
    category_id: Optional[str] = None
    city: Optional[str] = None
    deposit_amount: Optional[float] = None
    rent_months: Optional[int] = None
    outcome: Optional[str] = None
    is_anonymous: bool = False
    contact_email: Optional[str] = None


@router.post("/submissions", tags=["submissions"], status_code=201)
async def create_submission(
    req: SubmissionCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = CaseSubmission(
        id=str(uuid.uuid4()),
        user_id=user.id if not req.is_anonymous else None,
        title=req.title,
        description=req.description,
        category_id=req.category_id,
        city=req.city,
        deposit_amount=req.deposit_amount,
        rent_months=req.rent_months,
        outcome=req.outcome,
        is_anonymous=req.is_anonymous,
        contact_email=req.contact_email,
    )
    db.add(sub)
    await db.commit()
    return {"id": sub.id, "message": "投稿已提交，感谢分享您的维权经历！"}


# ── Cases ─────────────────────────────────────────────────────────────────────

@router.get("/cases", tags=["cases"])
async def list_cases(
    category: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Case).where(Case.is_published == True)  # noqa: E712
    if category:
        query = query.where(Case.category_id == category)
    result = await db.execute(query.order_by(desc(Case.created_at)).limit(100))
    cases = result.scalars().all()

    cats_result = await db.execute(select(CaseCategory).order_by(CaseCategory.sort_order))
    categories = cats_result.scalars().all()

    return {
        "cases": [
            {
                "id": c.id,
                "title": c.title,
                "subtitle": c.subtitle,
                "category_id": c.category_id,
                "difficulty": c.difficulty,
                "success_rate": c.success_rate,
                "is_featured": c.is_featured,
            }
            for c in cases
        ],
        "categories": [
            {"id": cat.id, "name": cat.name, "icon": cat.icon, "color": cat.color}
            for cat in categories
        ],
    }


@router.get("/cases/{case_id}", tags=["cases"])
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Case)
        .options(
            selectinload(Case.keywords),
            selectinload(Case.action_steps),
            selectinload(Case.legal_bases),
            selectinload(Case.templates),
            selectinload(Case.landlord_scripts),
            selectinload(Case.complaint_channels),
            selectinload(Case.outcome_examples),
            selectinload(Case.evidence_needed),
        )
        .where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="案例不存在")
    return {
        "id": case.id,
        "title": case.title,
        "subtitle": case.subtitle,
        "description": case.description,
        "difficulty": case.difficulty,
        "success_rate": case.success_rate,
        "keywords": [k.keyword for k in case.keywords],
        "action_steps": [
            {"step_num": s.step_num, "title": s.title, "detail": s.detail}
            for s in case.action_steps
        ],
        "legal_bases": [
            {"law": l.law, "content": l.content} for l in case.legal_bases
        ],
        "templates": [{"title": t.title, "content": t.content} for t in case.templates],
        "landlord_scripts": [s.script for s in case.landlord_scripts],
        "complaint_channels": [
            {"name": c.name, "type": c.type} for c in case.complaint_channels
        ],
        "outcome_examples": [e.example for e in case.outcome_examples],
        "evidence_needed": [e.evidence for e in case.evidence_needed],
    }


@router.get("/search", tags=["cases"])
async def search_cases(
    q: str = Query(""),
    category: str = Query(None),
    limit: int = Query(10),
    db: AsyncSession = Depends(get_db),
):
    query = select(Case).where(Case.is_published == True)  # noqa: E712
    if category:
        query = query.where(Case.category_id == category)
    if q:
        query = query.where(Case.title.ilike(f"%{q}%"))
    result = await db.execute(query.limit(limit))
    cases = result.scalars().all()
    return {
        "results": [
            {"id": c.id, "title": c.title, "subtitle": c.subtitle, "category_id": c.category_id}
            for c in cases
        ]
    }


# ── Minfadian (民法典) ─────────────────────────────────────────────────────────

_MINFADIAN_FILE = Path(__file__).parent.parent.parent.parent / "minfadian.json"


@lru_cache(maxsize=1)
def _load_minfadian() -> list:
    if not _MINFADIAN_FILE.exists():
        return []
    data = json.loads(_MINFADIAN_FILE.read_text(encoding="utf-8"))
    return data.get("articles", [])


@router.get("/minfadian", tags=["legal"])
def minfadian_search(
    q: str = Query(""),
    num: int = Query(None),
    part: str = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
):
    articles = _load_minfadian()
    if not articles:
        raise HTTPException(status_code=503, detail="民法典数据未加载")

    if num is not None:
        result = [a for a in articles if a["num"] == num]
        return {"total": len(result), "articles": result}

    results = articles
    if part:
        results = [a for a in results if part in a.get("part", "")]
    if q.strip():
        kw = q.strip().lower()
        results = [
            a for a in results
            if kw in a.get("content", "").lower()
            or kw in a.get("article", "").lower()
        ]
    total = len(results)
    return {"total": total, "offset": offset, "limit": limit, "articles": results[offset: offset + limit]}


@router.get("/minfadian/parts", tags=["legal"])
def minfadian_parts():
    articles = _load_minfadian()
    parts: dict[str, int] = {}
    for a in articles:
        p = a.get("part", "")
        if p:
            parts[p] = parts.get(p, 0) + 1
    return [{"part": k, "count": v} for k, v in parts.items()]


# ── News (fallback) ───────────────────────────────────────────────────────────

_FALLBACK_NEWS = [
    {
        "title": "北京：租房押金最高不超过3个月租金",
        "summary": "北京市住房租赁条例规定，出租人收取押金不得超过3个月租金，且须在合理期限内退还。",
        "source": "北京市住建委",
        "query": "北京租房押金政策",
    },
    {
        "title": "自然损耗不赔偿！法院判决房东退还全额押金",
        "summary": "上海某法院判决：租客居住2年后墙壁轻微发黄属正常损耗，房东无权扣押金。",
        "source": "上海法院案例",
        "query": "自然损耗押金判决",
    },
]


@router.get("/news", tags=["news"])
def news():
    return {"items": _FALLBACK_NEWS, "source": "curated"}
