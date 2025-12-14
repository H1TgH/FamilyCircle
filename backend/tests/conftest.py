import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from src.config import config
from src.database import Base, get_session
from src.main import app


TEST_DATABASE_URL = f'postgresql+asyncpg://{config.db.user}:{config.db.password.get_secret_value()}@127.0.0.1:{config.db.port}/{config.db.dbname}'

test_engine = create_async_engine(
    TEST_DATABASE_URL, 
    echo=False,
    poolclass=NullPool,
    pool_pre_ping=True,
)

test_async_session = async_sessionmaker(
    test_engine, 
    expire_on_commit=False, 
    autoflush=False,
    class_=AsyncSession
)


@pytest.fixture(scope='session')
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope='function')
async def db_session():
    default_engine = create_async_engine(
        f'postgresql+asyncpg://{config.db.user}:{config.db.password.get_secret_value()}@127.0.0.1:{config.db.port}/postgres',
        isolation_level='AUTOCOMMIT',
        poolclass=NullPool,
    )

    async with default_engine.connect() as conn:
        result = await conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname='familycircle'")
        )
        exists = result.scalar()

        if not exists:
            await conn.execute(text('CREATE DATABASE familycircle'))

    await default_engine.dispose()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with test_async_session() as session:
        try:
            yield session
        finally:
            await session.rollback()
            async with test_engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
                await conn.run_sync(Base.metadata.create_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url='http://test'
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    return {
        'login': f'testuser_{unique_id}',
        'email': f'test_{unique_id}@example.com',
        'surname': 'Test',
        'name': 'User',
        'patronymic': 'Testovich',
        'phone_number': f'+7999{unique_id[:7]}',
        'password': 'TestPassword123!',
    }

@pytest.fixture
def test_volunteer_data():
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    return {
        'login': f'testvolunteer_{unique_id}',
        'email': f'volunteer_{unique_id}@example.com',
        'surname': 'Volunteer',
        'name': 'Test',
        'patronymic': 'Testovich',
        'phone_number': f'+7999{unique_id[:7]}',
        'password': 'VolunteerPass123!',
        'birthday': '1990-01-01',
    }

@pytest.fixture
def test_elder_data():
    return {
        'full_name': 'Elder Person',
        'birthday': '1945-05-09',
        'health_status': 'Good',
        'physical_limitations': 'Mobility issues',
        'disease': 'Arthritis',
        'address': '123 Test Street',
        'features': 'Needs wheelchair',
        'hobbies': 'Reading, Chess',
        'comments': 'Prefers morning visits',
    }


@pytest.fixture
def test_request_data():
    return {
        'check_list': ['Buy groceries', 'Clean apartment'],
        'category': 'Shopping',
        'description': 'Weekly grocery shopping',
        'address': '123 Test Street',
        'scheduled_time': '2025-12-01T10:00:00Z',
    }