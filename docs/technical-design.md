# 租客卫士 — 技术设计文档

## 1. 项目概述

**租客卫士**是一个面向租客的法律维权 Web 平台，提供 AI 法律咨询、押金计算、文书生成、维权进度追踪等功能，帮助租客在租房纠纷中快速了解权益、生成维权材料。

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     用户浏览器                            │
│  React 18 + TypeScript + Tailwind CSS + Zustand          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI 后端                             │
│  Python 3.11 · Async · SQLAlchemy 2.0 · slowapi          │
└──────────┬──────────────────────────┬────────────────────┘
           │                          │
┌──────────▼──────────┐   ┌──────────▼──────────────────┐
│  SQLite / PostgreSQL │   │  Claude API (Anthropic)      │
│  用户/会话/进度数据   │   │  SSE 流式对话 · 文书生成      │
└─────────────────────┘   └─────────────────────────────┘
```

### 2.2 技术栈

| 层次 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | React 18 + TypeScript | 类型安全，Hooks 架构 |
| 构建工具 | Vite 5 | 极速 HMR，生产构建 |
| 样式 | Tailwind CSS 3 + CSS Variables | 设计 token 化，navy/teal/coral 主色 |
| 状态管理 | Zustand | 轻量，支持多 session 并行流式 |
| 数据请求 | TanStack React Query v5 | 缓存/乐观更新/自动刷新 |
| 表单校验 | React Hook Form + Zod | 类型安全的运行时校验 |
| Markdown | react-markdown + remark-gfm | AI 回复富文本渲染 |
| 后端框架 | FastAPI 0.110 | 异步，OpenAPI 自动生成 |
| ORM | SQLAlchemy 2.0 Async | 异步查询，支持 PostgreSQL/SQLite |
| 数据库 | SQLite（开发）/ PostgreSQL（生产）| 自动检测切换 |
| 认证 | JWT (HS256) + Refresh Token 轮换 | access 30min + refresh 7天 |
| 速率限制 | slowapi | 基于 IP，chat 接口 30次/分钟 |
| AI 服务 | Claude Sonnet API | SSE 流式输出 |

---

## 3. 核心功能模块

### 3.1 AI 维权对话（/chat）

**流程：**
```
用户输入 → useSSEChat hook → POST /api/chat
         → 后端注入法律条文上下文
         → 调用 Claude API (stream=True)
         → SSE 逐 token 推送前端
         → 流结束后云端同步会话
```

**关键设计：**
- **多 session 并行**：`chatStore` 以 `sessionId` 为 key 存储消息，切换 session 不中断后台流
- **上下文裁剪**：超 20 条消息保留首条 + 最近 19 条，防止 token 超限
- **法律上下文注入**：每次请求自动注入 11 条核心法律条文原文 + 官方链接
- **云端同步**：流结束后 `PATCH /api/chat/sessions/{id}` upsert，本地 localStorage 作即时缓存
- **停止生成**：AbortController 全局 Map，支持按 sessionId 中断

### 3.2 押金折旧计算器（/deposit-calc）

依据《民法典》第 713 条折旧原则：
- 按物品类型（墙面/地板/电器等）配置使用年限
- 计算已使用比例 = 使用年限 / 标准使用年限
- 合理扣除额 = 索赔金额 × (1 - 已使用比例)
- 城市特殊政策叠加（北京/上海押金上限 3 个月）

### 3.3 文书生成（/document-gen）

- 调用 Claude API（非流式，max_tokens=4096）
- 支持投诉信 / 小额诉讼起诉状两种模板
- 生成结果存入 `generated_documents` 表

### 3.4 用户认证

```
注册/登录 → SHA-256+salt 密码哈希
          → 签发 access_token (30min) + refresh_token (7天)
          → refresh_token 哈希存库，每次刷新轮换
          → 前端 axios 拦截器自动刷新
```

### 3.5 维权进度追踪（/progress）

6 阶段状态机：`notice → complaint → mediation → arbitration → lawsuit → enforcement`

---

## 4. 数据库设计

### 4.1 核心表关系

```
users
  ├── refresh_tokens (1:N)
  ├── chat_sessions (1:N)
  │     └── chat_messages (1:N)
  ├── progress_trackers (1:N)
  │     └── progress_events (1:N)
  ├── case_submissions (1:N)
  └── generated_documents (1:N)

cases
  ├── case_categories (N:1)
  ├── case_keywords (1:N)
  ├── case_legal_bases (1:N)
  ├── case_action_steps (1:N)
  └── case_templates (1:N)

blacklist_entries (独立表，含审核状态)
cities
  ├── city_policies (1:N)
  ├── city_contacts (1:N)
  └── city_verdicts (1:N)
```

### 4.2 关键索引

```sql
-- 会话查询（用户历史列表）
CREATE INDEX ix_chatsession_user_updated ON chat_sessions(user_id, updated_at);

-- 消息查询（会话内消息列表）
CREATE INDEX ix_chatmessage_session_created ON chat_messages(session_id, created_at);

-- 进度追踪查询
CREATE INDEX ix_progress_user_updated ON progress_trackers(user_id, updated_at);
```

---

## 5. API 设计

### 5.1 主要端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/chat | SSE 流式对话 | 可选 |
| POST | /api/auth/register | 注册 | 无 |
| POST | /api/auth/login | 登录 | 无 |
| POST | /api/auth/refresh | 刷新 token | 无 |
| POST | /api/auth/change-password | 改密 | 必须 |
| GET | /api/chat/sessions | 历史会话列表 | 必须 |
| PATCH | /api/chat/sessions/{id} | 创建/更新会话 | 必须 |
| POST | /api/deposit-calc/calculate | 押金计算 | 可选 |
| POST | /api/documents/generate | 文书生成 | 可选 |
| POST | /api/landlord-scripts/analyze | 话术分析(SSE) | 可选 |
| GET/POST | /api/progress | 维权进度 CRUD | 必须 |
| GET | /api/blacklist/search | 黑名单查询 | 可选 |
| GET | /api/minfadian | 民法典全文搜索 | 无 |

### 5.2 SSE 事件协议

```
data: {"type": "searching", "message": "正在加载法律条文…"}
data: {"type": "text", "content": "根据《民法典》..."}
data: {"type": "ping"}          // 心跳保活，15s 一次
data: {"type": "done"}
data: {"type": "error", "message": "..."}
```

---

## 6. 前端架构

### 6.1 状态管理

```typescript
// chatStore: 多 session 并行，支持后台流
sessionMessages: Record<sessionId, Message[]>
streamingSessionIds: Set<string>   // 正在流式的 session
searchingSessionIds: Set<string>   // 正在搜索的 session

// authStore: JWT 持久化
user, isAuthenticated, login/logout/restoreSession

// toastStore: 全局通知
toasts: ToastItem[]  // 3.5s 自动消失
```

### 6.2 路由结构

```
/                    案例库（首页）
/chat                AI 维权对话
/cases/:id           案例详情
/tools               法律工具（证据清单/模板/民法典）
/deposit-calc        押金折旧计算器
/landlord-scripts    房东话术识别
/document-gen        法律文书生成
/progress            维权进度追踪
/blacklist           房东黑名单
/cities              城市专项信息
/profile             个人中心
```

---

## 7. 安全设计

| 措施 | 实现 |
|------|------|
| 密码存储 | SHA-256 + 随机 salt，格式：`sha256$salt$digest` |
| Token 安全 | refresh_token 仅存哈希，每次刷新轮换（防重放） |
| 速率限制 | chat 接口 30次/分钟（基于 IP） |
| 输入校验 | 前端 Zod + 后端 Pydantic 双重校验 |
| CORS | 白名单配置，生产环境限制来源 |
| SQL 注入 | SQLAlchemy ORM 参数化查询，无裸 SQL |

---

## 8. 部署

```yaml
# docker-compose.yml
services:
  backend:   # FastAPI + Uvicorn，端口 8000
  frontend:  # Nginx 静态服务 React 构建产物
  db:        # PostgreSQL 15
```

开发模式：SQLite 自动兜底，无需额外配置，`python backend/main.py` 即可启动。
