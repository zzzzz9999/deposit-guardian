import json
from pathlib import Path
from functools import lru_cache

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
        # 标题命中额外加分
        if any(kw in case.get("title", "").lower() for kw in keywords):
            score += 3

        if score > 0:
            scored.append((score, case))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]
