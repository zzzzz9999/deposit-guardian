import json
from pathlib import Path
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

DATA_FILE = Path(__file__).parent / "cases.json"


@lru_cache(maxsize=1)
def load_cases():
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def get_all_cases(category: str = None):
    data = load_cases()
    cases = data["cases"]
    if category:
        cases = [c for c in cases if c["category"] == category]
    return cases


def get_categories():
    return load_cases()["categories"]


def get_case_by_id(case_id: str):
    for case in load_cases()["cases"]:
        if case["id"] == case_id:
            return case
    return None


def search_cases(query: str, category: str = None, limit: int = 10):
    cases = get_all_cases(category)
    if not query.strip():
        return cases[:limit]

    scored = []
    query_lower = query.lower()
    keywords = query_lower.split()

    for case in cases:
        score = 0
        searchable = " ".join([
            case.get("title", ""),
            case.get("subtitle", ""),
            case.get("description", ""),
            " ".join(case.get("keywords", [])),
            " ".join(case.get("landlord_scripts", [])),
        ]).lower()

        for kw in keywords:
            if kw in searchable:
                score += 2
        if any(kw in case.get("title", "").lower() for kw in keywords):
            score += 3

        if score > 0:
            scored.append((score, case))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]


# ── 动态案例：从 DB 读取用户投稿转化的案例 ──────────────────────────────────────

_DYNAMIC_SOURCES = ("user_submission", "ai_generated")


async def get_dynamic_cases(db: AsyncSession, category: str = None) -> list[dict]:
    """读取数据库中用户投稿和 AI 生成的已发布案例"""
    from db_models import Case as CaseModel
    stmt = select(CaseModel).where(
        CaseModel.is_published == True,
        CaseModel.source.in_(_DYNAMIC_SOURCES),
    )
    if category:
        stmt = stmt.where(CaseModel.category_id == category)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [_orm_case_to_dict(c) for c in rows]


async def get_dynamic_case_by_id(case_id: str, db: AsyncSession):
    from db_models import Case as CaseModel
    result = await db.execute(
        select(CaseModel).where(
            CaseModel.id == case_id,
            CaseModel.source.in_(_DYNAMIC_SOURCES),
            CaseModel.is_published == True,
        )
    )
    row = result.scalar_one_or_none()
    return _orm_case_to_dict(row) if row else None


def _orm_case_to_dict(c) -> dict:
    """将 ORM Case 对象转为与 cases.json 一致的 dict 格式"""
    court_ref = c.court_reference
    if court_ref and court_ref.startswith("hash:"):
        court_ref = None
    return {
        "id": c.id,
        "category": c.category_id or "",
        "title": c.title,
        "subtitle": c.subtitle or "",
        "difficulty": c.difficulty or "medium",
        "success_rate": c.success_rate or 0,
        "keywords": [],
        "description": c.description or "",
        "landlord_scripts": [],
        "legal_basis": [],
        "evidence_needed": [],
        "action_steps": [],
        "template_messages": [],
        "complaint_channels": [],
        "outcome_examples": [],
        "source": c.source or "",
        "court_reference": court_ref,
        "verdict_year": c.verdict_year,
        "is_user_submission": c.source == "user_submission",
    }


def search_in_dynamic(cases: list[dict], query: str, category: str = None, limit: int = 10) -> list[dict]:
    if category:
        cases = [c for c in cases if c["category"] == category]
    if not query.strip():
        return cases[:limit]

    scored = []
    query_lower = query.lower()
    keywords = query_lower.split()
    for case in cases:
        score = 0
        searchable = " ".join([case.get("title", ""), case.get("description", "")]).lower()
        for kw in keywords:
            if kw in searchable:
                score += 2
        if any(kw in case.get("title", "").lower() for kw in keywords):
            score += 3
        if score > 0:
            scored.append((score, case))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]
