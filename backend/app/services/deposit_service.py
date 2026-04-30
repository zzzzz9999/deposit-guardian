"""Deposit calculation business logic."""
from typing import Optional

ITEM_LIFESPAN: dict[str, float] = {
    "墙面涂料": 8, "壁纸": 5, "木地板": 10, "瓷砖地板": 15,
    "空调": 10, "热水器": 8, "冰箱": 12, "洗衣机": 10,
    "燃气灶": 8, "油烟机": 10, "沙发": 8, "床": 10,
    "窗帘": 5, "门锁": 10, "马桶": 15, "浴缸": 15,
    "default": 8,
}

CITY_DEPOSIT_RULES: dict[str, dict] = {
    "beijing": {"max_months": 3, "policy": "北京市住房租赁条例规定押金不超过3个月租金"},
    "shanghai": {"max_months": 3, "policy": "上海市住房租赁管理办法规定押金不超过3个月租金"},
    "shenzhen": {"max_months": 2, "policy": "深圳市住房租赁条例规定押金不超过2个月租金"},
    "guangzhou": {"max_months": 3, "policy": "广州市住房租赁管理规定押金不超过3个月租金"},
}


def _depreciation_rate(age_years: float, lifespan_years: float) -> float:
    if lifespan_years <= 0:
        return 0.0
    rate = 1.0 - (age_years / lifespan_years)
    return max(0.05, min(1.0, rate))


def calculate_deposit(
    deposit_amount: float,
    rent_monthly: Optional[float],
    rent_months: int,
    city: Optional[str],
    deductions: list[dict],
) -> dict:
    """Calculate recoverable deposit amount with depreciation breakdown."""
    total_claimed = sum(d.get("claimed_amount", 0) for d in deductions)
    valid_total = 0.0
    invalid_total = 0.0
    details = []

    for d in deductions:
        claimed = float(d.get("claimed_amount", 0))
        is_natural = d.get("is_natural_wear", False)
        age = float(d.get("item_age_years", rent_months / 12))
        lifespan = float(
            d.get("item_lifespan_years")
            or ITEM_LIFESPAN.get(d.get("item_type", ""), ITEM_LIFESPAN["default"])
        )

        if is_natural:
            valid = 0.0
            explanation = "用户标注为自然损耗，依据《民法典》第713条，出租人不得要求赔偿。"
        else:
            dep_rate = _depreciation_rate(age, lifespan)
            valid = round(claimed * dep_rate, 2)
            explanation = (
                f"该设施设计寿命约{lifespan:.0f}年，已使用约{age:.1f}年，"
                f"剩余价值约{dep_rate * 100:.0f}%，"
                f"合理扣除金额约{valid:.0f}元（{claimed:.0f}元 × {dep_rate * 100:.0f}%）。"
            )

        invalid = round(claimed - valid, 2)
        valid_total += valid
        invalid_total += invalid
        details.append({
            "reason": d.get("reason", "未说明"),
            "claimed_amount": claimed,
            "valid_amount": valid,
            "invalid_amount": invalid,
            "legal_basis": "《民法典》第713条" if is_natural else "折旧原则",
            "explanation": explanation,
        })

    recoverable = round(deposit_amount - valid_total, 2)
    city_policy = None
    if city and city in CITY_DEPOSIT_RULES and rent_monthly:
        rule = CITY_DEPOSIT_RULES[city]
        max_deposit = rent_monthly * rule["max_months"]
        if deposit_amount > max_deposit:
            over = round(deposit_amount - max_deposit, 2)
            city_policy = {
                "policy": rule["policy"],
                "max_allowed": max_deposit,
                "over_limit_amount": over,
                "note": f"押金超出上限{over:.0f}元，该部分本身就属于违规收取",
            }

    return {
        "summary": {
            "deposit_amount": deposit_amount,
            "total_claimed": total_claimed,
            "valid_deductions": round(valid_total, 2),
            "invalid_deductions": round(invalid_total, 2),
            "recoverable_amount": recoverable,
        },
        "deduction_details": details,
        "city_policy": city_policy,
        "legal_note": (
            "以上计算基于《民法典》第713条自然损耗原则及折旧计算方法，仅供参考。"
            "具体金额以法院判决为准。"
        ),
    }
