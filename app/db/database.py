from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url.get_secret_value()
    pool_pre_ping=True
    pool_size=10
    max_overflow=20
)

AsyncSessionFactory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        await session.execute(
            text("SELECT set_config('app.pgp_key', :key, true)"),
            {"key": settings.pgp_key.get_secret_value()},
        )
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise