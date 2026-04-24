"""用户注册/登录/刷新 Token"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from db_models import User, RefreshToken
from services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, hash_refresh_token
)
from middleware.auth_middleware import get_current_user
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


def user_response(user: User) -> dict:
    return {
        "id": user.id, "username": user.username, "email": user.email,
        "phone": user.phone, "avatar_url": user.avatar_url,
        "is_admin": user.is_admin, "created_at": user.created_at.isoformat() if user.created_at else None
    }


@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # 检查邮箱/用户名是否已存在
    existing = await db.execute(
        select(User).where((User.email == req.email) | (User.username == req.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="邮箱或用户名已被注册")

    user = User(
        id=str(uuid.uuid4()),
        username=req.username,
        email=req.email,
        phone=req.phone,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.flush()

    raw, hashed, expires_at = create_refresh_token()
    db.add(RefreshToken(
        id=str(uuid.uuid4()), user_id=user.id,
        token_hash=hashed, expires_at=expires_at
    ))
    await db.commit()

    return {
        "user": user_response(user),
        "access_token": create_access_token(user.id, user.is_admin),
        "refresh_token": raw,
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    raw, hashed, expires_at = create_refresh_token()
    db.add(RefreshToken(
        id=str(uuid.uuid4()), user_id=user.id,
        token_hash=hashed, expires_at=expires_at
    ))
    await db.commit()

    return {
        "user": user_response(user),
        "access_token": create_access_token(user.id, user.is_admin),
        "refresh_token": raw,
    }


@router.post("/refresh")
async def refresh_token(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    hashed = hash_refresh_token(req.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hashed,
            RefreshToken.revoked_at == None,
            RefreshToken.expires_at > datetime.now(timezone.utc)
        )
    )
    token_row = result.scalar_one_or_none()
    if not token_row:
        raise HTTPException(status_code=401, detail="Refresh token 无效或已过期")

    # 撤销旧 token，发放新 token
    token_row.revoked_at = datetime.now(timezone.utc)
    user_result = await db.execute(select(User).where(User.id == token_row.user_id))
    user = user_result.scalar_one()

    raw, new_hashed, expires_at = create_refresh_token()
    db.add(RefreshToken(
        id=str(uuid.uuid4()), user_id=user.id,
        token_hash=new_hashed, expires_at=expires_at
    ))
    await db.commit()

    return {
        "access_token": create_access_token(user.id, user.is_admin),
        "refresh_token": raw,
    }


@router.post("/logout")
async def logout(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    hashed = hash_refresh_token(req.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hashed))
    token_row = result.scalar_one_or_none()
    if token_row:
        token_row.revoked_at = datetime.now(timezone.utc)
        await db.commit()
    return {"message": "已退出登录"}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user_response(user)


@router.patch("/me")
async def update_me(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    allowed = {"username", "phone", "avatar_url"}
    for key, val in data.items():
        if key in allowed:
            setattr(user, key, val)
    await db.commit()
    return user_response(user)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)
    confirm_password: str


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="两次输入的新密码不一致")
    if not verify_password(req.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")
    if req.old_password == req.new_password:
        raise HTTPException(status_code=400, detail="新密码不能与原密码相同")
    user.password_hash = hash_password(req.new_password)
    await db.commit()
    return {"message": "密码已修改，请重新登录"}
