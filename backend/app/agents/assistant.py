"""
DepositGuardian AI Assistant — streaming chat via Claude (Meituan MCLI).

This agent:
1. Injects relevant Chinese law articles as context
2. Performs Bing web search for latest case law / news
3. Streams SSE responses to the frontend
"""
import asyncio
import base64
import json
import re
from collections.abc import AsyncIterator
from urllib.parse import quote

import httpx

from app.agents.law_context import build_law_context, _build_search_query
from app.agents.prompts import get_system_prompt
from app.core.config import settings


# ── Context trimming ──────────────────────────────────────────────────────────

def _trim_messages(messages: list, max_turns: int = 20) -> list:
    """Keep last max_turns messages to avoid context overflow."""
    if len(messages) <= max_turns:
        return messages
    return [messages[0]] + messages[-(max_turns - 1):]


# ── Web search ────────────────────────────────────────────────────────────────

async def _web_search_bing(query: str, max_results: int = 4) -> list[dict]:
    results: list[dict] = []
    try:
        url = (
            f"https://cn.bing.com/search?q={quote(query)}"
            f"&mkt=zh-CN&setlang=zh-Hans&count={max_results * 2}"
        )
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                },
            )
            if resp.status_code != 200:
                return results
            text = resp.text

            algo_blocks = re.findall(
                r'<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>(.*?)</li>',
                text,
                re.DOTALL,
            )
            for block in algo_blocks:
                href_m = re.search(
                    r'<h2[^>]*>.*?<a[^>]+href="(https?://[^"]+)"', block, re.DOTALL
                )
                title_m = re.search(r'<h2[^>]*>(.*?)</h2>', block, re.DOTALL)
                snip_m = (
                    re.search(r'<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>(.*?)</p>', block, re.DOTALL)
                    or re.search(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
                )
                if href_m and title_m:
                    href = href_m.group(1).strip()
                    title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip()
                    snippet = re.sub(r'<[^>]+>', '', snip_m.group(1)).strip() if snip_m else ""
                    if title and href.startswith("http") and not any(r["url"] == href for r in results):
                        results.append({"title": title, "url": href, "snippet": snippet[:300]})
                        if len(results) >= max_results:
                            break
    except Exception:
        pass
    return results


# ── Main streaming function ───────────────────────────────────────────────────

async def stream_chat(
    messages: list[dict], enable_web_search: bool = True
) -> AsyncIterator[str]:
    """Stream SSE events for the AI chat response."""
    token = settings.ANTHROPIC_AUTH_TOKEN
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "anthropic-version": "2023-06-01",
        "x-ide-type": "CatPaw_IDE",
    }

    last_user = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
    )

    injected_parts: list[str] = []

    # Always inject law articles
    yield f"data: {json.dumps({'type': 'searching', 'message': '正在查阅相关法律条文…'}, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0)

    law_context = build_law_context(last_user)
    injected_parts.append(law_context)

    # Web search for latest cases/policies
    if enable_web_search:
        search_query = _build_search_query(last_user)
        yield f"data: {json.dumps({'type': 'searching', 'message': f'正在搜索：{search_query[:20]}…'}, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0)

        try:
            web_results = await _web_search_bing(search_query, max_results=4)
            if web_results:
                result_text = "\n\n".join(
                    f"**{r['title']}**\n{r['snippet']}\n来源：{r['url']}"
                    for r in web_results
                )
                injected_parts.append(
                    "[系统：以下是联网搜索到的最新相关案例、判决和政策信息。"
                    "回答时请优先结合这些最新信息，并在引用时注明来源链接。]\n\n"
                    + result_text
                )
                yield f"data: {json.dumps({'type': 'searching', 'message': f'已找到 {len(web_results)} 条最新信息，正在分析…'}, ensure_ascii=False)}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'searching', 'message': '正在整理法律依据…'}, ensure_ascii=False)}\n\n"
        except Exception:
            pass

    # Build final messages with injected context
    final_messages = _trim_messages(list(messages))
    if injected_parts and final_messages:
        last_msg = final_messages[-1]
        if last_msg["role"] == "user":
            extra = "\n\n".join(injected_parts)
            final_messages[-1] = {
                "role": "user",
                "content": f"{last_msg['content']}\n\n{extra}",
            }

    body = {
        "model": settings.AI_MODEL,
        "max_tokens": settings.AI_MAX_TOKENS,
        "system": get_system_prompt(),
        "messages": final_messages,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST", settings.AI_API_URL, json=body, headers=headers
            ) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    err_text = error_body[:200].decode("utf-8", errors="ignore")
                    yield f"data: {json.dumps({'type': 'error', 'message': f'API错误 {resp.status_code}: {err_text}'}, ensure_ascii=False)}\n\n"
                    return

                async for line in resp.aiter_lines():
                    if line.startswith("event:") or not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if not raw or raw == "[DONE]":
                        continue
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError:
                        continue

                    event_type = data.get("type", "")
                    if event_type == "content_block_delta":
                        delta = data.get("delta", {})
                        if delta.get("type") == "text_delta":
                            text = delta.get("text", "")
                            if text:
                                yield f"data: {json.dumps({'type': 'text', 'content': text}, ensure_ascii=False)}\n\n"
                    elif event_type == "message_stop":
                        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
                        return
                    elif event_type == "error":
                        error_msg = data.get("error", {}).get("message", "未知错误")
                        yield f"data: {json.dumps({'type': 'error', 'message': error_msg}, ensure_ascii=False)}\n\n"
                        return

    except httpx.TimeoutException:
        yield f"data: {json.dumps({'type': 'error', 'message': '请求超时，请重试'}, ensure_ascii=False)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
