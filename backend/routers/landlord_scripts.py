"""房东话术识别器（SSE 流式）"""
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from config import CLAUDE_API_URL, CLAUDE_MODEL, CLAUDE_MAX_TOKENS, CLAUDE_HEADERS, get_auth_token
import httpx

router = APIRouter(prefix="/api/landlord-scripts", tags=["landlord-scripts"])

SCRIPT_TYPES = {
    "natural_wear_blame": "自然损耗甩锅",
    "fabricated_damage": "无中生有捏造损坏",
    "delay_tactics": "拖延推诿",
    "format_clause_trap": "合同格式条款陷阱",
    "deposit_as_earnest": "押金变定金",
    "illegal_rent_raise": "非法涨租",
    "illegal_eviction": "非法驱逐",
    "intimidation": "威胁恐吓",
    "agent_runaway": "中介跑路甩锅",
    "unknown": "其他话术",
}

ANALYZE_PROMPT = """你是「租客卫士」，专门识别房东/中介的不合理话术并提供反驳策略。

用户粘贴了以下房东/中介发来的消息：
---
{message}
---

{context_info}

请按以下格式回复：

**🎭 话术类型识别**
[识别属于哪种话术类型，并简要说明为什么]

**⚖️ 法律分析**
[这种话术是否合法？援引具体法律条文（格式：《民法典》第XXX条）]

**💬 建议回复**
给出一条可以直接发送给房东的回复消息（用代码块包裹，方便复制）：

```
[回复内容]
```

**📋 下一步行动**
[简短的行动建议，1-3条]"""


class AnalyzeRequest(BaseModel):
    message: str
    context: dict | None = None


async def _stream_analysis(message: str, context: dict | None):
    context_info = ""
    if context:
        parts = []
        if context.get("rent_months"):
            parts.append(f"租住时长：{context['rent_months']}个月")
        if context.get("deposit_amount"):
            parts.append(f"押金金额：{context['deposit_amount']}元")
        if parts:
            context_info = "背景信息：" + "，".join(parts)

    prompt = ANALYZE_PROMPT.format(message=message, context_info=context_info)
    token = get_auth_token()
    headers = {**CLAUDE_HEADERS, "Authorization": f"Bearer {token}"}
    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": CLAUDE_MAX_TOKENS,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", CLAUDE_API_URL, json=body, headers=headers) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if not raw or raw == "[DONE]":
                    continue
                try:
                    data = json.loads(raw)
                    if data.get("type") == "content_block_delta":
                        text = data.get("delta", {}).get("text", "")
                        if text:
                            yield f"data: {json.dumps({'type': 'text', 'content': text}, ensure_ascii=False)}\n\n"
                    elif data.get("type") == "message_stop":
                        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
                        return
                except Exception:
                    continue


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    return StreamingResponse(
        _stream_analysis(req.message, req.context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Access-Control-Allow-Origin": "*"},
    )
