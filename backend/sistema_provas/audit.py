"""Trilha de auditoria de acessos e ações sensíveis (RBAC).

Registra eventos como login, refresh de token, recuperação de senha e
ações administrativas, junto do papel (role) do usuário. O registro é
best-effort: qualquer falha é logada e engolida para não impactar a
requisição principal.
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from sistema_provas.models import AuditLog, User

logger = logging.getLogger('sistema_provas.audit')


async def record_audit(  # noqa: PLR0913
    session: AsyncSession,
    action: str,
    *,
    user: Optional[User] = None,
    email: Optional[str] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    try:
        entry = AuditLog(
            action=action,
            user_id=user.id if user is not None else None,
            user_email=email or (user.email if user is not None else None),
            user_role=getattr(user, 'role', None)
            if user is not None
            else None,
            detail=detail,
            ip_address=ip_address,
        )
        session.add(entry)
        await session.commit()
    except Exception as exc:  # auditoria nunca quebra o fluxo principal
        logger.warning('Falha ao registrar auditoria (%s): %s', action, exc)
        try:
            await session.rollback()
        except Exception:  # pragma: no cover
            pass
