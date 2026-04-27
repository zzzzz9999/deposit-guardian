"""
AI 案例生成器：多源权威抓取 → Claude 提取 → 去重写库

经验证可用的来源：
  1. 最高人民法院官网典型案例详情页（court.gov.cn）—— 可抓，含真实判决
  2. 住建部官网租赁政策文件（mohurd.gov.cn）—— 可抓，含真实政策条文
  3. 国务院政策解读（gov.cn）—— 可抓，含住房租赁条例等权威文件
  4. Google/DuckDuckGo 搜索（备用，Bing中文被知乎劫持）

每日凌晨 02:00 UTC 自动运行。
"""
import hashlib
import json
import logging
import re
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from urllib.parse import quote

from config import CLAUDE_API_URL, CLAUDE_MODEL, CLAUDE_HEADERS, get_auth_token
from db_models import Case as CaseModel

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Accept-Encoding": "gzip, deflate",
}

# ── 分类关键词 ─────────────────────────────────────────────────────────────────

CATEGORY_KEYWORDS: list[tuple[list[str], str]] = [
    (["自然损耗", "正常磨损", "墙壁", "地板", "粉刷", "油漆", "划痕", "合理使用"], "deposit_wear"),
    (["提前退租", "违约金", "提前解约", "提前终止", "违约"], "deposit_contract"),
    (["中介", "中介费", "中介公司", "经纪人", "代理"], "deposit_agent"),
    (["拖延", "迟迟不退", "超期", "不退押金", "拒绝退还", "拖欠"], "deposit_delay"),
    (["无中生有", "捏造", "虚构损坏", "伪造", "天价赔偿", "虚假"], "deposit_fake"),
    (["长租公寓", "爆雷", "跑路", "破产", "蛋壳", "青客", "自如"], "deposit_platform"),
    (["涨租", "单方涨价", "租金上涨", "加价", "提高租金"], "rent_raise"),
    (["擅闯", "非法入室", "未经允许进入", "侵犯隐私", "强行进入"], "rent_intrude"),
    (["维修", "不履行维修", "设施损坏", "漏水", "暖气", "空调"], "rent_facility"),
    (["驱逐", "强制搬走", "断水断电", "非法驱逐", "卖房赶人", "强制腾退"], "rent_evict"),
    (["虚假房源", "照片不符", "欺骗", "诈骗", "虚假宣传"], "sign_fraud"),
    (["霸王条款", "格式条款", "不合理条款", "无效条款", "免责条款"], "sign_clause"),
]


def _infer_category(text: str) -> str:
    t = text.lower()
    for keywords, cat_id in CATEGORY_KEYWORDS:
        if any(kw in t for kw in keywords):
            return cat_id
    return "deposit_delay"


def _dedup_hash(title: str, url: str) -> str:
    raw = (title.strip().lower() + url.strip()).encode("utf-8")
    return "hash:" + hashlib.sha256(raw).hexdigest()[:32]


def _case_id(h: str) -> str:
    return "ai_" + h[5:13]


def _strip_html(text: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-z]+;|&#\d+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_body(html: str, max_len: int = 3000) -> str:
    """从 HTML 提取正文，尝试多种容器。"""
    for pattern in [
        r'<article[^>]*>(.*?)</article>',
        r'<div[^>]*id="[^"]*(?:content|article|main|body)[^"]*"[^>]*>(.*?)</div>',
        r'<div[^>]*class="[^"]*(?:article|content|detail|text|news|TRS)[^"]*"[^>]*>(.*?)</div>',
        r'<div[^>]*class="[^"]*(?:main|center|body)[^"]*"[^>]*>(.*?)</div>',
    ]:
        m = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
        if m:
            body = _strip_html(m.group(1))
            if len(body) > 150:
                return body[:max_len]
    # fallback：所有 <p>
    paras = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL)
    text = " ".join(_strip_html(p) for p in paras if len(p.strip()) > 20)
    return text[:max_len] if text else _strip_html(html)[:max_len]


async def _fetch_page(client: httpx.AsyncClient, url: str, timeout: int = 15) -> str:
    """抓取页面并提取正文，失败返回空字符串。"""
    try:
        resp = await client.get(url, headers=_HEADERS, timeout=timeout, follow_redirects=True)
        if resp.status_code != 200:
            return ""
        return _extract_body(resp.text)
    except Exception as e:
        logger.debug("fetch error %s: %s", url[:60], e)
        return ""


# ── Source 1：最高人民法院典型案例 ───────────────────────────────────────────

# 已验证可访问的典型案例详情页（民商事类，含租赁相关）
_COURT_GOV_DETAIL_URLS = [
    # 2025年度民商事典型案例
    ("https://www.court.gov.cn/zixun/xiangqing/489741.html", "最高人民法院", "2026-02-24"),
    # 实质性化解矛盾纠纷典型案例
    ("https://www.court.gov.cn/zixun/xiangqing/489591.html", "最高人民法院", "2026-02-23"),
    ("https://www.court.gov.cn/zixun/xiangqing/489551.html", "最高人民法院", "2026-02-22"),
    # 规范职业索赔维护市场秩序
    ("https://www.court.gov.cn/zixun/xiangqing/487721.html", "最高人民法院", "2026-01-29"),
]

# 动态发现：每次运行时从列表页抓最新条目
_COURT_GOV_LIST_URL = "https://www.court.gov.cn/zixun/gengduo/104.html"


async def _fetch_court_gov_cases(client: httpx.AsyncClient) -> list[dict]:
    """
    1. 从列表页发现最新民商事典型案例
    2. 抓每篇详情页正文
    3. 让 Claude 从长文中提取所有租赁相关子案例
    """
    items = []

    # 动态发现新条目
    try:
        resp = await client.get(_COURT_GOV_LIST_URL, headers=_HEADERS, timeout=15, follow_redirects=True)
        if resp.status_code == 200:
            text = resp.text
            pattern = re.compile(
                r'href="(/zixun/xiangqing/\d+\.html)"[^>]*>\s*(.*?)\s*</a>'
                r'.*?(\d{4}-\d{2}-\d{2})',
                re.DOTALL
            )
            for m in pattern.finditer(text):
                path, raw_title, date = m.group(1), m.group(2), m.group(3)
                title = _strip_html(raw_title)
                if any(kw in title for kw in [
                    "民商事", "租赁", "房屋", "消费者", "合同纠纷",
                    "物权", "居住", "住房", "承租"
                ]):
                    url = f"https://www.court.gov.cn{path}"
                    # 避免重复固定列表
                    if not any(u == url for u, _, _ in _COURT_GOV_DETAIL_URLS):
                        detail = await _fetch_page(client, url)
                        if detail:
                            items.append({
                                "title": title,
                                "url": url,
                                "date": date,
                                "snippet": detail,
                                "source_name": "最高人民法院典型案例",
                            })
    except Exception as e:
        logger.warning("court.gov.cn list error: %s", e)

    # 固定已知条目（兜底）
    for url, source, date in _COURT_GOV_DETAIL_URLS:
        detail = await _fetch_page(client, url)
        if detail:
            items.append({
                "title": f"最高法典型案例（{date}）",
                "url": url,
                "date": date,
                "snippet": detail,
                "source_name": source,
            })

    logger.info("court.gov.cn: %d items", len(items))
    return items[:6]


# ── Source 2：住建部租赁政策文件 ──────────────────────────────────────────────

# 已验证的住建部文章 URL 模式
_MOHURD_RENTAL_KEYWORDS = [
    "租赁", "租房", "押金", "住房租赁", "承租", "出租", "租金", "廉租", "公租"
]

# 住建部政策文件库（gongkai/zc/wjk）
_MOHURD_POLICY_URL = "https://www.mohurd.gov.cn/gongkai/zc/wjk/index.html"
_MOHURD_NEWS_URL = "https://www.mohurd.gov.cn/xinwen/index.html"


async def _fetch_mohurd_cases(client: httpx.AsyncClient) -> list[dict]:
    """抓住建部政策文件和新闻，筛选租赁相关，提取为政策类案例。"""
    items = []

    for base_url in [_MOHURD_NEWS_URL, _MOHURD_POLICY_URL]:
        try:
            resp = await client.get(base_url, headers=_HEADERS, timeout=15, follow_redirects=True)
            if resp.status_code != 200:
                continue
            text = resp.text

            # 找所有文章链接（mohurd 的文章路径含 art_）
            art_links = re.findall(r'href="(/(?:xinwen|gongkai)[^"]*art_[^"]+\.html)"', text)
            art_titles = re.findall(
                r'href="/(?:xinwen|gongkai)[^"]*art_[^"]+\.html"[^>]*>\s*([^<]{5,80})\s*</a>',
                text
            )

            for path, raw_title in zip(art_links, art_titles):
                title = _strip_html(raw_title).strip()
                if not title:
                    continue
                if any(kw in title for kw in _MOHURD_RENTAL_KEYWORDS):
                    url = f"https://www.mohurd.gov.cn{path}"
                    detail = await _fetch_page(client, url)
                    if detail and len(detail) > 100:
                        items.append({
                            "title": title,
                            "url": url,
                            "date": "",
                            "snippet": detail,
                            "source_name": "住房和城乡建设部",
                        })
                    if len(items) >= 4:
                        break
        except Exception as e:
            logger.warning("mohurd error: %s", e)

    logger.info("mohurd.gov.cn: %d items", len(items))
    return items[:4]


# ── Source 3：国务院政策解读（住房租赁条例等）────────────────────────────────

_GOV_CN_URLS = [
    # 住房租赁条例相关（2025年9月施行）
    "https://www.gov.cn/zhengce/jiedu/index.htm",
    "https://www.gov.cn/xinwen/index.htm",
]

_GOV_CN_KEYWORDS = ["租赁", "租房", "押金", "住房", "承租", "出租"]


async def _fetch_gov_cn_cases(client: httpx.AsyncClient) -> list[dict]:
    """抓国务院网站租赁政策解读。"""
    items = []
    for base_url in _GOV_CN_URLS:
        try:
            resp = await client.get(base_url, headers=_HEADERS, timeout=12, follow_redirects=True)
            if resp.status_code != 200:
                continue
            text = resp.text

            # gov.cn 链接格式
            links = re.findall(
                r'href="((?:https://www\.gov\.cn)?/(?:zhengce|xinwen)/[^"]+\.htm)"',
                text
            )
            titles = re.findall(
                r'href="(?:https://www\.gov\.cn)?/(?:zhengce|xinwen)/[^"]+\.htm"[^>]*>\s*([^<]{5,80})\s*</a>',
                text
            )

            for path, raw_title in zip(links, titles):
                title = _strip_html(raw_title).strip()
                if not title:
                    continue
                if any(kw in title for kw in _GOV_CN_KEYWORDS):
                    url = path if path.startswith("http") else f"https://www.gov.cn{path}"
                    detail = await _fetch_page(client, url)
                    if detail and len(detail) > 100:
                        items.append({
                            "title": title,
                            "url": url,
                            "date": "",
                            "snippet": detail,
                            "source_name": "中国政府网",
                        })
                    if len(items) >= 3:
                        break
        except Exception as e:
            logger.warning("gov.cn error: %s", e)

    logger.info("gov.cn: %d items", len(items))
    return items[:3]


# ── Source 4：DuckDuckGo HTML 搜索（无反爬，可用）────────────────────────────

_DDG_QUERIES = [
    "房屋租赁合同纠纷 押金 法院判决 2025",
    "租客维权 押金不退 法院 胜诉 2025",
    "自然损耗 押金 判决 承租人 2024 OR 2025",
    "提前退租 押金 违约金 法院判决 2025",
    "格式条款 押金 无效 租赁合同 判决",
    "住房租赁条例 2025 押金 退还 规定",
    "长租公寓 押金 法院 判决 2024 OR 2025",
    "中介跑路 押金 连带责任 判决",
]

_ddg_cursor: int = 0

_DDG_EXCLUDED = {
    "zhihu.com", "baidu.com", "sogou.com", "sohu.com", "163.com",
    "sina.com.cn", "qq.com", "toutiao.com", "weibo.com",
    "douyin.com", "bilibili.com", "taobao.com", "jd.com",
}

_DDG_TRUSTED = {
    "court.gov.cn", "chinacourt.org", "mohurd.gov.cn", "gov.cn",
    "legaldaily.com.cn", "xinhuanet.com", "people.com.cn",
    "pkulaw.com", "lawtime.cn", "66law.cn", "110.com",
    "findlaw.cn", "lawyee.net", "hshfy.sh.cn", "bjcourt.gov.cn",
}


async def _fetch_ddg_cases(client: httpx.AsyncClient) -> list[dict]:
    """DuckDuckGo HTML 搜索，无需 JS，不被知乎劫持。"""
    global _ddg_cursor
    items = []

    queries = [
        _DDG_QUERIES[(_ddg_cursor + i) % len(_DDG_QUERIES)]
        for i in range(3)
    ]
    _ddg_cursor = (_ddg_cursor + 3) % len(_DDG_QUERIES)

    for query in queries:
        try:
            url = f"https://html.duckduckgo.com/html/?q={quote(query)}&kl=cn-zh"
            resp = await client.get(
                url,
                headers={
                    **_HEADERS,
                    "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
                },
                timeout=15,
                follow_redirects=True,
            )
            if resp.status_code != 200:
                # 备用：直接用 DuckDuckGo API
                resp = await client.get(
                    f"https://duckduckgo.com/html/?q={quote(query)}",
                    headers=_HEADERS,
                    timeout=15,
                    follow_redirects=True,
                )
                if resp.status_code != 200:
                    continue

            text = resp.text

            # DDG HTML 结果结构
            results = re.findall(
                r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)</a>'
                r'.*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>',
                text, re.DOTALL
            )

            if not results:
                # 备用解析
                blocks = re.findall(r'<div[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)</div>', text, re.DOTALL)
                for block in blocks:
                    href_m = re.search(r'href="(https?://[^"]+)"', block)
                    title_m = re.search(r'<a[^>]*>(.*?)</a>', block, re.DOTALL)
                    snip_m = re.search(r'<span[^>]*>(.*?)</span>', block, re.DOTALL)
                    if href_m and title_m:
                        results.append((href_m.group(1), title_m.group(1), snip_m.group(1) if snip_m else ""))

            for href, raw_title, raw_snip in results:
                # 解码 DDG 重定向 URL
                if "duckduckgo.com/l/" in href:
                    actual = re.search(r'uddg=([^&]+)', href)
                    if actual:
                        from urllib.parse import unquote
                        href = unquote(actual.group(1))

                title = _strip_html(raw_title).strip()
                snippet = _strip_html(raw_snip).strip()

                if not title or len(title) < 8:
                    continue

                domain_m = re.search(r'https?://([^/]+)', href)
                domain = domain_m.group(1).lower() if domain_m else ""

                if any(ex in domain for ex in _DDG_EXCLUDED):
                    continue

                combined = title + snippet
                if not any(kw in combined for kw in [
                    "押金", "租赁", "租房", "承租", "出租", "租金", "房东", "租客",
                    "住房", "租约"
                ]):
                    continue

                is_trusted = any(d in domain for d in _DDG_TRUSTED)
                items.append({
                    "title": title,
                    "url": href,
                    "date": "",
                    "snippet": snippet[:600],
                    "source_name": "权威法律媒体" if is_trusted else "法律资讯",
                })

        except Exception as e:
            logger.warning("DDG query error '%s': %s", query[:30], e)

    logger.info("DDG search: %d items", len(items))
    return items[:8]


# ── Claude 提取（支持长正文，提取所有子案例）─────────────────────────────────

_SYSTEM = """你是专门从法院判决书、政策文件和法律报道中提取租房纠纷案例结构化信息的助手。

重要规则：
1. 一篇文章可能包含多个子案例，请提取所有租房相关的子案例
2. 只返回 JSON 数组，每个元素是一个案例
3. 不要有任何解释文字
4. 如果内容是政策文件，将其转化为"政策规定类案例"
5. 如果内容与租房完全无关，返回空数组 []"""

_USER_TPL = """请从以下内容中提取所有租房纠纷相关案例，返回 JSON 数组：

标题：{title}
来源：{url}
来源机构：{source_name}
内容：
{content}

每个案例的 JSON 格式：
{{
  "title": "简洁案例标题，20字以内",
  "subtitle": "一句话背景，如：租客因墙壁发黄被扣押金2000元，起诉后全额追回",
  "description": "150-300字案例经过，含纠纷起因、双方主张、法院认定/政策规定、最终结果",
  "court_name": "审理法院或发布机构，无则空字符串",
  "court_reference": "案号如(2024)京0101民初1234号或政策文号，无则空字符串",
  "verdict_year": 年份整数，无法判断填0,
  "difficulty": "easy|medium|hard",
  "success_rate": 租客胜诉概率0-100,
  "outcome": "won|settled|lost|unclear|policy",
  "key_law": "最关键法律条文，无则空字符串",
  "is_rental_dispute": true或false
}}

返回格式：[{{案例1}}, {{案例2}}, ...]
如果没有租房相关案例，返回：[]"""


async def _claude_extract_multi(
    title: str, url: str, content: str, source_name: str
) -> list[dict]:
    """Claude 提取，支持从一篇文章提取多个子案例。"""
    token = get_auth_token()
    headers = {**CLAUDE_HEADERS, "Authorization": f"Bearer {token}"}
    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": 2000,
        "system": _SYSTEM,
        "messages": [{
            "role": "user",
            "content": _USER_TPL.format(
                title=title,
                url=url,
                source_name=source_name,
                content=content[:2500]
            )
        }],
        "stream": False,
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(CLAUDE_API_URL, json=body, headers=headers)
            if resp.status_code != 200:
                logger.warning("Claude extract HTTP %s", resp.status_code)
                return []
            text = resp.json()["content"][0]["text"].strip()
            # 清理 markdown 代码块
            if text.startswith("```"):
                parts = text.split("```")
                text = parts[1][4:] if parts[1].startswith("json") else parts[1]
            text = text.strip()
            # 尝试直接解析
            try:
                result = json.loads(text)
            except json.JSONDecodeError:
                # 尝试提取第一个 JSON 数组或对象
                arr_m = re.search(r'\[.*\]', text, re.DOTALL)
                obj_m = re.search(r'\{.*\}', text, re.DOTALL)
                if arr_m:
                    result = json.loads(arr_m.group(0))
                elif obj_m:
                    result = json.loads(obj_m.group(0))
                else:
                    logger.warning("Claude: no JSON found in response")
                    return []
            if isinstance(result, list):
                return result
            if isinstance(result, dict):
                return [result]
            return []
    except Exception as e:
        logger.warning("Claude extract error: %s", e)
        return []


# ── 写入 DB ────────────────────────────────────────────────────────────────────

async def _save_case(db: AsyncSession, item: dict, extracted: dict) -> bool:
    """将提取结果写入 DB，返回是否成功新增。"""
    # 用案例标题+来源URL去重（而不是文章URL）
    case_title = (extracted.get("title") or item["title"]).strip()
    dedup = _dedup_hash(case_title, item["url"])
    cid = _case_id(dedup)

    existing = await db.execute(
        select(CaseModel).where(
            (CaseModel.id == cid) | (CaseModel.court_reference == dedup)
        )
    )
    if existing.scalar_one_or_none():
        return False

    real_ref = (extracted.get("court_reference") or "").strip()
    court_ref = real_ref if real_ref else dedup

    verdict_year = extracted.get("verdict_year") or None
    if verdict_year == 0:
        verdict_year = None

    success_rate = max(0, min(100, int(extracted.get("success_rate", 60))))
    difficulty = extracted.get("difficulty", "medium")
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    # 组装描述，追加可信度元数据
    desc = (extracted.get("description") or item.get("snippet", "")[:500]).strip()
    meta = []
    court_name = (extracted.get("court_name") or "").strip()
    key_law = (extracted.get("key_law") or "").strip()
    source_name = item.get("source_name", "")
    date = item.get("date", "")

    if court_name:
        meta.append(f"【来源机构】{court_name}")
    if real_ref:
        meta.append(f"【文书编号】{real_ref}")
    if key_law:
        meta.append(f"【适用法条】{key_law}")
    if date:
        meta.append(f"【发布日期】{date}")
    if source_name:
        meta.append(f"【数据来源】{source_name}")
    meta.append(f"【原文链接】{item['url']}")

    if meta:
        desc = desc.rstrip() + "\n\n" + " ".join(meta)

    new_case = CaseModel(
        id=cid,
        category_id=_infer_category(case_title + " " + (extracted.get("description") or "")),
        title=case_title[:100],
        subtitle=(extracted.get("subtitle") or "")[:300],
        difficulty=difficulty,
        success_rate=success_rate,
        description=desc[:2000],
        source="ai_generated",
        court_reference=court_ref[:300],
        verdict_year=verdict_year,
        is_published=True,
        is_featured=False,
    )
    db.add(new_case)
    try:
        await db.flush()
        return True
    except Exception as e:
        await db.rollback()
        logger.warning("DB insert error: %s", e)
        return False


# ── 主入口 ────────────────────────────────────────────────────────────────────

async def search_and_summarize(db: AsyncSession) -> dict:
    """
    多源抓取 → Claude 提取（支持一文多案例）→ 去重写库。
    预期每次运行新增 3~10 条真实案例。
    """
    added = skipped = errors = 0

    async with httpx.AsyncClient(timeout=20) as client:
        all_items: list[dict] = []

        # Source 1: 最高法典型案例（最权威）
        court_items = await _fetch_court_gov_cases(client)
        all_items.extend(court_items)
        logger.info("Source 1 (最高法): %d items", len(court_items))

        # Source 2: 住建部政策文件
        mohurd_items = await _fetch_mohurd_cases(client)
        all_items.extend(mohurd_items)
        logger.info("Source 2 (住建部): %d items", len(mohurd_items))

        # Source 3: 国务院政策解读
        gov_items = await _fetch_gov_cn_cases(client)
        all_items.extend(gov_items)
        logger.info("Source 3 (国务院): %d items", len(gov_items))

        # Source 4: DuckDuckGo 搜索（补充）
        ddg_items = await _fetch_ddg_cases(client)
        all_items.extend(ddg_items)
        logger.info("Source 4 (DDG): %d items", len(ddg_items))

    logger.info("Total candidates: %d", len(all_items))

    for item in all_items:
        title = (item.get("title") or "").strip()
        url = (item.get("url") or "").strip()
        content = (item.get("snippet") or "").strip()
        source_name = item.get("source_name", "")

        if not title or not url or not content:
            skipped += 1
            continue

        # Claude 一次提取多个子案例
        sub_cases = await _claude_extract_multi(title, url, content, source_name)

        if not sub_cases:
            skipped += 1
            continue

        for extracted in sub_cases:
            if not extracted.get("is_rental_dispute", True):
                skipped += 1
                continue

            ok = await _save_case(db, item, extracted)
            if ok:
                added += 1
                logger.info("Added: %s", (extracted.get("title") or title)[:40])
            else:
                skipped += 1

    await db.commit()
    logger.info(
        "AI case gen done: added=%d skipped=%d errors=%d",
        added, skipped, errors
    )
    return {"added": added, "skipped": skipped, "errors": errors}
