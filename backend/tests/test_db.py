from dataclasses import asdict

import pytest
from sqlalchemy import select

from sistema_provas.models import User


@pytest.mark.asyncio
async def test_create_user(session, mock_db_time):
    with mock_db_time(model=User) as time:
        new_user = User(username='test', email='test@test', password='secret')

        session.add(new_user)
        await session.commit()

        user = await session.scalar(
            select(User).where(User.username == 'test')
        )

    assert asdict(user) == {
        'id': 1,
        'username': 'test',
        'email': 'test@test',
        'password': 'secret',
        'first_name': None,
        'last_name': None,
        'phone': None,
        'birth_date': None,
        'gender': None,
        'address': None,
        'city': None,
        'state': None,
        'zip_code': None,
        'is_staff': False,
        'role': 'idoso',
        'created_at': time,
        'updated_at': time,
    }
