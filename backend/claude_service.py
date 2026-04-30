import json
import re
import base64
import httpx
import asyncio
from urllib.parse import quote
from typing import AsyncIterator
from config import CLAUDE_API_URL, CLAUDE_MODEL, CLAUDE_MAX_TOKENS, CLAUDE_HEADERS, get_auth_token
from prompts import get_system_prompt


# ─── 法律条文原文库（完整原文 + 链接）──────────────────────────────────────
# 每条记录：{条文名: {text: 原文, url: 全国人大精确链接}}

_CN_NUMS = {
    0:'零',1:'一',2:'二',3:'三',4:'四',5:'五',
    6:'六',7:'七',8:'八',9:'九',10:'十',
    100:'百',1000:'千',
}

def _int_to_cn(n: int) -> str:
    if n == 0: return '零'
    if n in _CN_NUMS: return _CN_NUMS[n]
    result = ''
    if n >= 1000:
        result += _CN_NUMS[n // 1000] + '千'; n %= 1000
        if n == 0: return result
        if n < 100: result += '零'
    if n >= 100:
        result += _CN_NUMS[n // 100] + '百'; n %= 100
        if n == 0: return result
        if n < 10: result += '零'
    if n >= 10:
        tens = n // 10
        result += ('' if tens == 1 and not result else _CN_NUMS[tens]) + '十'; n %= 10
    if n > 0: result += _CN_NUMS[n]
    return result


def _make_url(law_name: str, article_num: str | None = None) -> str:
    if article_num:
        try:
            cn = _int_to_cn(int(article_num))
            search_text = f"{law_name}第{cn}条"
        except ValueError:
            search_text = f"{law_name}第{article_num}条"
    else:
        search_text = law_name
    params = json.dumps({"searchText": search_text}, ensure_ascii=False)
    params_b64 = base64.b64encode(params.encode()).decode()
    return (
        f"https://flk.npc.gov.cn/#/searchList"
        f"?searchType=title%2Ccontent&sortTp=0&pageSize=5&pageIndex=1"
        f"&params={quote(params_b64)}"
    )


# 完整法律条文原文库
LAW_ARTICLES: dict[str, dict] = {
    # ── 《民法典》押金 / 合同相关 ──────────────────────────────────────────
    "《民法典》第148条": {
        "text": "一方以欺诈手段，使对方在违背真实意思的情况下实施的民事法律行为，受欺诈方有权请求人民法院或者仲裁机构予以撤销。",
        "url": _make_url("民法典", "148"),
    },
    "《民法典》第188条": {
        "text": "向人民法院请求保护民事权利的诉讼时效期间为三年。法律另有规定的，依照其规定。诉讼时效期间自权利人知道或者应当知道权利受到损害以及义务人之日起计算。",
        "url": _make_url("民法典", "188"),
    },
    "《民法典》第496条": {
        "text": "格式条款是当事人为了重复使用而预先拟定，并在订立合同时未与对方协商的条款。采用格式条款订立合同的，提供格式条款的一方应当遵循公平原则确定当事人之间的权利和义务，并采取合理的方式提示对方注意免除或者减轻其责任等与对方有重大利害关系的条款。提供格式条款的一方未履行提示或者说明义务，致使对方没有注意或者理解与其有重大利害关系的条款的，对方可以主张该条款不成为合同的内容。",
        "url": _make_url("民法典", "496"),
    },
    "《民法典》第497条": {
        "text": "有下列情形之一的，该格式条款无效：（一）具有本法第一编第六章第三节和本法第五百零六条规定的无效情形；（二）提供格式条款一方不合理地免除或者减轻其责任、加重对方责任、限制对方主要权利；（三）提供格式条款一方排除对方主要权利。",
        "url": _make_url("民法典", "497"),
    },
    "《民法典》第565条": {
        "text": "当事人一方依法主张解除合同的，应当通知对方。合同自通知到达对方时解除；通知载明债务人在一定期限内不履行债务则合同自动解除，债务人在该期限内未履行债务的，合同自通知载明的期限届满时解除。",
        "url": _make_url("民法典", "565"),
    },
    "《民法典》第577条": {
        "text": "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
        "url": _make_url("民法典", "577"),
    },
    "《民法典》第583条": {
        "text": "当事人一方不履行合同义务或者履行合同义务不符合约定的，在履行义务或者采取补救措施后，对方还有其他损失的，应当赔偿损失。",
        "url": _make_url("民法典", "583"),
    },
    "《民法典》第585条": {
        "text": "当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金，也可以约定因违约产生的损失赔偿额的计算方法。约定的违约金低于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以增加；约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。",
        "url": _make_url("民法典", "585"),
    },
    "《民法典》第587条": {
        "text": "债务人履行债务的，定金应当抵作价款或者收回。给付定金的一方不履行债务或者履行债务不符合约定，致使不能实现合同目的的，无权请求返还定金；收受定金的一方不履行债务或者履行债务不符合约定，致使不能实现合同目的的，应当双倍返还定金。",
        "url": _make_url("民法典", "587"),
    },
    # ── 《民法典》租赁合同相关 ────────────────────────────────────────────
    "《民法典》第703条": {
        "text": "租赁合同是出租人将租赁物交付承租人使用、收益，承租人支付租金的合同。",
        "url": _make_url("民法典", "703"),
    },
    "《民法典》第708条": {
        "text": "出租人应当按照约定将租赁物交付承租人，并在租赁期限内保持租赁物符合约定的用途。",
        "url": _make_url("民法典", "708"),
    },
    "《民法典》第712条": {
        "text": "出租人应当履行租赁物的维修义务，但是当事人另有约定的除外。",
        "url": _make_url("民法典", "712"),
    },
    "《民法典》第713条": {
        "text": "承租人在租赁物需要维修时可以请求出租人在合理期限内维修。出租人未履行维修义务的，承租人可以自行维修，维修费用由出租人负担。因维修租赁物影响承租人使用的，应当相应减少租金或者延长租期。因承租人的过错致使租赁物需要维修的，出租人不承担前款规定的维修义务。租赁物的正常损耗，由出租人承担。",
        "url": _make_url("民法典", "713"),
    },
    "《民法典》第714条": {
        "text": "承租人应当妥善保管租赁物，因保管不善造成租赁物毁损、灭失的，应当承担赔偿责任。",
        "url": _make_url("民法典", "714"),
    },
    "《民法典》第716条": {
        "text": "承租人经出租人同意，可以将租赁物转租给第三人。承租人转租的，承租人与出租人之间的租赁合同继续有效；第三人造成租赁物损失的，承租人应当赔偿损失。承租人未经出租人同意转租的，出租人可以解除合同。",
        "url": _make_url("民法典", "716"),
    },
    "《民法典》第720条": {
        "text": "在租赁期限内，因占有、使用租赁物获得的收益，归承租人所有，但是当事人另有约定的除外。出租人不得在租赁期限内单方面提高租金。",
        "url": _make_url("民法典", "720"),
    },
    "《民法典》第724条": {
        "text": "有下列情形之一，非因承租人原因致使租赁物无法使用的，承租人可以解除合同：（一）租赁物被司法机关或者行政机关依法查封、扣押；（二）租赁物权属不清晰；（三）租赁物具有影响承租人安全或者健康的瑕疵。",
        "url": _make_url("民法典", "724"),
    },
    "《民法典》第725条": {
        "text": "租赁物在承租人按照租赁合同占有期限内发生所有权变动的，不影响租赁合同的效力。",
        "url": _make_url("民法典", "725"),
    },
    "《民法典》第726条": {
        "text": "出租人出卖租赁房屋的，应当在出卖之前的合理期限内通知承租人，承租人享有以同等条件优先购买的权利；但是，房屋按份共有人行使优先购买权或者出租人将房屋出卖给近亲属的除外。",
        "url": _make_url("民法典", "726"),
    },
    "《民法典》第730条": {
        "text": "当事人对租赁期限没有约定或者约定不明确，依据本法第五百一十条的规定仍不能确定的，视为不定期租赁；当事人可以随时解除合同，但是应当在合理期限之前通知对方。",
        "url": _make_url("民法典", "730"),
    },
    "《民法典》第925条": {
        "text": "受托人以自己的名义，在委托人的授权范围内与第三人订立的合同，第三人在订立合同时知道受托人与委托人之间的代理关系的，该合同直接约束委托人和第三人；但是，有确切证据证明该合同只约束受托人和第三人的除外。",
        "url": _make_url("民法典", "925"),
    },
    # ── 《消费者权益保护法》 ──────────────────────────────────────────────
    "《消费者权益保护法》第8条": {
        "text": "消费者享有知悉其购买、使用的商品或者接受的服务的真实情况的权利。消费者有权根据商品或者服务的不同情况，要求经营者提供商品的价格、产地、生产者、用途、性能、规格、等级、主要成分、生产日期、有效期限、检验合格证明、使用方法说明书、售后服务，或者服务的内容、规格、费用等有关情况。",
        "url": _make_url("消费者权益保护法", "8"),
    },
    "《消费者权益保护法》第10条": {
        "text": "消费者享有公平交易的权利。消费者在购买商品或者接受服务时，有权获得质量保障、价格合理、计量正确等公平交易条件，有权拒绝经营者的强制交易行为。",
        "url": _make_url("消费者权益保护法", "10"),
    },
    "《消费者权益保护法》第26条": {
        "text": "经营者在经营活动中使用格式条款的，应当以显著方式提请消费者注意商品或者服务的数量和质量、价款或者费用、履行期限和方式、安全注意事项和风险警示、售后服务、民事责任等与消费者有重大利害关系的内容，并按照消费者的要求予以说明。经营者不得以格式条款、通知、声明、店堂告示等方式，作出排除或者限制消费者权利、减轻或者免除经营者责任、加重消费者责任等对消费者不公平、不合理的规定，不得利用格式条款并借助技术手段强制交易。格式条款、通知、声明、店堂告示等含有前款所列内容的，其内容无效。",
        "url": _make_url("消费者权益保护法", "26"),
    },
    "《消费者权益保护法》第55条": {
        "text": "经营者提供商品或者服务有欺诈行为的，应当按照消费者的要求增加赔偿其受到的损失，增加赔偿的金额为消费者购买商品的价款或者接受服务的费用的三倍；增加赔偿的金额不足五百元的，为五百元。法律另有规定的，依照其规定。",
        "url": _make_url("消费者权益保护法", "55"),
    },
    # ── 《宪法》 ──────────────────────────────────────────────────────────
    "《宪法》第39条": {
        "text": "中华人民共和国公民的住宅不受侵犯。禁止非法搜查或者非法侵入公民的住宅。",
        "url": _make_url("宪法", "39"),
    },
    # ── 《治安管理处罚法》 ────────────────────────────────────────────────
    "《治安管理处罚法》第40条": {
        "text": "有下列行为之一的，处十日以上十五日以下拘留，并处五百元以上一千元以下罚款；情节较轻的，处五日以上十日以下拘留，并处二百元以上五百元以下罚款：……（三）非法侵入他人住宅的……",
        "url": _make_url("治安管理处罚法", "40"),
    },
    # ── 《民事诉讼法》 ────────────────────────────────────────────────────
    "《民事诉讼法》第162条": {
        "text": "基层人民法院和它派出的法庭审理符合本法第一百六十二条规定的简单民事案件，标的额为各省、自治区、直辖市上年度就业人员年均工资收入百分之三十以下的，实行一审终审。",
        "url": _make_url("民事诉讼法", "162"),
    },
}

# 从用户消息提取涉及的法律条文
_LAW_PATTERN = re.compile(
    r'《?(民法典|消费者权益保护法|宪法|治安管理处罚法|民事诉讼法'
    r'|城市房屋租赁管理办法|住房租赁条例)》?'
    r'(?:第(\d+)条)?'
)


def build_law_context(user_text: str) -> str:
    """
    根据用户消息，找出相关法律条文，生成「原文 + 链接」的注入文本。
    始终注入租赁合同最核心的几条，再根据用户消息补充相关条文。
    """
    # 始终注入的核心条文（租赁合同最常用）
    core_keys = [
        "《民法典》第713条",
        "《民法典》第496条",
        "《民法典》第587条",
        "《民法典》第577条",
        "《民法典》第188条",
        "《民法典》第720条",
        "《民法典》第725条",
        "《民法典》第148条",
        "《消费者权益保护法》第8条",
        "《消费者权益保护法》第26条",
        "《宪法》第39条",
    ]

    # 从用户消息额外提取（避免遗漏用户明确提到的条文）
    extra_keys: list[str] = []
    for m in _LAW_PATTERN.finditer(user_text):
        law, num = m.group(1), m.group(2)
        key = f"《{law}》第{num}条" if num else f"《{law}》"
        if key in LAW_ARTICLES and key not in core_keys:
            extra_keys.append(key)

    all_keys = core_keys + extra_keys
    lines = []
    for key in all_keys:
        if key in LAW_ARTICLES:
            art = LAW_ARTICLES[key]
            lines.append(f"- **{key}**\n  原文：「{art['text']}」\n  链接：{art['url']}")

    return (
        "[系统注入：以下是本次对话相关法律条文的完整原文和官方链接。\n"
        "引用法律时，必须按格式：先写条文名，再引用原文，最后附链接。\n"
        "格式示例：\n"
        "> **《民法典》第713条**：「租赁物的正常损耗，由出租人承担。」[查看原文](链接)\n\n"
        + "\n\n".join(lines)
        + "\n]"
    )


# ─── 上下文裁剪（防止超出 token 限制）────────────────────────────────────────

def _trim_messages(messages: list, max_turns: int = 20) -> list:
    """超过 max_turns 条时，保留第一条用户消息 + 最近 max_turns-1 条。"""
    if len(messages) <= max_turns:
        return messages
    return [messages[0]] + messages[-(max_turns - 1):]


# ─── 流式对话 ─────────────────────────────────────────────────────────────────

def _build_search_query(user_text: str) -> str:
    """根据用户消息智能生成搜索词，始终包含租房维权上下文。"""
    text = user_text.strip()

    # 提取城市
    cities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京", "西安", "重庆",
              "天津", "苏州", "郑州", "长沙", "青岛", "宁波", "合肥", "厦门", "福州", "济南"]
    city = next((c for c in cities if c in text), "")

    # 提取平台
    platforms = ["蛋壳", "自如", "链家", "青客", "贝壳", "安居客", "我爱我家", "中原", "万科", "龙湖"]
    platform = next((p for p in platforms if p in text), "")

    # 提取核心纠纷类型
    dispute_map = [
        (["押金", "保证金", "不退", "扣押", "退押"], "租房押金纠纷"),
        (["自然损耗", "正常磨损", "墙壁", "地板", "划痕", "粉刷"], "租房自然损耗押金"),
        (["提前退租", "提前解约", "违约金"], "提前退租押金违约金"),
        (["涨租", "加租", "提高租金"], "租期内涨租"),
        (["擅闯", "进门", "入室", "侵犯隐私"], "房东擅闯租客住所"),
        (["维修", "不修", "漏水", "暖气", "空调坏"], "房东不履行维修义务"),
        (["驱逐", "搬走", "卖房", "强制"], "租期内强制驱逐租客"),
        (["中介", "跑路", "失联", "卷款"], "中介跑路押金追讨"),
        (["长租", "爆雷", "破产", "公寓"], "长租公寓爆雷押金"),
        (["霸王条款", "格式条款", "不合理"], "租房霸王条款无效"),
        (["虚假房源", "照片不符", "欺骗"], "虚假房源欺诈"),
    ]
    dispute = next(
        (d for kws, d in dispute_map if any(kw in text for kw in kws)),
        "租房纠纷维权"
    )

    parts = [dispute]
    if platform:
        parts.insert(0, platform)
    if city:
        parts.append(city)
    parts.append("法院判决 2025")

    return " ".join(parts)


async def stream_chat(messages: list, enable_web_search: bool) -> AsyncIterator[str]:
    token = get_auth_token()
    headers = {**CLAUDE_HEADERS, "Authorization": f"Bearer {token}"}

    last_user = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
    )

    injected_parts: list[str] = []

    # ── 始终执行：注入法律原文 + 联网搜索 ────────────────────────────────────
    yield f"data: {json.dumps({'type': 'searching', 'message': '正在查阅相关法律条文…'}, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0)

    law_context = build_law_context(last_user)
    injected_parts.append(law_context)

    # 智能生成搜索词，联网抓取最新案例/政策
    search_query = _build_search_query(last_user)
    yield f"data: {json.dumps({'type': 'searching', 'message': f'正在搜索：{search_query[:20]}…'}, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0)

    try:
        web_results = await web_search_bing(search_query, max_results=4)
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

    # ── 构建最终消息列表（裁剪超长上下文）────────────────────────────────────
    final_messages = _trim_messages(list(messages))
    if injected_parts and final_messages:
        last_msg = final_messages[-1]
        if last_msg["role"] == "user":
            extra = "\n\n".join(injected_parts)
            final_messages[-1] = {
                "role": "user",
                "content": f"{last_msg['content']}\n\n{extra}"
            }

    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": CLAUDE_MAX_TOKENS,
        "system": get_system_prompt(),
        "messages": final_messages,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", CLAUDE_API_URL, json=body, headers=headers) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    err_text = error_body[:200].decode("utf-8", errors="ignore")
                    msg = f"API错误 {resp.status_code}: {err_text}"
                    yield f"data: {json.dumps({'type': 'error', 'message': msg}, ensure_ascii=False)}\n\n"
                    return

                async for line in resp.aiter_lines():
                    if line.startswith("event:"):
                        continue
                    if not line.startswith("data:"):
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


# ─── Bing 搜索（案例/政策类查询）────────────────────────────────────────────

async def web_search_bing(query: str, max_results: int = 4) -> list[dict]:
    results = []
    try:
        url = f"https://cn.bing.com/search?q={quote(query)}&mkt=zh-CN&setlang=zh-Hans&count={max_results * 2}"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate",
            })
            if resp.status_code != 200:
                return results
            text = resp.text

            # 策略1：标准 li.b_algo 结构
            algo_blocks = re.findall(
                r'<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>(.*?)</li>',
                text, re.DOTALL
            )
            for block in algo_blocks:
                href_m = re.search(r'<h2[^>]*>.*?<a[^>]+href="(https?://[^"]+)"', block, re.DOTALL)
                title_m = re.search(r'<h2[^>]*>(.*?)</h2>', block, re.DOTALL)
                # 多种 snippet 容器
                snip_m = (
                    re.search(r'<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>(.*?)</p>', block, re.DOTALL) or
                    re.search(r'<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>.*?<p[^>]*>(.*?)</p>', block, re.DOTALL) or
                    re.search(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
                )
                if href_m and title_m:
                    href = href_m.group(1).strip()
                    title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip()
                    snippet = re.sub(r'<[^>]+>', '', snip_m.group(1)).strip() if snip_m else ""
                    if title and href.startswith("http") and not any(r["url"] == href for r in results):
                        results.append({"title": title, "url": href, "snippet": snippet[:300]})
                        if len(results) >= max_results:
                            break

            # 策略2：宽松 fallback — 任意 <a href> + 附近文字
            if not results:
                links = re.findall(
                    r'<a[^>]+href="(https?://(?!www\.bing\.com)[^"]+)"[^>]*>(.*?)</a>',
                    text, re.DOTALL
                )
                for href, anchor in links:
                    title = re.sub(r'<[^>]+>', '', anchor).strip()
                    if title and len(title) > 8 and not any(r["url"] == href for r in results):
                        results.append({"title": title, "url": href, "snippet": ""})
                        if len(results) >= max_results:
                            break

    except Exception:
        pass
    return results


# ─── 独立搜索接口（供 /api/news 使用）────────────────────────────────────────

async def fetch_latest_news() -> list:
    results = await web_search_bing("房东不退押金 维权 2024 案例", max_results=6)
    return [
        {"title": r["title"], "summary": r["snippet"], "source": r["url"], "query": "租房押金维权"}
        for r in results if r.get("title") and r.get("snippet")
    ]
