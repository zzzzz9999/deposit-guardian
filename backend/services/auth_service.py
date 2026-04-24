"""JWT 认证服务"""
import hashlib, os, secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError

# 用 SHA-256 + salt 替代 bcrypt，避免 passlib/bcrypt 版本兼容问题
def _hash_sha256(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = _hash_sha256(password, salt)
    return f"sha256${salt}${digest}"

def verify_password(plain: str, hashed: str) -> bool:
    try:
        scheme, salt, digest = hashed.split("$", 2)
        if scheme != "sha256":
            return False
        return secrets.compare_digest(_hash_sha256(plain, salt), digest)
    except Exception:
        return False

JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-in-production")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", 7))


def create_access_token(user_id: str, is_admin: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "is_admin": is_admin, "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token() -> tuple[str, str, datetime]:
    """返回 (raw_token, hashed_token, expires_at)"""
    raw = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_DAYS)
    return raw, hashed, expires_at


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None
