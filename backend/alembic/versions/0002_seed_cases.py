"""seed cases from cases.json

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-23
"""
import json
from pathlib import Path
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

DATA_FILE = Path(__file__).parent.parent.parent / "cases.json"


def upgrade() -> None:
    if not DATA_FILE.exists():
        print(f"[seed] cases.json not found at {DATA_FILE}, skipping")
        return

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    conn = op.get_bind()

    # 插入分类
    for i, cat in enumerate(data.get("categories", [])):
        conn.execute(sa.text("""
            INSERT INTO case_categories (id, name, icon, color, group_name, description, sort_order)
            VALUES (:id, :name, :icon, :color, :group_name, :desc, :sort)
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": cat["id"], "name": cat["name"],
            "icon": cat.get("icon"), "color": cat.get("color"),
            "group_name": cat.get("group"), "desc": cat.get("desc"), "sort": i
        })

    # 插入案例
    for case in data.get("cases", []):
        cid = case["id"]
        conn.execute(sa.text("""
            INSERT INTO cases (id, category_id, title, subtitle, difficulty, success_rate, description, source)
            VALUES (:id, :cat, :title, :subtitle, :diff, :rate, :desc, :src)
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": cid, "cat": case.get("category"),
            "title": case["title"], "subtitle": case.get("subtitle"),
            "diff": case.get("difficulty"), "rate": case.get("success_rate"),
            "desc": case.get("description"), "src": "官方整理"
        })

        for kw in case.get("keywords", []):
            conn.execute(sa.text("INSERT INTO case_keywords (case_id, keyword) VALUES (:c, :k)"), {"c": cid, "k": kw})
        for s in case.get("landlord_scripts", []):
            conn.execute(sa.text("INSERT INTO case_landlord_scripts (case_id, script) VALUES (:c, :s)"), {"c": cid, "s": s})
        for lb in case.get("legal_basis", []):
            conn.execute(sa.text("INSERT INTO case_legal_bases (case_id, law, content) VALUES (:c, :l, :ct)"), {"c": cid, "l": lb.get("law"), "ct": lb.get("content")})
        for step in case.get("action_steps", []):
            conn.execute(sa.text("INSERT INTO case_action_steps (case_id, step_num, title, detail) VALUES (:c, :n, :t, :d)"), {"c": cid, "n": step.get("step"), "t": step.get("title"), "d": step.get("detail")})
        for tmpl in case.get("template_messages", []):
            conn.execute(sa.text("INSERT INTO case_templates (case_id, title, content) VALUES (:c, :t, :ct)"), {"c": cid, "t": tmpl.get("title"), "ct": tmpl.get("content")})
        for ch in case.get("complaint_channels", []):
            conn.execute(sa.text("INSERT INTO case_complaint_channels (case_id, name, type) VALUES (:c, :n, :t)"), {"c": cid, "n": ch.get("name"), "t": ch.get("type")})
        for ex in case.get("outcome_examples", []):
            conn.execute(sa.text("INSERT INTO case_outcome_examples (case_id, example) VALUES (:c, :e)"), {"c": cid, "e": ex})
        for ev in case.get("evidence_needed", []):
            conn.execute(sa.text("INSERT INTO case_evidence_needed (case_id, evidence) VALUES (:c, :e)"), {"c": cid, "e": ev})

    # 插入主要城市基础数据
    cities = [
        ("beijing", "北京", "北京市"), ("shanghai", "上海", "上海市"),
        ("guangzhou", "广州", "广东省"), ("shenzhen", "深圳", "广东省"),
        ("chengdu", "成都", "四川省"), ("hangzhou", "杭州", "浙江省"),
        ("wuhan", "武汉", "湖北省"), ("nanjing", "南京", "江苏省"),
    ]
    for i, (cid, name, prov) in enumerate(cities):
        conn.execute(sa.text("""
            INSERT INTO cities (id, name, province, is_active, sort_order)
            VALUES (:id, :name, :prov, true, :sort)
            ON CONFLICT (id) DO NOTHING
        """), {"id": cid, "name": name, "prov": prov, "sort": i})

    print(f"[seed] Seeded {len(data.get('cases', []))} cases, {len(data.get('categories', []))} categories, {len(cities)} cities")


def downgrade() -> None:
    conn = op.get_bind()
    for tbl in ["case_evidence_needed", "case_outcome_examples", "case_complaint_channels",
                "case_templates", "case_action_steps", "case_legal_bases",
                "case_landlord_scripts", "case_keywords", "cases", "case_categories", "cities"]:
        conn.execute(sa.text(f"DELETE FROM {tbl}"))
