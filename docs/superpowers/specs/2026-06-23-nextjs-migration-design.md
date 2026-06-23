# Design Spec — Migrate the "Cidade do Idoso" Portal frontend to Next.js

- **Date:** 2026-06-23
- **Status:** Approved (design); pending implementation plan
- **Scope:** Frontend only. The FastAPI backend stays unchanged.
- **Author:** Pair session (Gabriel + Claude)

## 1. Goal & context

The portal is a government project ("Cidade do Idoso", Chapecó) to manage elderly
activities, schedules, menu, and news, with separate access for `idoso` (elderly)
and `funcionario`/`admin` (staff). It currently runs in Docker as:

- `backend` — FastAPI + SQLAlchemy async + Postgres + Redis (package `sistema_provas`),
  with RBAC (role enum `idoso|funcionario|admin`), JWT access+refresh tokens,
  password reset via SMTP, audit log, staff dashboard, and 63 passing tests.
- `frontend` — ~13 static HTML pages + per-page CSS/JS, served by **nginx**, calling
  the API through `/api/`. Includes a global `fetch` wrapper (auto-refresh on 401),
  an accessibility widget (font A−/A+, high contrast), and a Chart.js dashboard.
  Covered by 12 Playwright e2e tests (incl. 8 accessibility cases).

This spec covers replacing **only the frontend** with a Next.js app. The backend,
its contracts, and its tests are out of scope and must not change.

## 2. Locked decisions

| Topic | Decision | Rationale |
|---|---|---|
| Backend | Keep FastAPI intact; Next is frontend-only, calls the same API | Reuse 100% of delivered/tested backend; lowest risk |
| Runtime | **Standalone Node server** (`output: 'standalone'`) in Docker, replaces nginx | Enables middleware, Server Components, SSR ("full Next") |
| Auth | **httpOnly cookies + Next middleware** for role-based route protection | XSS-safe tokens; server-side route gating; coherent with Node server |
| Language | **TypeScript** | Compile-time safety; types the API contracts; matches typed backend |
| Styling | **Tailwind (rewrite)**, re-implementing the accessibility features | User choice; modern; trades visual-regression risk (mitigated by a11y e2e) |
| Router | **App Router** | Required for middleware + Server Components + Server Actions |
| Versions | **Next 15 + React 19 + Tailwind v4** | Current stable majors at time of writing |

## 3. Critical consequence of httpOnly cookies (data-fetching model)

httpOnly cookies are **not readable by browser JS**, so the browser cannot attach
`Authorization: Bearer` itself. Authenticated traffic must pass through a thin
server layer that reads the cookie and forwards the token. This is **not** a
business-logic BFF (all logic stays in FastAPI) — only token-forwarding plumbing.

- **Page reads** → **Server Components**. The Next server reads the access-token
  cookie, forwards it to FastAPI, and renders with data already present (SSR).
- **Mutations** (enroll/cancel activity, save profile, create/update news & menu,
  image upload) → **Server Actions**. They run on the server, read the httpOnly
  cookie, call FastAPI, and revalidate the affected route.
- **Route Handlers** (`app/api/.../route.ts`) only where a server endpoint is
  genuinely needed: `auth/login`, `auth/logout`, `auth/refresh`, the dashboard
  **CSV export** download, and the **image upload** stream proxy.

**Alternative considered:** keep tokens in JS-readable storage and call FastAPI
directly from the client (closest to today). Rejected because it forfeits the XSS
protection that motivated the httpOnly-cookie decision.

## 4. Folder structure (App Router)

```
frontend-next/
├── src/
│   ├── app/
│   │   ├── (public)/                 # no auth
│   │   │   ├── login/
│   │   │   ├── cadastro/
│   │   │   ├── esqueci-senha/
│   │   │   └── redefinir-senha/
│   │   ├── (idoso)/                   # auth required: idoso|funcionario|admin
│   │   │   ├── home/
│   │   │   ├── atividades/
│   │   │   ├── cardapio/
│   │   │   ├── noticias/
│   │   │   └── perfil/
│   │   ├── (funcionario)/            # auth required: funcionario|admin
│   │   │   ├── dashboard/
│   │   │   ├── atividades/           # staff CRUD (vagas)
│   │   │   ├── cardapio/             # staff CRUD
│   │   │   └── noticias/             # staff CRUD + image upload
│   │   ├── api/
│   │   │   ├── auth/login/route.ts
│   │   │   ├── auth/logout/route.ts
│   │   │   ├── auth/refresh/route.ts
│   │   │   ├── export/inscricoes/route.ts   # CSV download proxy
│   │   │   └── upload/noticias/route.ts      # image upload proxy
│   │   ├── layout.tsx                # root: reads accessibility cookie (no FOUC)
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   └── globals.css               # Tailwind v4 + theme/accessibility tokens
│   ├── components/                   # Header, Nav, AccessibilityWidget, Card, FormField, Toast, Charts...
│   ├── lib/
│   │   ├── api.ts                    # server-side fetch: inject token cookie, 401→refresh
│   │   ├── auth.ts                   # cookie read/write/clear, JWT decode (role), refresh
│   │   ├── types.ts                  # API contract types
│   │   └── schemas.ts                # zod schemas (forms + API responses)
│   └── middleware.ts                 # auth + role gate on (idoso)/(funcionario)
├── e2e/                              # migrated Playwright tests
├── public/                           # images from frontend/IMAGENS/
├── Dockerfile                        # multi-stage → standalone runner
├── next.config.ts
├── tsconfig.json
├── package.json
└── playwright.config.ts
```

## 5. Authentication flow

1. **Login** — form → `POST /api/auth/login` (Route Handler) → calls FastAPI
   `POST /auth/token` → on success sets two httpOnly cookies (`access_token`,
   `refresh_token`) with `Secure`, `SameSite=Lax`, `Path=/`, sensible `Max-Age` →
   redirects by role (`idoso` → `/home`, staff → `/dashboard`). On staff/idoso
   mismatch (e.g. wrong login mode), clears cookies and reports the error.
2. **Middleware** (`middleware.ts`) — for `(idoso)` and `(funcionario)` groups:
   no/invalid access cookie → redirect to `/login`; decode the JWT to read `role`
   and block `idoso` from `(funcionario)` routes. Runs on the edge before render.
3. **Refresh** — server util in `lib/api.ts`: on a 401 from FastAPI, use the
   `refresh_token` cookie to call FastAPI `POST /auth/refresh`, re-set rotated
   cookies, and retry once. Mirrors today's client wrapper, now server-side.
4. **Logout** — `POST /api/auth/logout` clears both cookies and redirects to `/login`.

**Cookie attributes:** `httpOnly; Secure; SameSite=Lax; Path=/`. `Secure` is
conditional on HTTPS so local HTTP dev still works (or `Secure` always + dev over
the proxy). Access cookie lifetime ~30 min (matches `ACCESS_TOKEN_EXPIRE_MINUTES`);
refresh cookie ~7 days (matches `REFRESH_TOKEN_EXPIRE_DAYS`).

## 6. Screen mapping (13 screens → routes)

| Current static page | New route | Notes |
|---|---|---|
| `login.html` | `/login` | sets cookies, role-based redirect |
| `cadastro.html` | `/cadastro` | self-registration (role `idoso`) |
| `esqueci-senha.html` | `/esqueci-senha` | reset request |
| `redefinir-senha.html` | `/redefinir-senha` | reset confirm (token in query) |
| `home.html` | `/home` | idoso landing; public summary aggregator |
| `atividades.html` | `/atividades` | catalog + enroll/cancel; shows vagas/inscritos |
| `cardapio.html` | `/cardapio` | weekly menu (cached on API) |
| `noticias.html` | `/noticias` | news list with images |
| `perfil.html` | `/perfil` | `PATCH /users/me` partial profile update |
| `dashboard.html` | `/dashboard` | staff charts → **react-chartjs-2**; alerts; CSV export |
| `funcionario-home.html` | `(funcionario)` landing | staff hub |
| `funcionario-atividades.html` | `(funcionario)/atividades` | create/update activities + vagas |
| `funcionario-cardapio.html` | `(funcionario)/cardapio` | menu CRUD |
| `funcionario-noticias.html` | `(funcionario)/noticias` | news CRUD + image upload |

`frontend/IMAGENS/` assets move to `public/`.

## 7. Accessibility in Tailwind (preserve A−/A+/contrast)

- **Font scaling** — the `AccessibilityWidget` sets a class/attribute on `<html>`
  that changes the **root `font-size`** (100% / 112.5% / 125%). Tailwind uses `rem`,
  so the whole UI scales together. The preference is persisted in a **cookie** and
  read in the **root layout on the server** → no flash of unscaled content on reload.
- **High contrast** — a `high-contrast` class on `<html>` swaps the theme color
  tokens (Tailwind v4 CSS-variable theme).
- **Keyboard & ARIA** — global `:focus-visible`, keyboard navigation, ARIA labels,
  ported from the current implementation. The 8 Playwright a11y cases are the
  non-regression baseline.

## 8. Components, forms & API client

- **Shared components:** `Header`, `BottomNav`/`SideNav`, `AccessibilityWidget`,
  `Card`, `FormField`, `Toast`, `Charts`.
- **Forms/validation:** **react-hook-form + zod** — typed values, accessible error
  messaging. The same zod schemas type the API responses (`User`, `Atividade`,
  `Noticia`, `Cardapio`, `DashboardResumo`, …).
- **API client (`lib/api.ts`):** a server-side `apiFetch` that injects the cookie
  token, sets `API_INTERNAL_URL` as base, and handles `401 → refresh → retry once`.

## 9. Docker & infra

- New multi-stage `Dockerfile`: build stage installs deps and runs `next build`;
  runner stage is `node:20-alpine` serving the `standalone` output, listening on
  `3000`.
- `docker-compose.yml`: the `web` service builds `./frontend-next`, exposes `3000`,
  and receives `API_INTERNAL_URL=http://api:8000` (server→server over the internal
  network). **nginx is removed.** Host URL becomes `http://localhost:3000`.
- `.dockerignore` for `node_modules`, `.next`, `e2e`, Playwright artifacts.

## 10. Tests & CI

- **Playwright** migrated to the new routes/selectors: the existing flows plus the
  8 accessibility cases (now targeting the new public route, e.g. `/login` or
  `/cardapio`).
- `.github/workflows/ci.yml`: the e2e job brings up the compose stack and runs
  Playwright against the Next server; the backend job (ruff + pytest) is unchanged.

## 11. Error handling

- `app/error.tsx` + per-route error boundaries for render/data failures.
- `app/not-found.tsx` for unknown routes.
- `apiFetch` surfaces FastAPI error payloads (preserving the `{message}` / detail
  contracts) to the UI as accessible toasts/inline messages; never swallows errors
  silently.
- Middleware redirects unauthenticated/forbidden access rather than 500-ing.

## 12. Migration strategy & fate of the current frontend

1. Build the Next app in **`frontend-next/`** alongside the existing `frontend/`.
2. Reach **parity screen by screen** (verified against the running stack and the
   migrated Playwright suite).
3. **Cut over** the compose `web` service to the Next build.
4. Propose **archiving/removing the old `frontend/`** (nginx + native JS). This
   deletion is a **confirmation checkpoint** — do not remove without explicit
   approval. Everything remains in git history regardless.

## 13. Out of scope (YAGNI)

- Any backend change (models, routers, contracts, tests).
- i18n / multi-language.
- PWA / offline support.
- Global client state manager (Zustand/Redux) — Server Components + Server Actions
  cover the needs.

## 14. Risks & trade-offs

| Risk | Mitigation |
|---|---|
| Visual/accessibility regression from the Tailwind rewrite | 8 Playwright a11y cases as baseline; port font-scale/contrast behavior explicitly |
| More server-side code due to httpOnly cookies | Accepted; it is the secure, correct pattern; keep the server layer thin (token forwarding only) |
| Cookie `Secure` vs local HTTP dev | Conditional `Secure`, or run dev behind the proxy/HTTPS |
| Auth refresh edge cases (rotation, race) | Single-retry on 401, server-side rotation mirroring current behavior |
| Larger Docker image / Node runtime vs nginx | Accepted trade-off for "full Next"; multi-stage standalone keeps it reasonable |
