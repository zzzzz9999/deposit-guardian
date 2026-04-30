"""AI 案例生成器运行状态单例（进程内，无需 DB）"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class AiRunState:
    last_run_at: Optional[str] = None
    last_run_added: Optional[int] = None
    last_run_skipped: Optional[int] = None
    last_run_errors: Optional[int] = None
    last_run_status: str = "never"   # "never" | "ok" | "error" | "running"
    is_running: bool = False


run_state = AiRunState()
