"""投诉信/起诉状生成服务（调用 Claude）"""
import json
import httpx
from config import CLAUDE_API_URL, CLAUDE_MODEL, CLAUDE_MAX_TOKENS, CLAUDE_HEADERS, get_auth_token

COMPLAINT_LETTER_PROMPT = """你是一位专业律师助手，请根据以下信息生成一份格式规范的投诉信。

要求：
1. 格式规范，包含：标题、收件方、投诉人信息、投诉事项、事实经过、诉求、附件清单、署名日期
2. 语言正式，援引具体法律条文（《民法典》第XXX条）
3. 诉求明确，金额具体
4. 输出 Markdown 格式

用户信息：
{form_data}

请直接输出投诉信内容，不需要额外说明。"""

LAWSUIT_PETITION_PROMPT = """你是一位专业律师助手，请根据以下信息生成一份小额诉讼起诉状。

要求：
1. 格式规范，包含：标题、原告信息、被告信息、诉讼请求、事实与理由、证据清单、法律依据、落款
2. 援引具体法律条文，逻辑清晰
3. 诉讼请求明确（返还押金+逾期利息+诉讼费）
4. 输出 Markdown 格式

用户信息：
{form_data}

请直接输出起诉状内容，不需要额外说明。"""


async def generate_document(doc_type: str, form_data: dict) -> str:
    """调用 Claude 生成文档，返回 Markdown 字符串"""
    if doc_type == "complaint_letter":
        prompt = COMPLAINT_LETTER_PROMPT.format(form_data=json.dumps(form_data, ensure_ascii=False, indent=2))
    elif doc_type == "lawsuit_petition":
        prompt = LAWSUIT_PETITION_PROMPT.format(form_data=json.dumps(form_data, ensure_ascii=False, indent=2))
    else:
        raise ValueError(f"Unknown doc_type: {doc_type}")

    token = get_auth_token()
    headers = {**CLAUDE_HEADERS, "Authorization": f"Bearer {token}"}
    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": CLAUDE_MAX_TOKENS,
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(CLAUDE_API_URL, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]
