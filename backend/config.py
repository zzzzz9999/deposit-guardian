import os
from pathlib import Path

PROJECT_DIR = Path(__file__).parent

CLAUDE_API_URL = "https://mcli.sankuai.com/v1/messages"
CLAUDE_MODEL = "claude-sonnet-4-6"
CLAUDE_MAX_TOKENS = 4096

def get_auth_token():
    token = os.environ.get("ANTHROPIC_AUTH_TOKEN", "")
    if not token:
        env_file = PROJECT_DIR.parent / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("ANTHROPIC_AUTH_TOKEN="):
                    token = line.split("=", 1)[1].strip()
                    break
    return token

CLAUDE_HEADERS = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-ide-type": "CatPaw_IDE",
    "x-working-dir": "d%3A%5CRJ%5CCatPawPJ",
    "x-repo-url": "unknown",
    "x-branch": "master",
}
