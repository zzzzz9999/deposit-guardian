# 租客卫士 — AI 使用实践文档

## 1. 项目中 AI 的角色

本项目以 **Claude API（Anthropic）** 为核心 AI 能力，覆盖三个场景：

| 场景 | 模型调用方式 | 说明 |
|------|------------|------|
| AI 维权对话 | SSE 流式 | 主功能，实时对话 |
| 法律文书生成 | 同步请求 | 投诉信 / 起诉状 |
| 房东话术识别 | SSE 流式 | 分析话术类型，给出反驳模板 |

---

## 2. AI 对话设计实践

### 2.1 System Prompt 工程

**核心设计原则：角色定位 + 流程约束 + 格式强制**

```
你是「租客卫士」，一位专业的租房权益顾问，同时也是一位温暖的倾听者。
今天是 {{TODAY}}。  ← 动态注入当前日期，防止 AI 说错年份

## 引导流程（5步）
1. 了解情况（追问关键信息）
2. 判断纠纷类型（押金/租住权益/签约陷阱）
3. 给出三步行动计划（今天/3天内/最后手段）
4. 提供即用模板（代码块格式，直接复制）
5. 搜索最新政策（城市/平台关键词触发）
```

**关键约束指令：**
- 「不重复上文已说过的内容」— 解决多轮对话重复问题
- 「如果用户提供了新信息，优先基于新信息回答」— 提升追问质量
- 法律引用格式强制：`**《法律》第X条**：「原文」[查看原文](链接)` — 防止 AI 编造链接

### 2.2 法律上下文注入

每次对话请求，后端自动将 **11 条核心法律条文**（含完整原文 + 全国人大官方链接）注入到用户消息末尾：

```python
# claude_service.py
def build_law_context(user_text: str) -> str:
    core_keys = ["《民法典》第713条", "《民法典》第496条", ...]
    # 生成格式：- **条文名**\n  原文：「...」\n  链接：https://flk.npc.gov.cn/...
```

**为什么这样做：**
- Claude 训练数据中法律链接不准确，注入官方链接后引用准确率接近 100%
- 避免 AI「幻觉」编造法条内容
- 链接使用 NPC 官网搜索 URL（Base64 编码中文条文名），精确定位到具体条文

### 2.3 上下文窗口管理

```python
def _trim_messages(messages: list, max_turns: int = 20) -> list:
    """超过 20 条时，保留首条用户消息 + 最近 19 条"""
    if len(messages) <= max_turns:
        return messages
    return [messages[0]] + messages[-(max_turns - 1):]
```

**策略选择原因：**
- 保留第一条：通常包含用户的核心问题，是整个对话的上下文锚点
- 保留最近 N 条：对话连贯性最重要
- 不用简单截头：会丢失核心问题，AI 会「失忆」

---

## 3. SSE 流式输出实践

### 3.1 前端流式处理

```typescript
// useSSEChat.ts — 核心流处理逻辑
while (true) {
  const { done, value } = await reader.read()
  // 解析 SSE 事件：ping(心跳) / searching / text / done / error
  if (evt.type === 'text') {
    fullText += evt.content
    if (!aiMsgAdded) {
      store.addMessageToSession(sessionId, { role: 'assistant', content: fullText })
      aiMsgAdded = true
    } else {
      store.updateLastMessage(sessionId, fullText)  // 增量更新，不重新渲染整条消息
    }
  }
}
```

**关键优化：**
- 首个 token 到达时立即创建消息气泡（`aiMsgAdded` 标志），用户感知延迟从「等待完整回复」降低到「等待第一个字」
- `updateLastMessage` 直接替换最后一条消息内容，避免每个 token 都 push 新消息导致的列表抖动

### 3.2 多 Session 并行流

```typescript
// 全局 AbortController Map，支持后台继续流式
const abortControllers = new Map<string, AbortController>()

// 切换 session 时不 abort，后台继续生成
// 流结束后云端同步，用户切回来能看到完整内容
```

**设计灵感：** 参考 Claude.ai 的「后台生成」模式 — 切换对话不中断，切回来内容已经生成好。

### 3.3 心跳保活

```python
# backend/claude_service.py
# 每 15s 发一次 ping，防止 Nginx/代理超时断开连接
yield f"data: {json.dumps({'type': 'ping'})}\n\n"
```

前端收到 `ping` 事件直接忽略，不影响 UI。

---

## 4. 文书生成实践

### 4.1 Prompt 设计

```python
# doc_gen_service.py
# 投诉信 prompt 核心要素：
# 1. 明确角色（专业法律文书助手）
# 2. 提供结构化表单数据
# 3. 要求引用具体法律条文
# 4. 指定格式（标题/正文/落款）
# 5. 语气要求（正式、有力、不激进）
```

### 4.2 非流式 vs 流式的选择

文书生成使用**非流式**（`stream=False`）：
- 文书需要完整性，中途截断会产生不完整文档
- 用户预期是「等待后得到完整文书」，而非「边写边看」
- 前端用 loading spinner 而非流式光标

---

## 5. AI 辅助开发实践

本项目从零开始完全使用 **Claude Code（AI 编程助手）** 辅助开发，主要实践：

### 5.1 架构设计

- 通过对话确定技术选型（FastAPI vs Django、Zustand vs Redux）
- AI 生成初始项目结构和数据库 schema
- 迭代讨论 SSE 多 session 并行方案

### 5.2 代码生成

- 后端：FastAPI 路由、SQLAlchemy 模型、JWT 认证、slowapi 速率限制
- 前端：React 组件、Zustand store、React Query 集成、Zod 校验
- 设计系统：navy/teal/coral 色彩体系、Tailwind utility classes

### 5.3 问题排查

典型 AI 辅助排查案例：

| 问题 | AI 定位方式 | 修复 |
|------|------------|------|
| bcrypt 兼容性错误 | 分析 passlib 版本冲突 | 改用 SHA-256+salt |
| Windows SQLite 路径错误 | 识别反斜杠问题 | `.as_posix()` 转换 |
| 历史对话不显示 | 追踪 `isAuthenticated` 条件导致 localStorage 未写入 | 始终写本地缓存 |
| 法律链接重复 | 分析前后端双重注入 | 移除前端注入逻辑 |
| 盾牌图标底部被截断 | 分析 viewBox 与 stroke 宽度关系 | 改用 filled path |

### 5.4 UI/UX 设计

- 参考 Claude.ai / ChatGPT / Gemini 的交互模式，由 AI 生成设计规范
- 所有 SVG 图标由 AI 生成（无 emoji，专业 SaaS 风格）
- 响应式布局、动画效果、色彩系统全部通过 AI 迭代完成

---

## 6. AI 能力边界与规避

### 6.1 已知限制

| 限制 | 规避方案 |
|------|---------|
| 法律链接幻觉 | 后端注入官方链接，禁止 AI 自行生成链接 |
| 年份错误 | System prompt 动态注入 `今天是 {{TODAY}}` |
| 多轮重复 | 明确指令「不重复已说过的内容」 |
| 超长对话失忆 | `_trim_messages` 保留首条 + 最近 N 条 |

### 6.2 安全边界

System prompt 明确禁止：
- 建议违法行为（堵门/扣押财物/人身威胁）
- 推荐具体律师（利益冲突）
- 100% 保证胜诉（用「根据类似案例」等措辞）
