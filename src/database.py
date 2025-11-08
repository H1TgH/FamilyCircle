from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.config import config


DATABASE_URL = f'postgresql+asyncpg://{config.db.user}:{config.db.password.get_secret_value()}@{config.db.host}:{config.db.port}/{config.db.dbname}'


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    DATABASE_URL,
    echo=True
)


async_session = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False
)


async def get_session():
    async with async_session() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]
