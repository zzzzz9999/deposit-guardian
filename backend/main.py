import uvicorn, json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from functools import lru_cache
import os

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import ChatRequest
from claude_service import stream_chat
from case_service import get_all_cases, get_categories, get_case_by_id, search_cases
from database import init_db

from routers import auth, chat_sessions, documents, landlord_scripts, deposit_calc, progress, blacklist, cities, submissions


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="租客卫士 API",
    version="2.1.0",
    description="租房权益保护平台 API",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost,http://localhost:5173,http://localhost:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册所有路由
app.include_router(auth.router)
app.include_router(chat_sessions.router)
app.include_router(documents.router)
app.include_router(landlord_scripts.router)
app.include_router(deposit_calc.router)
app.include_router(progress.router)
app.include_router(blacklist.router)
app.include_router(cities.router)
app.include_router(submissions.router)

# ── 民法典数据 ──────────────────────────────────────────────────────────────
MINFADIAN_FILE = Path(__file__).parent / "minfadian.json"

@lru_cache(maxsize=1)
def load_minfadian():
    if not MINFADIAN_FILE.exists():
        return []
    data = json.loads(MINFADIAN_FILE.read_text(encoding="utf-8"))
    return data.get("articles", [])


# ── 精选资讯兜底数据 ────────────────────────────────────────────────────────
FALLBACK_NEWS = [
    {"title": "北京：租房押金最高不超过3个月租金", "summary": "北京市住房租赁条例规定，出租人收取押金不得超过3个月租金，且须在合理期限内退还，违规可投诉住建委。", "source": "北京市住建委", "query": "北京租房押金政策"},
    {"title": "蛋壳公寓爆雷后续：法院已受理破产清算", "summary": "蛋壳公寓破产清算案已进入债权申报阶段，受害租客可向管理人申报押金及预付租金债权，参与财产分配。", "source": "人民法院公告", "query": "蛋壳公寓破产"},
    {"title": "自然损耗不赔偿！法院判决房东退还全额押金", "summary": "上海某法院判决：租客居住2年后墙壁轻微发黄属正常损耗，房东无权扣押金，需全额退还并支付逾期利息。", "source": "上海法院案例", "query": "自然损耗押金判决"},
    {"title": "「提前退租押金不退」格式条款被认定无效", "summary": "广州某区法院认定租房合同中「提前退租押金一律不退」属于加重租户责任的格式条款，依法无效，判决退还押金。", "source": "广州法院", "query": "格式条款无效判决"},
    {"title": "中介卷款跑路，房东被判承担连带责任", "summary": "成都某案例：中介收取押金后失联，法院认定中介系代房东收款，判决房东承担退还押金的连带责任。", "source": "成都法院案例", "query": "中介跑路房东连带责任"},
    {"title": "12345热线处理租房押金投诉效率提升", "summary": "多地政务服务热线数据显示，租房押金纠纷投诉7日内回复率超85%，住建委介入后大多数案件在30天内解决。", "source": "政务服务报告", "query": "12345押金投诉"},
]


# ── 健康检查 ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "2.1.0"}


# ── 对话 API ─────────────────────────────────────────────────────────────────
@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat(request: Request, req: ChatRequest):
    messages = [m.model_dump() for m in req.messages]
    return StreamingResponse(
        stream_chat(messages, req.enable_web_search),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.get("/api/cases")
def list_cases(category: str = Query(None)):
    return {"cases": get_all_cases(category), "categories": get_categories()}


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    case = get_case_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="案例不存在")
    return case


@app.get("/api/search")
def search(q: str = Query(""), category: str = Query(None), limit: int = Query(10)):
    return {"results": search_cases(q, category, limit)}


@app.get("/api/categories")
def categories():
    return get_categories()


@app.get("/api/minfadian")
def minfadian_search(
    q: str = Query(""), num: int = Query(None),
    part: str = Query(None), limit: int = Query(50), offset: int = Query(0),
):
    articles = load_minfadian()
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
        results = [a for a in results if
            kw in a.get("content", "").lower() or kw in a.get("article", "").lower() or
            kw in a.get("chapter", "").lower() or kw in a.get("section", "").lower()]

    total = len(results)
    return {"total": total, "offset": offset, "limit": limit, "articles": results[offset: offset + limit]}


@app.get("/api/minfadian/parts")
def minfadian_parts():
    articles = load_minfadian()
    parts: dict[str, int] = {}
    for a in articles:
        p = a.get("part", "")
        if p:
            parts[p] = parts.get(p, 0) + 1
    return [{"part": k, "count": v} for k, v in parts.items()]


@app.get("/api/news")
def news():
    return {"items": FALLBACK_NEWS, "source": "curated"}


# ── 静态服务 ────────────────────────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/legacy", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="legacy")

REACT_DIST = Path(__file__).parent.parent / "frontend-react" / "dist"
if REACT_DIST.exists():
    app.mount("/", StaticFiles(directory=str(REACT_DIST), html=True), name="static")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
