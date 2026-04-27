---
name: deposit-guardian
description: 租客卫士——租房维权 AI 工具集。当用户遇到租房纠纷（押金不退、房东涨租、强制驱逐、中介跑路、合同陷阱等）时使用。可搜索真实案例、查询民法典条文、计算可追回押金、生成催款函/起诉状、查询城市政策、搜索黑名单房东。触发词：押金、退押金、房东、中介、租房、租约、驱逐、涨租、维权、租赁合同。
---

# 租客卫士 — 租房维权工具集

**Base URL:** `http://localhost:8000`（本地开发）或部署地址

所有接口均为公开访问，无需鉴权。使用 `WebFetch` 工具调用 HTTP 接口获取数据。

---

## 工作流程

遇到租房纠纷时，按以下顺序执行：

1. **搜索相关案例** → 找到类似纠纷的处理方式和胜诉率
2. **查询适用法条** → 从民法典中找到法律依据
3. **计算可追回金额** → 给用户一个具体的数字预期
4. **查询城市政策** → 了解当地特殊规定和投诉渠道
5. **搜索黑名单** → 确认房东/中介是否有前科
6. **生成法律文书** → 输出可直接使用的催款函或起诉状

不必每步都执行，根据用户需求选择相关步骤。

---

## Tool 1：搜索维权案例

**用途：** 根据纠纷关键词搜索真实案例，了解类似情况的处理方式和胜诉率。

```
GET {BASE_URL}/api/search?q={关键词}&limit=5
```

**参数：**
- `q`：搜索关键词，如"墙壁发黄"、"提前退租"、"中介跑路"、"涨租"
- `limit`：返回数量，建议 3~5

**返回字段说明：**
- `title`：案例标题
- `subtitle`：一句话背景
- `difficulty`：难度（easy/medium/hard）
- `success_rate`：维权成功率（0~100）
- `description`：案例经过
- `landlord_scripts`：房东常用话术
- `legal_basis`：适用法律条文
- `action_steps`：行动步骤
- `source`：来源（ai_generated=AI生成，user_submission=用户投稿，空=精选）

**示例调用：**
```
WebFetch("http://localhost:8000/api/search?q=押金不退&limit=3", "提取cases数组，展示title、success_rate、action_steps")
```

---

## Tool 2：查询民法典条文

**用途：** 搜索民法典原文，为用户提供精确法律依据。

```
GET {BASE_URL}/api/minfadian?q={关键词}&limit=5
```

**参数：**
- `q`：搜索关键词，如"押金"、"自然损耗"、"格式条款"、"租赁"
- `num`：直接按条文号查询，如 `num=713`（第713条）
- `limit`：返回数量

**返回字段：**
- `num`：条文编号
- `article`：条文标题
- `content`：条文原文
- `part`：所属篇章

**常用条文速查：**
- 第713条：正常损耗由出租人承担（押金扣损耗纠纷核心条文）
- 第496条：格式条款无效（合同陷阱）
- 第720条：租期内不得单方涨租
- 第725条：买卖不破租赁
- 第577条：违约责任

**示例调用：**
```
WebFetch("http://localhost:8000/api/minfadian?num=713", "提取content字段，展示条文原文")
```

---

## Tool 3：计算可追回押金

**用途：** 根据押金金额、扣除项目，计算用户实际可追回的金额。

```
POST {BASE_URL}/api/deposit-calc/calculate
Content-Type: application/json

{
  "deposit_amount": 押金总额（数字，必填）,
  "rent_monthly": 月租金（数字，可选）,
  "rent_months": 租住月数（数字，默认12）,
  "city": "城市名（可选，如beijing/shanghai）",
  "deductions": [
    {
      "reason": "扣除理由描述",
      "claimed_amount": 房东要求金额,
      "item_type": "物品类型（可选）",
      "item_age_years": 物品已使用年限（可选）,
      "item_lifespan_years": 物品正常寿命（可选）,
      "is_natural_wear": true或false（是否属于自然损耗）
    }
  ]
}
```

**返回字段：**
- `summary.recoverable_amount`：可追回金额
- `summary.valid_deductions`：合理扣除金额
- `summary.invalid_deductions`：不合理扣除金额
- `deduction_details`：每项扣除的详细分析
- `city_policy`：城市特殊规定（如有）

**示例：** 押金3000元，房东要扣墙壁粉刷费800元（自然损耗）：
```
WebFetch POST "http://localhost:8000/api/deposit-calc/calculate" body={
  "deposit_amount": 3000,
  "rent_months": 24,
  "deductions": [{"reason": "墙壁粉刷费", "claimed_amount": 800, "is_natural_wear": true}]
}
```

---

## Tool 4：查询城市政策和投诉渠道

**用途：** 获取特定城市的租房政策、主管部门联系方式、历史判例。

**第一步：获取城市列表**
```
GET {BASE_URL}/api/cities
```

**第二步：获取城市详情**
```
GET {BASE_URL}/api/cities/{city_id}
```

**city_id 常用值：** beijing / shanghai / guangzhou / shenzhen / hangzhou / chengdu / wuhan

**返回字段：**
- `policies`：当地租房政策（押金上限、退还期限等）
- `contacts`：投诉部门（住建委、12345等）及联系方式
- `verdicts`：当地法院历史判例摘要

**示例调用：**
```
WebFetch("http://localhost:8000/api/cities/beijing", "提取policies和contacts，展示押金相关政策和投诉电话")
```

---

## Tool 5：搜索黑名单房东/中介

**用途：** 查询房东或中介是否有被投诉记录。

```
GET {BASE_URL}/api/blacklist/search?q={姓名或机构名}&city={城市}&entity_type={类型}
```

**参数：**
- `q`：房东姓名、中介公司名、电话号码
- `city`：城市（可选）
- `entity_type`：`landlord`（房东）或 `agency`（中介）
- `page`：页码（默认1）
- `limit`：每页数量（默认20）

**返回字段：**
- `entries`：匹配记录列表
- `entries[].entity_name`：被投诉人/机构名
- `entries[].dispute_type`：纠纷类型
- `entries[].description`：投诉描述
- `entries[].status`：核实状态（pending/verified）
- `disclaimer`：免责声明

**示例调用：**
```
WebFetch("http://localhost:8000/api/blacklist/search?q=张三&entity_type=landlord", "展示匹配的黑名单记录")
```

---

## Tool 6：生成法律文书

**用途：** 生成可直接使用的催款函或起诉状草稿。

```
POST {BASE_URL}/api/documents/generate
Content-Type: application/json

{
  "doc_type": "文书类型",
  "form_data": { 填写信息 }
}
```

**文书类型和所需字段：**

**催款函（complaint_letter）：**
```json
{
  "doc_type": "complaint_letter",
  "form_data": {
    "tenant_name": "租客姓名",
    "landlord_name": "房东姓名",
    "property_address": "房屋地址",
    "deposit_amount": 押金金额,
    "move_out_date": "退租日期（YYYY-MM-DD）",
    "dispute_reason": "纠纷原因描述",
    "demand_amount": 要求退还金额,
    "deadline_days": 要求回复天数（默认7）
  }
}
```

**起诉状草稿（lawsuit_petition）：**
```json
{
  "doc_type": "lawsuit_petition",
  "form_data": {
    "plaintiff_name": "原告（租客）姓名",
    "defendant_name": "被告（房东）姓名",
    "property_address": "房屋地址",
    "deposit_amount": 押金金额,
    "claim_amount": 诉讼请求金额,
    "facts": "事实经过描述",
    "evidence_list": ["证据1", "证据2"]
  }
}
```

**返回字段：**
- `content`：文书正文（Markdown 格式，可直接复制使用）
- `doc_type_name`：文书类型名称

---

## Tool 7：获取最新维权资讯

**用途：** 获取最新租房纠纷新闻、政策动态、典型案例。

```
GET {BASE_URL}/api/news
```

**返回字段：**
- `items[].title`：资讯标题
- `items[].summary`：内容摘要
- `items[].source`：来源

---

## 完整使用示例

**用户说：** "我在北京租房两年，退租时房东要扣1500元说墙壁发黄，押金3000元，我该怎么办？"

**Agent 执行步骤：**

```
# 步骤1：搜索类似案例
WebFetch("http://localhost:8000/api/search?q=墙壁发黄押金&limit=3", "提取案例标题、胜诉率、行动步骤")

# 步骤2：查询核心法条
WebFetch("http://localhost:8000/api/minfadian?num=713", "提取条文原文")

# 步骤3：计算可追回金额
POST http://localhost:8000/api/deposit-calc/calculate
{"deposit_amount": 3000, "rent_months": 24, "city": "beijing",
 "deductions": [{"reason": "墙壁发黄粉刷", "claimed_amount": 1500, "is_natural_wear": true}]}

# 步骤4：查询北京政策
WebFetch("http://localhost:8000/api/cities/beijing", "提取押金相关政策和住建委投诉电话")
```

**整合输出给用户：**
- 类似案例胜诉率（通常90%+）
- 法律依据：《民法典》第713条原文
- 可追回金额：3000元（墙壁发黄属自然损耗，房东无权扣除）
- 行动建议：发书面催款 → 投诉北京住建委 → 小额诉讼
- 北京市住建委投诉电话

---

## 注意事项

- 所有接口均为 GET 或 POST，返回 JSON
- 搜索结果包含 `source` 字段：`ai_generated`（AI生成）、`user_submission`（用户投稿）、空（专家精选）
- 文书生成结果为草稿，建议用户根据实际情况调整后使用
- 法律建议仅供参考，重大纠纷建议咨询专业律师
