"""
Law article injection and search query builder for the AI agent.
Migrated from claude_service.py with clean module structure.
"""
import base64
import json
import re
from urllib.parse import quote


# ── Chinese number conversion ─────────────────────────────────────────────────

_CN_NUMS = {
    0: '零', 1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
    6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
    100: '百', 1000: '千',
}


def _int_to_cn(n: int) -> str:
    if n == 0:
        return '零'
    if n in _CN_NUMS:
        return _CN_NUMS[n]
    result = ''
    if n >= 1000:
        result += _CN_NUMS[n // 1000] + '千'
        n %= 1000
        if n == 0:
            return result
        if n < 100:
            result += '零'
    if n >= 100:
        result += _CN_NUMS[n // 100] + '百'
        n %= 100
        if n == 0:
            return result
        if n < 10:
            result += '零'
    if n >= 10:
        tens = n // 10
        result += ('' if tens == 1 and not result else _CN_NUMS[tens]) + '十'
        n %= 10
    if n > 0:
        result += _CN_NUMS[n]
    return result


def _make_npc_url(law_name: str, article_num: str | None = None) -> str:
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


# ── Law articles database ─────────────────────────────────────────────────────

LAW_ARTICLES: dict[str, dict] = {
    "《民法典》第148条": {
        "text": "一方以欺诈手段，使对方在违背真实意思的情况下实施的民事法律行为，受欺诈方有权请求人民法院或者仲裁机构予以撤销。",
        "url": _make_npc_url("民法典", "148"),
    },
    "《民法典》第188条": {
        "text": "向人民法院请求保护民事权利的诉讼时效期间为三年。",
        "url": _make_npc_url("民法典", "188"),
    },
    "《民法典》第496条": {
        "text": "格式条款是当事人为了重复使用而预先拟定，并在订立合同时未与对方协商的条款。提供格式条款的一方不合理地免除或者减轻其责任、加重对方责任、限制对方主要权利的，该格式条款无效。",
        "url": _make_npc_url("民法典", "496"),
    },
    "《民法典》第497条": {
        "text": "提供格式条款一方不合理地免除或者减轻其责任、加重对方责任、限制对方主要权利的，该格式条款无效。",
        "url": _make_npc_url("民法典", "497"),
    },
    "《民法典》第565条": {
        "text": "当事人一方依法主张解除合同的，应当通知对方。合同自通知到达对方时解除。",
        "url": _make_npc_url("民法典", "565"),
    },
    "《民法典》第577条": {
        "text": "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
        "url": _make_npc_url("民法典", "577"),
    },
    "《民法典》第587条": {
        "text": "债务人履行债务的，定金应当抵作价款或者收回。收受定金的一方不履行债务或者履行债务不符合约定，致使不能实现合同目的的，应当双倍返还定金。",
        "url": _make_npc_url("民法典", "587"),
    },
    "《民法典》第703条": {
        "text": "租赁合同是出租人将租赁物交付承租人使用、收益，承租人支付租金的合同。",
        "url": _make_npc_url("民法典", "703"),
    },
    "《民法典》第708条": {
        "text": "出租人应当按照约定将租赁物交付承租人，并在租赁期限内保持租赁物符合约定的用途。",
        "url": _make_npc_url("民法典", "708"),
    },
    "《民法典》第712条": {
        "text": "出租人应当履行租赁物的维修义务，但是当事人另有约定的除外。",
        "url": _make_npc_url("民法典", "712"),
    },
    "《民法典》第713条": {
        "text": "承租人在租赁物需要维修时可以请求出租人在合理期限内维修。租赁物的正常损耗，由出租人承担。",
        "url": _make_npc_url("民法典", "713"),
    },
    "《民法典》第714条": {
        "text": "承租人应当妥善保管租赁物，因保管不善造成租赁物毁损、灭失的，应当承担赔偿责任。",
        "url": _make_npc_url("民法典", "714"),
    },
    "《民法典》第720条": {
        "text": "在租赁期限内，出租人不得在租赁期限内单方面提高租金。",
        "url": _make_npc_url("民法典", "720"),
    },
    "《民法典》第724条": {
        "text": "有下列情形之一，非因承租人原因致使租赁物无法使用的，承租人可以解除合同。",
        "url": _make_npc_url("民法典", "724"),
    },
    "《民法典》第725条": {
        "text": "租赁物在承租人按照租赁合同占有期限内发生所有权变动的，不影响租赁合同的效力。",
        "url": _make_npc_url("民法典", "725"),
    },
    "《民法典》第726条": {
        "text": "出租人出卖租赁房屋的，应当在出卖之前的合理期限内通知承租人，承租人享有以同等条件优先购买的权利。",
        "url": _make_npc_url("民法典", "726"),
    },
    "《消费者权益保护法》第8条": {
        "text": "消费者享有知悉其购买、使用的商品或者接受的服务的真实情况的权利。",
        "url": _make_npc_url("消费者权益保护法", "8"),
    },
    "《消费者权益保护法》第26条": {
        "text": "经营者不得以格式条款、通知、声明、店堂告示等方式，作出排除或者限制消费者权利等对消费者不公平、不合理的规定。",
        "url": _make_npc_url("消费者权益保护法", "26"),
    },
    "《宪法》第39条": {
        "text": "中华人民共和国公民的住宅不受侵犯。禁止非法搜查或者非法侵入公民的住宅。",
        "url": _make_npc_url("宪法", "39"),
    },
}

_LAW_PATTERN = re.compile(
    r'《?(民法典|消费者权益保护法|宪法|治安管理处罚法|民事诉讼法'
    r'|城市房屋租赁管理办法|住房租赁条例)》?'
    r'(?:第(\d+)条)?'
)

CORE_LAW_KEYS = [
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


def build_law_context(user_text: str) -> str:
    """Build law context injection string for AI agent."""
    extra_keys: list[str] = []
    for m in _LAW_PATTERN.finditer(user_text):
        law, num = m.group(1), m.group(2)
        key = f"《{law}》第{num}条" if num else f"《{law}》"
        if key in LAW_ARTICLES and key not in CORE_LAW_KEYS:
            extra_keys.append(key)

    all_keys = CORE_LAW_KEYS + extra_keys
    lines = []
    for key in all_keys:
        if key in LAW_ARTICLES:
            art = LAW_ARTICLES[key]
            lines.append(
                f"- **{key}**\n  原文：「{art['text']}」\n  链接：{art['url']}"
            )

    return (
        "[系统注入：以下是本次对话相关法律条文的完整原文和官方链接。\n"
        "引用法律时，必须按格式：先写条文名，再引用原文，最后附链接。]\n\n"
        + "\n\n".join(lines)
        + "\n]"
    )


def _build_search_query(user_text: str) -> str:
    """Build intelligent Bing search query from user message."""
    text = user_text.strip()

    cities = [
        "北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京",
        "西安", "重庆", "天津", "苏州", "郑州", "长沙", "青岛", "宁波",
    ]
    city = next((c for c in cities if c in text), "")

    platforms = ["蛋壳", "自如", "链家", "青客", "贝壳", "安居客", "我爱我家", "万科"]
    platform = next((p for p in platforms if p in text), "")

    dispute_map = [
        (["押金", "保证金", "不退", "扣押", "退押"], "租房押金纠纷"),
        (["自然损耗", "正常磨损", "墙壁", "地板", "划痕", "粉刷"], "租房自然损耗押金"),
        (["提前退租", "提前解约", "违约金"], "提前退租押金违约金"),
        (["涨租", "加租", "提高租金"], "租期内涨租"),
        (["擅闯", "进门", "入室", "侵犯隐私"], "房东擅闯租客住所"),
        (["维修", "不修", "漏水", "暖气", "空调坏"], "房东不履行维修义务"),
        (["中介", "跑路", "失联", "卷款"], "中介跑路押金追讨"),
        (["长租", "爆雷", "破产", "公寓"], "长租公寓爆雷押金"),
        (["霸王条款", "格式条款", "不合理"], "租房霸王条款无效"),
    ]
    dispute = next(
        (d for kws, d in dispute_map if any(kw in text for kw in kws)),
        "租房纠纷维权",
    )

    parts = [dispute]
    if platform:
        parts.insert(0, platform)
    if city:
        parts.append(city)
    parts.append("法院判决 2025")

    return " ".join(parts)
