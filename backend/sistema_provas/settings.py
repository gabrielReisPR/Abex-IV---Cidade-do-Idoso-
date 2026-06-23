from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração da aplicação (Portal Cidade do Idoso).

    Todos os campos têm defaults seguros de desenvolvimento para que a
    aplicação, os testes e o CI subam sem depender de um arquivo .env.
    Em produção (Docker), os valores são sobrescritos pelas variáveis de
    ambiente / .env (ver .env.example na raiz do repositório).
    """

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    # --- Banco de dados ---
    DATABASE_URL: str = 'sqlite+aiosqlite:///./database.db'

    # --- Autenticação / JWT ---
    SECRET_KEY: str = 'dev-secret-key-troque-em-producao'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Cache (Redis) — vazio = cache desabilitado (no-op) ---
    REDIS_URL: str = ''
    CACHE_DEFAULT_TTL_SECONDS: int = 60

    # --- Frontend (para montar links em e-mails) ---
    FRONTEND_BASE_URL: str = 'http://localhost:8080'

    # --- E-mail (SMTP) — usado na recuperação de senha ---
    # Sem MAIL_SERVER/MAIL_USERNAME configurados, o envio é pulado
    # (apenas registrado em log) para não travar testes/dev.
    MAIL_USERNAME: str = ''
    MAIL_PASSWORD: str = ''
    MAIL_FROM: str = 'nao-responder@cidadeidoso.local'
    MAIL_FROM_NAME: str = 'Portal Cidade do Idoso'
    MAIL_PORT: int = 587
    MAIL_SERVER: str = ''
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
