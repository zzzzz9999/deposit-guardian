"""押金计算器"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from db_models import DepositCalculation, User
from middleware.auth_middleware import get_optional_user
from services.deposit_service import calculate_deposit
import uuid

router = APIRouter(prefix="/api/deposit-calc", tags=["deposit-calc"])


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


@router.post("/calculate")
async def calculate(
    req: CalcRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    result = calculate_deposit(
        deposit_amount=req.deposit_amount,
        rent_monthly=req.rent_monthly,
        rent_months=req.rent_months,
        city=req.city,
        deductions=[d.model_dump() for d in req.deductions],
    )

    # 保存计算记录
    record = DepositCalculation(
        id=str(uuid.uuid4()),
        user_id=user.id if user else None,
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
