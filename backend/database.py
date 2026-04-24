from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from pathlib import Path
import os

# 优先使用环境变量中的 PostgreSQL，否则降级到本地 SQLite
_pg_url = os.environ.get("DATABASE_URL", "")
if _pg_url and "postgresql" in _pg_url:
    DATABASE_URL = _pg_url
else:
    # SQLite 本地开发模式（无需安装 PostgreSQL）
    _db_path = Path(__file__).parent / "local.db"
    # Windows 路径需要用正斜杠
    DATABASE_URL = f"sqlite+aiosqlite:///{_db_path.as_posix()}"

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    # SQLite 不支持 pool_pre_ping
    **({} if _is_sqlite else {"pool_pre_ping": True}),
    # SQLite 需要允许同一线程外访问
    **({"connect_args": {"check_same_thread": False}} if _is_sqlite else {}),
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """创建所有表（SQLite 开发模式使用）"""
    async with engine.begin() as conn:
        from db_models import Base as ModelBase  # noqa
        await conn.run_sync(ModelBase.metadata.create_all)
