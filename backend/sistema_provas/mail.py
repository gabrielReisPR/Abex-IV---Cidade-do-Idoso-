"""Envio de e-mail (SMTP) via fastapi-mail.

Usado no fluxo de recuperação de senha. Se o SMTP não estiver
configurado (MAIL_SERVER/MAIL_USERNAME vazios), o envio é apenas
registrado em log — isso mantém os testes e o ambiente de dev
funcionando sem credenciais. Em produção, preencha MAIL_* no .env
(ver .env.example) para que o e-mail seja realmente enviado.
"""

import logging

from sistema_provas.settings import Settings

logger = logging.getLogger('sistema_provas.mail')
settings = Settings()


def mail_configured() -> bool:
    return bool(settings.MAIL_SERVER and settings.MAIL_USERNAME)


def _build_reset_html(reset_link: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #222;">
      <h2>Portal Cidade do Idoso</h2>
      <p>Recebemos um pedido para redefinir a sua senha.</p>
      <p>Para criar uma nova senha, clique no botão abaixo:</p>
      <p>
        <a href="{reset_link}"
           style="background:#00B931;color:#01200F;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;">
          Redefinir minha senha
        </a>
      </p>
      <p>Se o botão não funcionar, copie e cole este endereço no navegador:</p>
      <p><a href="{reset_link}">{reset_link}</a></p>
      <p>Se você não solicitou, ignore este e-mail.</p>
    </div>
    """


async def send_password_reset_email(email: str, reset_link: str) -> bool:
    """Envia o e-mail de recuperação de senha. Retorna True se enviado."""
    if not mail_configured():
        logger.info(
            'SMTP não configurado — link de redefinição para %s: %s',
            email,
            reset_link,
        )
        return False

    try:
        # Import tardio: mantém o fastapi-mail como dependência opcional.
        from fastapi_mail import (  # noqa: PLC0415
            ConnectionConfig,
            FastMail,
            MessageSchema,
            MessageType,
        )

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
        message = MessageSchema(
            subject='Recuperação de senha — Portal Cidade do Idoso',
            recipients=[email],
            body=_build_reset_html(reset_link),
            subtype=MessageType.html,
        )
        await FastMail(conf).send_message(message)
        logger.info('E-mail de redefinição enviado para %s', email)
        return True
    except Exception as exc:  # não derruba o endpoint se o SMTP falhar
        logger.error('Falha ao enviar e-mail para %s: %s', email, exc)
        return False
