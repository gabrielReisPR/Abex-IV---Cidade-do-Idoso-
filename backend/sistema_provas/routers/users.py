from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.database import get_session
from sistema_provas.models import User
from sistema_provas.schemas import (
    FilterPage,
    Message,
    UserList,
    UserProfileUpdate,
    UserPublic,
    UserSchema,
)
from sistema_provas.security import get_current_user, get_password_hash

router = APIRouter(prefix='/users', tags=['users'])
Session = Annotated[AsyncSession, Depends(get_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post(
    '/',
    status_code=HTTPStatus.CREATED,
    response_model=UserPublic,
    response_model_exclude_none=True,
)
async def create_user(user: UserSchema, session: Session):
    db_user = await session.scalar(
        select(User).where(
            (User.username == user.username) | (User.email == user.email)
        )
    )

    if db_user:
        if db_user.username == user.username:
            raise HTTPException(
                detail='Username already exists',
                status_code=HTTPStatus.CONFLICT,
            )
        elif db_user.email == user.email:
            raise HTTPException(
                detail='Email already exists', status_code=HTTPStatus.CONFLICT
            )

    db_user = User(
        **user.model_dump(exclude={'password'}),
        password=get_password_hash(user.password),
    )

    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)

    return db_user


@router.get(
    '/me',
    status_code=HTTPStatus.OK,
    response_model=UserPublic,
    response_model_exclude_none=True,
)
async def read_user_me(current_user: CurrentUser):
    """
    Rota especial para o Front-end descobrir quem está logado.
    Como o 'current_user' já faz o select no banco e valida o token,
    nós só precisamos retornar ele direto!
    """
    return current_user


@router.patch(
    '/me',
    status_code=HTTPStatus.OK,
    response_model=UserPublic,
    response_model_exclude_none=True,
)
async def update_user_me(
    body: UserProfileUpdate,
    session: Session,
    current_user: CurrentUser,
):
    """Atualização parcial do perfil do próprio usuário (sem senha)."""
    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(current_user, field, value)
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.get(
    '/',
    status_code=HTTPStatus.OK,
    response_model=UserList,
    response_model_exclude_none=True,
)
async def read_users(
    session: Session,
    current_user: CurrentUser,
    filter_users: Annotated[FilterPage, Query()],
):
    query = await session.scalars(
        select(User).limit(filter_users.limit).offset(filter_users.offset)
    )
    users = query.all()
    return {'users': users}


@router.put(
    '/{user_id}',
    status_code=HTTPStatus.OK,
    response_model=UserPublic,
    response_model_exclude_none=True,
)
async def update_user(
    user_id: int,
    user: UserSchema,
    session: Session,
    current_user: CurrentUser,
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail='Not enough permissions',
        )

    try:
        current_user.email = user.email
        current_user.username = user.username
        current_user.password = get_password_hash(user.password)

        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)

        return current_user

    except IntegrityError:
        raise HTTPException(
            HTTPStatus.CONFLICT,
            detail='Username or Email already exists',
        )


@router.delete('/{user_id}', status_code=HTTPStatus.OK, response_model=Message)
async def delete_user(
    user_id: int,
    session: Session,
    current_user: CurrentUser,
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail='Not enough permissions',
        )

    await session.delete(current_user)
    await session.commit()

    return {'Message': 'User deleted'}


@router.get(
    '/{user_id}',
    status_code=HTTPStatus.OK,
    response_model=UserPublic,
    response_model_exclude_none=True,
)
async def read_user(user_id: int, session: Session):
    user_db = await session.scalar(select(User).where(User.id == user_id))

    if not user_db:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail='User Not Found',
        )

    return user_db
