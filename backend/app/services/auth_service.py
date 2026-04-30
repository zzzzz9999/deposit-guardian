"""Authentication business logic service."""
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.user import User
from app.repositories.user import RefreshTokenRepository, UserRepository
from app.schemas.user import AuthResponse, LoginRequest, RegisterRequest, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_repo = RefreshTokenRepository(db)

    async def register(self, req: RegisterRequest) -> AuthResponse:
        if await self.user_repo.exists_by_email_or_username(req.email, req.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱或用户名已被注册",
            )

        user = await self.user_repo.create(
            id=str(uuid.uuid4()),
            username=req.username,
            email=req.email,
            phone=req.phone,
            password_hash=hash_password(req.password),
        )

        raw, hashed, expires_at = create_refresh_token()
        await self.token_repo.create(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hashed,
            expires_at=expires_at,
        )

        return AuthResponse(
            user=UserResponse.model_validate(user),
            access_token=create_access_token(user.id, user.is_admin),
            refresh_token=raw,
        )

    async def login(self, req: LoginRequest) -> AuthResponse:
        user = await self.user_repo.get_by_email(req.email)
        if not user or not user.is_active or not verify_password(req.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="邮箱或密码错误",
            )

        raw, hashed, expires_at = create_refresh_token()
        await self.token_repo.create(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hashed,
            expires_at=expires_at,
        )

        return AuthResponse(
            user=UserResponse.model_validate(user),
            access_token=create_access_token(user.id, user.is_admin),
            refresh_token=raw,
        )

    async def refresh(self, raw_token: str) -> dict:
        hashed = hash_refresh_token(raw_token)
        token_row = await self.token_repo.get_valid(hashed)
        if not token_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token 无效或已过期",
            )

        await self.token_repo.revoke(token_row)
        user = await self.user_repo.get_by_id(token_row.user_id)

        raw, new_hashed, expires_at = create_refresh_token()
        await self.token_repo.create(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=new_hashed,
            expires_at=expires_at,
        )

        return {
            "access_token": create_access_token(user.id, user.is_admin),
            "refresh_token": raw,
        }

    async def logout(self, raw_token: str) -> None:
        hashed = hash_refresh_token(raw_token)
        token_row = await self.token_repo.get_valid(hashed)
        if token_row:
            await self.token_repo.revoke(token_row)

    async def change_password(
        self, user: User, old_password: str, new_password: str, confirm_password: str
    ) -> None:
        if new_password != confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="两次输入的新密码不一致",
            )
        if not verify_password(old_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="原密码错误",
            )
        if old_password == new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="新密码不能与原密码相同",
            )
        user.password_hash = hash_password(new_password)
