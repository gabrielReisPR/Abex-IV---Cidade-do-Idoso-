import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.audit import record_audit
from sistema_provas.database import get_session
from sistema_provas.mail import send_password_reset_email
from sistema_provas.models import PasswordResetToken, User
from sistema_provas.schemas import PasswordResetConfirmBody
from sistema_provas.security import get_password_hash
from sistema_provas.settings import Settings

logger = logging.getLogger(__name__)
settings = Settings()

router = APIRouter(tags=['password'])
Session = Annotated[AsyncSession, Depends(get_session)]

RESET_TOKEN_TTL_MINUTES = 60


class PasswordResetRequestBody(BaseModel):
    email: EmailStr


def _utc_now() -> datetime:
    """Hora atual em UTC (naive) — consistente entre escrita e leitura."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


@router.post('/password/reset-request')
async def solicitar_redefinicao_senha(
    body: PasswordResetRequestBody,
    session: Session,
):
    """Solicita redefinição de senha.

    Compatível com `esqueci-senha.js`: sucesso = HTTP 200 ({}); e-mail
    não encontrado = 404 com a chave `message`. Gera um token de uso
    único (hash persistido) e envia o link por e-mail (SMTP).
    """
    user = await session.scalar(select(User).where(User.email == body.email))

    if not user:
        return JSONResponse(
            status_code=HTTPStatus.NOT_FOUND,
            content={
                'message': 'E-mail não encontrado ou inválido.',
            },
        )

    # Invalida tokens anteriores não usados deste usuário (pedir um novo
    # reset revoga os links antigos).
    await session.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used.is_(False),
        )
        .values(used=True)
    )

    token = secrets.token_urlsafe(48)
    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=_utc_now() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
    )
    session.add(reset)
    await session.commit()

    reset_link = (
        f'{settings.FRONTEND_BASE_URL.rstrip("/")}'
        f'/redefinir-senha.html?token={token}'
    )
    await send_password_reset_email(user.email, reset_link)
    await record_audit(session, 'password_reset_request', user=user)

    return JSONResponse(status_code=HTTPStatus.OK, content={})


@router.post('/password/reset')
async def confirmar_redefinicao_senha(
    body: PasswordResetConfirmBody,
    session: Session,
):
    """Confirma a redefinição com o token recebido por e-mail."""
    reset = await session.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(body.token),
            PasswordResetToken.used.is_(False),
        )
    )

    if not reset or reset.expires_at < _utc_now():
        return JSONResponse(
            status_code=HTTPStatus.BAD_REQUEST,
            content={'message': 'Token inválido ou expirado.'},
        )

    user = await session.scalar(select(User).where(User.id == reset.user_id))
    if not user:
        return JSONResponse(
            status_code=HTTPStatus.BAD_REQUEST,
            content={'message': 'Token inválido ou expirado.'},
        )

    user.password = get_password_hash(body.nova_senha)
    reset.used = True
    session.add(user)
    session.add(reset)
    await session.commit()
    await record_audit(session, 'password_reset', user=user)

    return JSONResponse(
        status_code=HTTPStatus.OK,
        content={'message': 'Senha redefinida com sucesso.'},
    )
