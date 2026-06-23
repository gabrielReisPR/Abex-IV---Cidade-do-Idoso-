# Portal Cidade do Idoso — Consolidação das Sprints

Este documento mapeia as funcionalidades descritas como **concluídas** nos
relatórios das Sprints 1, 2, 4 e 5 para a implementação no código, e explica
como rodar e validar o sistema.

## Como rodar (Docker)

```bash
cp .env.example .env        # ajuste SMTP/SECRET_KEY se for usar e-mail real
docker compose up -d --build
```

- Frontend (nginx): http://localhost:8080
- API (FastAPI): http://localhost:8000 — **documentação Swagger em /docs**
- Postgres e Redis ficam apenas na rede interna do Compose.

O `docker-entrypoint.sh` aplica as migrations (`alembic upgrade head`) antes de
subir a API.

## Como criar um funcionário / administrador

Não há cadastro público de funcionário (por segurança). Após cadastrar um
usuário normal pelo portal, promova-o no banco:

```sql
-- Funcionário (acesso ao portal da equipe)
UPDATE users SET role = 'funcionario', is_staff = true WHERE email = 'fulano@exemplo.com';
-- Administrador (acesso total, inclusive rotas admin)
UPDATE users SET role = 'admin', is_staff = true WHERE email = 'gestora@exemplo.com';
```

`role` é a fonte de verdade do RBAC (`idoso` | `funcionario` | `admin`); o
campo legado `is_staff` é mantido em sincronia para compatibilidade.

## Mapa: relatório → implementação

### Sprint 1 e 2 — Backend Python/FastAPI
| Funcionalidade | Onde |
|---|---|
| Login JWT | `routers/auth.py`, `security.py` |
| Cadastro / listagem / perfil de idosos | `routers/users.py` (`POST /users`, `GET /users`, `GET/PATCH /users/me`) |
| Recuperação de senha por e-mail (SMTP) | `routers/password.py`, `mail.py` (token com hash, uso único, `POST /password/reset`) |
| Notícias CRUD + **upload de imagem** | `routers/noticias.py` (`POST /noticias/{id}/imagem`), `storage.py`, StaticFiles em `/uploads` |
| Atividades: catálogo + inscrição com **regra de vagas** | `routers/atividades.py` (capacidade/ocupação) |
| Cardápio CRUD | `routers/cardapio.py` |
| Testes automatizados (pytest) | `backend/tests/` (62 testes) |
| Documentação da API (Swagger) | FastAPI em `/docs` |
| Migrations versionadas (Alembic) | `backend/migrations/versions/` |

### Sprint 4 — Monitoramento, Performance e Dashboard
| Funcionalidade | Onde |
|---|---|
| Logs estruturados / monitoramento | `app.py` (middleware de request logging + `X-Process-Time-ms`) |
| Cache Redis | `cache.py` (cache-aside) |
| Dashboard administrativo (MVP) | `routers/dashboard.py` + `frontend/dashboard.html` |
| Ampliação de testes | suíte pytest expandida |

### Sprint 5 — Acessibilidade, Usabilidade e Consolidação
| Funcionalidade | Onde |
|---|---|
| Acessibilidade WCAG AA (fonte, contraste, ARIA, foco) | `frontend/accessibility.js` + `accessibility.css` (widget global) + ARIA nas telas |
| Dashboard evoluído (gráfico de linha, barras, **alertas >90%**, **CSV**) | `routers/dashboard.py`, `frontend/dashboard.js` (Chart.js) |
| Exportação CSV de inscrições/presença | `GET /dashboard/export/inscricoes.csv` (sanitizado contra CSV injection) |
| **Refresh token automático** | `security.py` (`/auth/refresh`, rotação) + `frontend/api-base.js` (wrapper de fetch) |
| Segurança: proteção por role + **auditoria** | `security.py` (`get_current_admin_user`), `audit.py` (`audit_logs`) |
| Cache **write-through** + métricas | invalidação por evento em cardápio/notícias + `GET /metrics/cache` |
| Testes Playwright (e2e) | `frontend/e2e/` (8 casos de acessibilidade + fluxos) |
| CI/CD (gate de qualidade) | `.github/workflows/ci.yml` (ruff + pytest + Docker + Playwright) |

> **Itens de backlog** dos relatórios (não marcados como concluídos) **não**
> foram implementados: QR Code de presença, comunicados por grupo, push
> notifications e manual do usuário.

## Testes

```bash
# Backend (lint + testes)
cd backend && poetry install && poetry run ruff check && poetry run pytest

# E2E (com a stack Docker no ar)
cd frontend && npm install && npx playwright install chromium
E2E_BASE_URL=http://localhost:8080 npx playwright test
```

## Variáveis de ambiente relevantes (.env)

- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` (30), `REFRESH_TOKEN_EXPIRE_DAYS` (7)
- `DATABASE_URL` (Postgres no Docker)
- `REDIS_URL` (cache; vazio desabilita o cache)
- `MAIL_*` (SMTP da recuperação de senha; vazio = envio apenas logado)
- `FRONTEND_BASE_URL` (monta o link do e-mail de redefinição)
