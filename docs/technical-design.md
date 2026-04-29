# 租客卫士技术设计文档

**技术栈**：React 18 + FastAPI + PostgreSQL + Claude API + Docker Compose

**架构**：浏览器 → Nginx → FastAPI → PostgreSQL/Redis，AI 调用走 Claude API 流式 SSE

**核心模块**：
- `claude_service.py`：注入本地 78 条法律原文 + Bing 搜索结果，流式输出给前端
- `ai_case_generator.py`：每日从最高法/住建部爬取文章，Claude 提取案例写库
- `mcp-server/`：暴露维权工具为 MCP 接口，供外部 Agent 调用

**安全**：JWT 双 token + 速率限制 30次/min + 投稿人工审核
