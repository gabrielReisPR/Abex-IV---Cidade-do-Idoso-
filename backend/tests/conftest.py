from contextlib import contextmanager
from datetime import datetime

import factory
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool

from sistema_provas.app import app
from sistema_provas.database import get_session
from sistema_provas.models import Activity, MenuItem, User, table_registry
from sistema_provas.security import get_password_hash
from sistema_provas.settings import Settings


@pytest.fixture
def client(session) -> TestClient:
    def get_session_override():
        return session

    with TestClient(app) as client:
        app.dependency_overrides[get_session] = get_session_override
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine(
        'sqlite+aiosqlite:///:memory:',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(table_registry.metadata.create_all)

    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(table_registry.metadata.drop_all)


@contextmanager
def _mock_db_time(*, model, time=datetime(2025, 5, 20)):
    def fake_time_hook(mapper, connection, target):
        if hasattr(target, 'created_at'):
            target.created_at = time
        if hasattr(target, 'updated_at'):
            target.updated_at = time

    event.listen(model, 'before_insert', fake_time_hook)

    yield time

    event.remove(model, 'before_insert', fake_time_hook)


@pytest.fixture
def mock_db_time():
    return _mock_db_time


@pytest_asyncio.fixture
async def user(session):
    password = 'secret'
    user = UserFactory(password=get_password_hash(password))

    session.add(user)
    await session.commit()
    await session.refresh(user)

    user.clean_password = password

    return user


@pytest_asyncio.fixture
async def other_user(session):
    password = 'testtest'
    user = UserFactory(password=get_password_hash(password))

    session.add(user)
    await session.commit()
    await session.refresh(user)

    user.clean_password = password

    return user


@pytest.fixture
def token(client, user):
    response = client.post(
        '/auth/token',
        data={'username': user.email, 'password': user.clean_password},
    )

    return response.json()['access_token']


@pytest_asyncio.fixture
async def staff_user(session):
    password = 'staffsecret'
    user = UserFactory(
        password=get_password_hash(password),
        is_staff=True,
        role='funcionario',
        username='staff1',
        email='staff1@test.com',
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    user.clean_password = password
    return user


@pytest.fixture
def staff_token(client, staff_user):
    response = client.post(
        '/auth/token',
        data={
            'username': staff_user.email,
            'password': staff_user.clean_password,
        },
    )
    return response.json()['access_token']


@pytest_asyncio.fixture
async def admin_user(session):
    password = 'adminsecret'
    user = UserFactory(
        password=get_password_hash(password),
        is_staff=True,
        role='admin',
        username='admin1',
        email='admin1@test.com',
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    user.clean_password = password
    return user


@pytest.fixture
def admin_token(client, admin_user):
    response = client.post(
        '/auth/token',
        data={
            'username': admin_user.email,
            'password': admin_user.clean_password,
        },
    )
    return response.json()['access_token']


@pytest_asyncio.fixture
async def sample_menu(session):
    items = [
        MenuItem(
            dia_label='Segunda-feira',
            ordem_dia=1,
            ordem_refeicao=1,
            refeicao='Almoço',
            titulo='Almoço especial',
            descricao='Arroz, feijão e salada.',
            imagem_url='https://example.com/a.jpg',
        ),
        MenuItem(
            dia_label='Segunda-feira',
            ordem_dia=1,
            ordem_refeicao=2,
            refeicao='Jantar',
            titulo='Jantar leve',
            descricao='Sopa e fruta.',
            imagem_url='https://example.com/b.jpg',
        ),
    ]
    for m in items:
        session.add(m)
    await session.commit()
    return items


@pytest_asyncio.fixture
async def sample_activities(session):
    items = [
        Activity(
            title='Yoga Bloco A1',
            time_label='15:00h',
            date_label='24 de janeiro',
            image_url='https://example.com/yoga.jpg',
        ),
        Activity(
            title='Natação',
            time_label='10:00h',
            date_label='Segundas',
            image_url='https://example.com/nat.jpg',
        ),
    ]
    for a in items:
        session.add(a)
    await session.commit()
    for a in items:
        await session.refresh(a)
    return items


@pytest.fixture
def settings():
    settings = Settings()
    return settings


class UserFactory(factory.Factory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'test{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@test.com')
    password = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    is_staff = False
