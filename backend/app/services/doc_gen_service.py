"""Document generation service — calls Claude API to generate legal documents."""
import json

import httpx

from app.core.config import settings

_COMPLAINT_LETTER_PROMPT = """你是一位专业律师助手，请根据以下信息生成一份格式规范的投诉信。

要求：
1. 格式规范，包含：标题、收件方、投诉人信息、投诉事项、事实经过、诉求、附件清单、署名日期
2. 语言正式，援引具体法律条文（《民法典》第XXX条）
3. 诉求明确，金额具体
4. 输出 Markdown 格式

用户信息：
{form_data}

请直接输出投诉信内容，不需要额外说明。"""

_LAWSUIT_PETITION_PROMPT = """你是一位专业律师助手，请根据以下信息生成一份小额诉讼起诉状。

要求：
1. 格式规范，包含：标题、原告信息、被告信息、诉讼请求、事实与理由、证据清单、法律依据、落款
2. 援引具体法律条文，逻辑清晰
3. 诉讼请求明确（返还押金+逾期利息+诉讼费）
4. 输出 Markdown 格式

用户信息：
{form_data}

请直接输出起诉状内容，不需要额外说明。"""

_PROMPTS = {
    "complaint_letter": _COMPLAINT_LETTER_PROMPT,
    "lawsuit_petition": _LAWSUIT_PETITION_PROMPT,
}


async def generate_document(doc_type: str, form_data: dict) -> str:
    """Call Claude API to generate a legal document. Returns Markdown string."""
    if doc_type not in _PROMPTS:
        raise ValueError(f"Unsupported doc_type: {doc_type}")

    prompt = _PROMPTS[doc_type].format(
        form_data=json.dumps(form_data, ensure_ascii=False, indent=2)
    )

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.ANTHROPIC_AUTH_TOKEN}",
        "anthropic-version": "2023-06-01",
    }
    body = {
        "model": settings.AI_MODEL,
        "max_tokens": settings.AI_MAX_TOKENS,
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(settings.AI_API_URL, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]
