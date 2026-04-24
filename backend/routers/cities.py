"""城市专项信息"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from db_models import City, CityPolicy, CityContact, CityVerdict

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("")
async def list_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(City).where(City.is_active == True).order_by(City.sort_order)
    )
    cities = result.scalars().all()
    return {"cities": [{"id": c.id, "name": c.name, "province": c.province} for c in cities]}


@router.get("/{city_id}")
async def get_city(city_id: str, db: AsyncSession = Depends(get_db)):
    city_result = await db.execute(select(City).where(City.id == city_id, City.is_active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="城市信息不存在")

    policies_result = await db.execute(select(CityPolicy).where(CityPolicy.city_id == city_id))
    contacts_result = await db.execute(select(CityContact).where(CityContact.city_id == city_id))
    verdicts_result = await db.execute(
        select(CityVerdict).where(CityVerdict.city_id == city_id).order_by(CityVerdict.year.desc()).limit(10)
    )

    def fmt_date(d):
        return d.isoformat() if d else None

    return {
        "city": {"id": city.id, "name": city.name, "province": city.province},
        "policies": [
            {"policy_type": p.policy_type, "title": p.title, "content": p.content,
             "effective_date": fmt_date(p.effective_date), "source_url": p.source_url}
            for p in policies_result.scalars().all()
        ],
        "contacts": [
            {"department": c.department, "contact_type": c.contact_type, "value": c.value, "note": c.note}
            for c in contacts_result.scalars().all()
        ],
        "verdicts": [
            {"case_reference": v.case_reference, "court": v.court, "year": v.year,
             "summary": v.summary, "outcome": v.outcome, "source_url": v.source_url}
            for v in verdicts_result.scalars().all()
        ],
    }
