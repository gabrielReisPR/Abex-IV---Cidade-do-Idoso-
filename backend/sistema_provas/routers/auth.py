from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.audit import record_audit
from sistema_provas.database import get_session
from sistema_provas.models import User
from sistema_provas.schemas import RefreshTokenBody, Token
from sistema_provas.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_current_user,
    verify_password,
)

OAuth2Form = Annotated[OAuth2PasswordRequestForm, Depends()]
Session = Annotated[AsyncSession, Depends(get_session)]
router = APIRouter(prefix='/auth', tags=['auth'])
CurrentUser = Annotated[User, Depends(get_current_user)]


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else '-'


@router.post('/token')
async def login_for_acess_token(
    form_data: OAuth2Form,
    session: Session,
    request: Request,
):
    user = await session.scalar(
        select(User).where((User.email == form_data.username))
    )

    exception = HTTPException(
        status_code=HTTPStatus.UNAUTHORIZED,
        detail='Incorrect email or password',
    )

    if not user:
        raise exception

    if not verify_password(form_data.password, user.password):
        raise exception

    access_token = create_access_token(data={'sub': user.email})
    refresh_token = create_refresh_token(data={'sub': user.email})

    await record_audit(
        session, 'login', user=user, ip_address=_client_ip(request)
    )

    return {
        'access_token': access_token,
        'token_type': 'Bearer',
        'refresh_token': refresh_token,
    }


@router.post('/refresh_token', response_model=Token)
async def refresh_access_token(user: CurrentUser):
    """Renova o access token a partir de um access token ainda válido
    (compatibilidade com o fluxo existente)."""
    new_access_token = create_access_token(data={'sub': user.email})

    return {'access_token': new_access_token, 'token_type': 'bearer'}


@router.post('/refresh', response_model=Token)
async def refresh_with_refresh_token(
    body: RefreshTokenBody,
    session: Session,
    request: Request,
):
    """Renova o access token usando o refresh token (Sprint 5).

    Permite ao frontend renovar a sessão automaticamente, sem relogin,
    mesmo após a expiração do access token. Faz rotação do refresh token.
    """
    email = decode_refresh_token(body.refresh_token)

    user = await session.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail='Could not validate credentials',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    new_access = create_access_token(data={'sub': user.email})
    new_refresh = create_refresh_token(data={'sub': user.email})

    await record_audit(
        session, 'token_refresh', user=user, ip_address=_client_ip(request)
    )

    return {
        'access_token': new_access,
        'token_type': 'Bearer',
        'refresh_token': new_refresh,
    }
