# Next.js Frontend Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static HTML/CSS/JS + nginx frontend of the "Cidade do Idoso" portal with a Next.js (App Router, TypeScript, Tailwind) app that consumes the existing, unchanged FastAPI backend.

**Architecture:** A standalone Next.js Node server (`output: 'standalone'`) replaces the nginx container. Authentication uses httpOnly cookies set by thin Next Route Handlers; Next middleware gates the `(idoso)` and `(funcionario)` route groups by login + role. Authenticated data is read in Server Components and mutated via Server Actions, both forwarding the cookie token to FastAPI — business logic stays in FastAPI. Styling is rewritten in Tailwind v4, re-implementing the accessibility features (font scale A−/A+, high contrast).

**Tech Stack:** Next 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · react-hook-form + zod · react-chartjs-2 + chart.js · Playwright (e2e) · Vitest (unit) · Docker (node:20-alpine standalone).

## Global Constraints

- **Backend is frozen.** No change to `backend/` models, routers, contracts, or tests. Integrate around it.
- **Next 15 + React 19 + Tailwind v4 + App Router.** TypeScript everywhere (`.ts`/`.tsx`).
- **All new frontend code lives in `frontend-next/`.** The existing `frontend/` stays untouched until the final cutover task.
- **Auth = httpOnly cookies + middleware.** Cookies: `access_token`, `refresh_token`, `role` — attributes `httpOnly; SameSite=Lax; Path=/; Secure (when request is HTTPS)`. Access lifetime 30 min (`ACCESS_TOKEN_EXPIRE_MINUTES`), refresh 7 days (`REFRESH_TOKEN_EXPIRE_DAYS`).
- **Role is NOT in the JWT** (`sub`/`type`/`exp` only). Role is obtained from `GET /users/me` at login and stored in the `role` cookie. FastAPI is the security authority; middleware is a UX gate.
- **Server→API base URL:** `API_INTERNAL_URL` (default `http://api:8000` in Docker, `http://localhost:8000` in local dev). The browser never calls FastAPI directly.
- **Host port:** the Next server listens on `3000`; the portal is served at `http://localhost:3000`.
- **No business logic in Next.** Route handlers / server actions only forward the token and shape responses.
- Conversation in PT-BR; code, identifiers, comments, and docs in English.

## API surface (frozen — reference for every task)

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/auth/token` | public | form: `username`,`password` | `{access_token, token_type:"Bearer", refresh_token}` |
| POST | `/auth/refresh` | public | json: `{refresh_token}` | `{access_token, token_type:"Bearer", refresh_token}` |
| POST | `/users/` | public | `{username,email,password,first_name?,last_name?,phone?,birth_date?,gender?,address?,city?,state?,zip_code?}` | `UserPublic` |
| GET | `/users/me` | Bearer | — | `UserPublic` (`{id,username,email,is_staff,role,...profile}`) |
| PATCH | `/users/me` | Bearer | `UserProfileUpdate` (any subset of profile fields) | `UserPublic` |
| POST | `/password/reset-request` | public | `{email}` | 200 `{}` / 404 `{message}` |
| POST | `/password/reset` | public | `{token, nova_senha}` | 200 `{message}` / 400 `{message}` |
| GET | `/atividades/catalogo` | public | — | `{atividades: AtividadeOut[]}` |
| GET | `/atividades/minhas-inscricoes` | Bearer | — | `{inscricoes: InscricaoOut[]}` |
| POST | `/atividades/inscricoes` | Bearer | `{activity_id}` | `InscricaoOut` (201) |
| POST | `/atividades/inscricoes/{id}/cancelar` | Bearer | — | `InscricaoOut` |
| POST | `/atividades/` | staff | `AtividadeCreate {titulo,hora,data,imagem_url,vagas?}` | `AtividadeOut` (201) |
| PATCH | `/atividades/{id}` | staff | `AtividadeUpdate` | `AtividadeOut` |
| DELETE | `/atividades/{id}` | staff | — | 204 |
| GET | `/atividades/{id}/inscricoes` | staff | — | `{inscricoes: InscritoOut[]}` |
| GET | `/atividades/{id}/presenca` | staff | `?data=YYYY-MM-DD` | `PresencaListaOut` |
| PUT | `/atividades/{id}/presenca` | staff | `{user_id,data,present}` | `PresencaListaOut` |
| GET | `/cardapio/` | public | — | `{itens: CardapioItemOut[]}` |
| POST | `/cardapio/itens` | staff | `CardapioItemCreate` | `CardapioItemOut` (201) |
| PUT | `/cardapio/itens/{id}` | staff | `CardapioItemUpdate` | `CardapioItemOut` |
| DELETE | `/cardapio/itens/{id}` | staff | — | 204 |
| GET | `/noticias` | public | — | `NoticiaOut[]` |
| POST | `/noticias` | staff | `NoticiaCreate {titulo,descricao,fonte}` | `NoticiaOut` (201) |
| POST | `/noticias/{id}/imagem` | staff | multipart field `arquivo` | `NoticiaOut` |
| PATCH | `/noticias/{id}` | staff | `NoticiaUpdate` | `NoticiaOut` |
| DELETE | `/noticias/{id}` | staff | — | 204 |
| GET | `/dashboard/resumo` | staff | — | `DashboardIndicadoresOut` |
| GET | `/dashboard/inscricoes-por-semana` | staff | — | `{pontos: PontoSemanaOut[]}` |
| GET | `/dashboard/uso-funcionalidades` | staff | — | `{itens: UsoFuncionalidadeOut[]}` |
| GET | `/dashboard/alertas` | staff | — | `{alertas: AlertaAtividadeOut[]}` |
| GET | `/dashboard/export/inscricoes.csv` | staff | — | `text/csv` stream |
| GET | `/home/resumo` | public | — | `{atividades[], noticias[], cardapio[]}` |

`UserPublic.role ∈ {idoso, funcionario, admin}`. Staff = `is_staff === true || role ∈ {funcionario, admin}`.

## File structure

```
frontend-next/
├── package.json  tsconfig.json  next.config.ts  postcss.config.mjs
├── vitest.config.ts  playwright.config.ts  Dockerfile  .dockerignore  .env.local.example
├── public/                         # images copied from frontend/IMAGENS/
└── src/
    ├── middleware.ts               # Task 7
    ├── app/
    │   ├── globals.css             # Task 12 (Tailwind v4 + a11y tokens)
    │   ├── layout.tsx              # Task 13 (root; reads a11y cookie)
    │   ├── page.tsx                # redirect "/" → "/home"
    │   ├── not-found.tsx error.tsx # Task 13
    │   ├── (public)/
    │   │   ├── login/page.tsx              # Task 9
    │   │   ├── cadastro/page.tsx           # Task 10
    │   │   ├── esqueci-senha/page.tsx      # Task 11
    │   │   └── redefinir-senha/page.tsx    # Task 11
    │   ├── (idoso)/
    │   │   ├── layout.tsx                  # Task 14 (Header + idoso nav)
    │   │   ├── home/page.tsx               # Task 15
    │   │   ├── atividades/page.tsx + actions.ts   # Task 16
    │   │   ├── cardapio/page.tsx           # Task 17
    │   │   ├── noticias/page.tsx           # Task 18
    │   │   └── perfil/page.tsx + actions.ts       # Task 19
    │   ├── (funcionario)/
    │   │   ├── layout.tsx                  # Task 14 (staff nav)
    │   │   ├── painel/page.tsx             # Task 20 (staff hub)
    │   │   ├── dashboard/page.tsx          # Task 21
    │   │   ├── atividades/page.tsx + actions.ts   # Task 22
    │   │   ├── cardapio/page.tsx + actions.ts     # Task 23
    │   │   └── noticias/page.tsx + actions.ts     # Task 24
    │   └── api/
    │       ├── auth/login/route.ts logout/route.ts refresh/route.ts  # Task 8
    │       ├── export/inscricoes/route.ts                            # Task 21
    │       └── upload/noticias/[id]/route.ts                          # Task 24
    ├── components/                 # AccessibilityWidget, Header, Nav, Card, FormField, Toast, Charts...
    └── lib/
        ├── types.ts                # Task 4
        ├── schemas.ts              # Task 4 (zod)
        ├── auth.ts                 # Task 5 (cookies + jwt exp decode)
        ├── api.ts                  # Task 6 (server fetch + 401→refresh)
        └── media.ts                # Task 6 (resolveMediaUrl)
```

---

## PHASE 1 — Scaffold & infrastructure

### Task 1: Scaffold the Next 15 + TS + Tailwind v4 project

**Files:**
- Create: `frontend-next/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `frontend-next/.gitignore`

**Interfaces:**
- Produces: a bootable Next app on port 3000; `src/app/globals.css` importing Tailwind; `next.config.ts` exporting `output:'standalone'` and the `/uploads` rewrite + `/redefinir-senha.html` redirect.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cidade-idoso-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.0",
    "zod": "^3.24.0",
    "@hookform/resolvers": "^3.9.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^20.17.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.49.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`, `postcss.config.mjs`, `.gitignore`**

`next.config.ts`:
```ts
import type { NextConfig } from 'next'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // Serve backend-uploaded images same-origin (no CORS, token-free static).
    return [{ source: '/uploads/:path*', destination: `${API}/uploads/:path*` }]
  },
  async redirects() {
    // The backend reset email hardcodes /redefinir-senha.html?token=...
    return [
      {
        source: '/redefinir-senha.html',
        destination: '/redefinir-senha',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
```

`postcss.config.mjs`:
```js
const config = { plugins: { '@tailwindcss/postcss': {} } }
export default config
```

`.gitignore`:
```
node_modules
.next
out
.env*.local
playwright-report
test-results
```

- [ ] **Step 4: Create minimal `globals.css`, `layout.tsx`, `page.tsx`**

`src/app/globals.css`:
```css
@import "tailwindcss";
```

`src/app/layout.tsx`:
```tsx
import './globals.css'
import type { ReactNode } from 'react'

export const metadata = { title: 'Portal Cidade do Idoso' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
```

`src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
export default function Index() { redirect('/home') }
```

- [ ] **Step 5: Install and verify the app boots**

Run: `cd frontend-next && npm install && npm run build`
Expected: build completes with no type errors; `.next/` produced.

- [ ] **Step 6: Commit**

```bash
git add frontend-next
git commit -m "feat(next): scaffold Next 15 + TS + Tailwind v4 project"
```

---

### Task 2: Test tooling (Vitest + Playwright config)

**Files:**
- Create: `frontend-next/vitest.config.ts`, `frontend-next/playwright.config.ts`, `frontend-next/e2e/.gitkeep`

**Interfaces:**
- Produces: `npm run test:unit` (Vitest, node env) and `npm run test:e2e` (Playwright against `http://localhost:3000`).

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: { environment: 'node', globals: true, include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
})
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: BASE, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

- [ ] **Step 3: Verify Vitest runs (no tests yet = exit 0 with `--passWithNoTests`)**

Run: `cd frontend-next && npx vitest run --passWithNoTests`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/vitest.config.ts frontend-next/playwright.config.ts frontend-next/e2e
git commit -m "test(next): add vitest + playwright config"
```

---

### Task 3: Docker image, compose cutover wiring, env updates

> The compose `web` service is repointed here but the OLD `frontend/` is NOT removed yet (Task 27). During Phases 1–6 you build/run Next with `npm run dev`; this task makes the Docker path ready.

**Files:**
- Create: `frontend-next/Dockerfile`, `frontend-next/.dockerignore`, `frontend-next/.env.local.example`
- Modify: `docker-compose.yml` (the `web` service), `.env.example`, `.env`

**Interfaces:**
- Consumes: Task 1 (`output:'standalone'`).
- Produces: `web` container serving Next on host `3000`, with `API_INTERNAL_URL=http://api:8000`.

- [ ] **Step 1: Create `frontend-next/Dockerfile` (multi-stage standalone)**

```dockerfile
# --- deps ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Create `.dockerignore` and `.env.local.example`**

`.dockerignore`:
```
node_modules
.next
out
e2e
playwright-report
test-results
.env*.local
Dockerfile
```

`.env.local.example`:
```
# Local dev (npm run dev). In Docker these come from docker-compose.
API_INTERNAL_URL=http://localhost:8000
```

- [ ] **Step 3: Repoint the `web` service in `docker-compose.yml`**

Replace the existing `web:` block with:
```yaml
  web:
    build:
      context: ./frontend-next
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      API_INTERNAL_URL: http://api:8000
    depends_on:
      - api
```

- [ ] **Step 4: Update `FRONTEND_BASE_URL` in `.env.example` and `.env`**

Set (both files) so the reset email points to the Next host:
```
FRONTEND_BASE_URL=http://localhost:3000
```

- [ ] **Step 5: Verify the image builds**

Run: `docker compose build web`
Expected: image builds successfully (standalone server present).

- [ ] **Step 6: Commit**

```bash
git add frontend-next/Dockerfile frontend-next/.dockerignore frontend-next/.env.local.example docker-compose.yml .env.example .env
git commit -m "build(next): dockerize standalone Next and wire compose web service to 3000"
```

---

## PHASE 2 — Core library (TDD with Vitest)

### Task 4: API contract types + zod schemas

**Files:**
- Create: `src/lib/types.ts`, `src/lib/schemas.ts`
- Test: `src/lib/schemas.test.ts`

**Interfaces:**
- Produces: TS types `UserPublic, AtividadeOut, InscricaoOut, CardapioItemOut, NoticiaOut, DashboardIndicadores, PontoSemana, UsoFuncionalidade, AlertaAtividade, HomeResumo, Token`; zod schemas `loginSchema, cadastroSchema, perfilSchema, resetRequestSchema, resetConfirmSchema, atividadeFormSchema, cardapioFormSchema, noticiaFormSchema`; helper `isStaff(role: string, isStaff: boolean): boolean`.

- [ ] **Step 1: Write failing test `src/lib/schemas.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { loginSchema, cadastroSchema, resetConfirmSchema, isStaff } from '@/lib/schemas'

describe('schemas', () => {
  it('loginSchema requires email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'not-email', password: 'x' }).success).toBe(false)
  })

  it('cadastroSchema requires username/email/password', () => {
    const ok = cadastroSchema.safeParse({ username: 'u', email: 'a@b.com', password: 'secret' })
    expect(ok.success).toBe(true)
  })

  it('resetConfirmSchema enforces min length 4 on nova_senha', () => {
    expect(resetConfirmSchema.safeParse({ token: 't', nova_senha: '123' }).success).toBe(false)
    expect(resetConfirmSchema.safeParse({ token: 't', nova_senha: '1234' }).success).toBe(true)
  })

  it('isStaff is true for funcionario/admin or is_staff flag', () => {
    expect(isStaff('idoso', false)).toBe(false)
    expect(isStaff('funcionario', false)).toBe(true)
    expect(isStaff('admin', false)).toBe(true)
    expect(isStaff('idoso', true)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schemas.test.ts`
Expected: FAIL — cannot find module `@/lib/schemas`.

- [ ] **Step 3: Implement `src/lib/types.ts`**

```ts
export type Role = 'idoso' | 'funcionario' | 'admin'

export interface UserPublic {
  id: number
  username: string
  email: string
  is_staff: boolean
  role: Role
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  birth_date?: string | null
  gender?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}

export interface Token {
  access_token: string
  token_type: string
  refresh_token?: string
}

export interface AtividadeOut {
  id: number
  titulo: string
  hora: string
  data: string
  imagem_url: string
  vagas?: number | null
  inscritos?: number | null
  vagas_disponiveis?: number | null
}

export interface InscricaoOut { id: number; status: string; atividade: AtividadeOut }
export interface CardapioItemOut {
  id: number; dia: string; ordem_dia: number; refeicao: string
  titulo: string; descricao: string; imagem_url: string
}
export interface NoticiaOut {
  id: number; titulo: string; descricao: string; fonte: string; imagem_url?: string | null
}
export interface DashboardIndicadores {
  total_idosos: number; total_funcionarios: number; total_atividades: number
  total_inscricoes_confirmadas: number; total_noticias: number
  total_itens_cardapio: number; total_presencas: number
}
export interface PontoSemana { semana: string; total: number }
export interface UsoFuncionalidade { funcionalidade: string; total: number }
export interface AlertaAtividade {
  activity_id: number; titulo: string; capacidade: number; inscritos: number; percentual: number
}
export interface HomeResumo {
  atividades: { id: number; titulo: string; hora: string; data: string; imagem_url: string }[]
  noticias: { id: number; titulo: string; descricao: string; fonte: string; imagem_url?: string | null }[]
  cardapio: { id: number; dia: string; refeicao: string; titulo: string; descricao: string }[]
}
```

- [ ] **Step 4: Implement `src/lib/schemas.ts`**

```ts
import { z } from 'zod'
import type { Role } from './types'

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
})

export const cadastroSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
})

export const perfilSchema = cadastroSchema.partial().omit({ password: true, username: true, email: true })

export const resetRequestSchema = z.object({ email: z.string().email() })
export const resetConfirmSchema = z.object({
  token: z.string().min(1),
  nova_senha: z.string().min(4, 'Mínimo de 4 caracteres'),
})

export const atividadeFormSchema = z.object({
  titulo: z.string().min(1).max(200),
  hora: z.string().min(1).max(50),
  data: z.string().min(1).max(120),
  imagem_url: z.string().max(500),
  vagas: z.coerce.number().int().min(1).optional(),
})

export const cardapioFormSchema = z.object({
  dia: z.string().min(1).max(60),
  ordem_dia: z.coerce.number().int().min(0),
  ordem_refeicao: z.coerce.number().int().min(0),
  refeicao: z.string().min(1).max(40),
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(600),
  imagem_url: z.string().max(500),
})

export const noticiaFormSchema = z.object({
  titulo: z.string().min(1).max(300),
  descricao: z.string().max(2000),
  fonte: z.string().max(800),
})

const STAFF_ROLES: Role[] = ['funcionario', 'admin']
export function isStaff(role: string, isStaffFlag: boolean): boolean {
  return isStaffFlag || STAFF_ROLES.includes(role as Role)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/schemas.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat(next): API contract types + zod schemas"
```

---

### Task 5: Auth cookie helpers + JWT expiry decode

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `decodeJwtExp(token: string): number | null` — reads `exp` (seconds) from a JWT payload **without verifying the signature** (FastAPI verifies). Returns null if malformed.
  - `isExpired(token: string, skewSeconds?: number): boolean`
  - Cookie names const `COOKIES = { access: 'access_token', refresh: 'refresh_token', role: 'role' }`.
  - `cookieOptions(secure: boolean, maxAgeSeconds: number)` returning the attribute object for Next `cookies().set`.

- [ ] **Step 1: Write failing test `src/lib/auth.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { decodeJwtExp, isExpired, COOKIES } from '@/lib/auth'

function makeJwt(payload: object): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`
}

describe('auth', () => {
  it('decodes exp from a JWT payload', () => {
    expect(decodeJwtExp(makeJwt({ sub: 'a@b.com', exp: 1000 }))).toBe(1000)
  })
  it('returns null for malformed token', () => {
    expect(decodeJwtExp('garbage')).toBeNull()
  })
  it('isExpired true when exp is in the past', () => {
    const past = Math.floor(Date.now() / 1000) - 10
    expect(isExpired(makeJwt({ exp: past }))).toBe(true)
  })
  it('isExpired false when exp is in the future', () => {
    const future = Math.floor(Date.now() / 1000) + 600
    expect(isExpired(makeJwt({ exp: future }))).toBe(false)
  })
  it('exposes cookie names', () => {
    expect(COOKIES.access).toBe('access_token')
    expect(COOKIES.refresh).toBe('refresh_token')
    expect(COOKIES.role).toBe('role')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL — cannot find module `@/lib/auth`.

- [ ] **Step 3: Implement `src/lib/auth.ts`**

```ts
export const COOKIES = {
  access: 'access_token',
  refresh: 'refresh_token',
  role: 'role',
} as const

/** Reads `exp` from a JWT payload WITHOUT verifying the signature.
 *  FastAPI is the authority; this is only for client-side UX (refresh timing). */
export function decodeJwtExp(token: string): number | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf-8')
    const payload = JSON.parse(json) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export function isExpired(token: string, skewSeconds = 15): boolean {
  const exp = decodeJwtExp(token)
  if (exp === null) return true
  return Date.now() / 1000 >= exp - skewSeconds
}

export function cookieOptions(secure: boolean, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export const ACCESS_MAX_AGE = 30 * 60 // 30 min
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 // 7 days
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat(next): auth cookie helpers + jwt exp decode"
```

---

### Task 6: Server-side API client with 401→refresh + media URL helper

**Files:**
- Create: `src/lib/api.ts`, `src/lib/media.ts`
- Test: `src/lib/api.test.ts`, `src/lib/media.test.ts`

**Interfaces:**
- Consumes: `COOKIES`, `cookieOptions`, `ACCESS_MAX_AGE`, `REFRESH_MAX_AGE` (Task 5).
- Produces:
  - `apiFetch(path: string, init?: RequestInit & { staffOnly?: never }): Promise<Response>` — server-only. Reads `access_token` cookie, sets `Authorization: Bearer`, prefixes `API_INTERNAL_URL`; on 401 calls `/auth/refresh` with the refresh cookie, re-sets cookies, retries once.
  - `apiJson<T>(path, init?): Promise<T>` (throws `ApiError` on non-2xx).
  - `class ApiError extends Error { status: number; payload: unknown }`.
  - `resolveMediaUrl(path?: string | null): string` (media.ts) — passes through `http(s)://`, else returns the path unchanged (served same-origin via the `/uploads` rewrite).

> `apiFetch` uses `next/headers` `cookies()`, so it runs only in Server Components / Server Actions / Route Handlers. Unit test the refresh decision via an extracted pure helper `shouldRetryAfter401(status, hasRefresh)`.

- [ ] **Step 1: Write failing test `src/lib/media.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { resolveMediaUrl } from '@/lib/media'

describe('resolveMediaUrl', () => {
  it('passes absolute urls through', () => {
    expect(resolveMediaUrl('https://x.test/a.png')).toBe('https://x.test/a.png')
  })
  it('returns relative uploads path unchanged (same-origin rewrite)', () => {
    expect(resolveMediaUrl('/uploads/news/a.png')).toBe('/uploads/news/a.png')
  })
  it('handles null/empty', () => {
    expect(resolveMediaUrl(null)).toBe('')
    expect(resolveMediaUrl(undefined)).toBe('')
  })
})
```

- [ ] **Step 2: Write failing test `src/lib/api.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { shouldRetryAfter401, ApiError } from '@/lib/api'

describe('api helpers', () => {
  it('retries only on 401 when a refresh token exists', () => {
    expect(shouldRetryAfter401(401, true)).toBe(true)
    expect(shouldRetryAfter401(401, false)).toBe(false)
    expect(shouldRetryAfter401(200, true)).toBe(false)
    expect(shouldRetryAfter401(500, true)).toBe(false)
  })
  it('ApiError carries status + payload', () => {
    const e = new ApiError('boom', 404, { message: 'x' })
    expect(e.status).toBe(404)
    expect(e.payload).toEqual({ message: 'x' })
  })
})
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npx vitest run src/lib/media.test.ts src/lib/api.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 4: Implement `src/lib/media.ts`**

```ts
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return path.charAt(0) === '/' ? path : `/${path}`
}
```

- [ ] **Step 5: Implement `src/lib/api.ts`**

```ts
import { cookies } from 'next/headers'
import {
  COOKIES, cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE,
} from './auth'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'
const SECURE = process.env.COOKIE_SECURE === '1'

export class ApiError extends Error {
  status: number
  payload: unknown
  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

/** Pure decision helper (unit-tested). */
export function shouldRetryAfter401(status: number, hasRefresh: boolean): boolean {
  return status === 401 && hasRefresh
}

async function refreshTokens(): Promise<boolean> {
  const jar = await cookies()
  const rt = jar.get(COOKIES.refresh)?.value
  if (!rt) return false
  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
    cache: 'no-store',
  })
  if (!res.ok) return false
  const data = (await res.json()) as { access_token?: string; refresh_token?: string }
  if (!data.access_token) return false
  jar.set(COOKIES.access, data.access_token, cookieOptions(SECURE, ACCESS_MAX_AGE))
  if (data.refresh_token) {
    jar.set(COOKIES.refresh, data.refresh_token, cookieOptions(SECURE, REFRESH_MAX_AGE))
  }
  return true
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const jar = await cookies()
  const buildHeaders = () => {
    const h = new Headers(init.headers)
    const token = jar.get(COOKIES.access)?.value
    if (token) h.set('Authorization', `Bearer ${token}`)
    return h
  }
  const url = `${API}${path}`
  let res = await fetch(url, { ...init, headers: buildHeaders(), cache: 'no-store' })
  if (shouldRetryAfter401(res.status, Boolean(jar.get(COOKIES.refresh)?.value))) {
    if (await refreshTokens()) {
      res = await fetch(url, { ...init, headers: buildHeaders(), cache: 'no-store' })
    }
  }
  return res
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  const text = await res.text()
  const payload = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg =
      (payload && (payload.detail || payload.message)) || `HTTP ${res.status}`
    throw new ApiError(String(msg), res.status, payload)
  }
  return payload as T
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/media.test.ts src/lib/api.test.ts`
Expected: PASS (5 tests total).

- [ ] **Step 7: Commit**

```bash
git add src/lib/api.ts src/lib/media.ts src/lib/api.test.ts src/lib/media.test.ts
git commit -m "feat(next): server api client (401→refresh) + media url helper"
```

---

### Task 7: Middleware route gating (auth + role)

**Files:**
- Create: `src/middleware.ts`
- Test: `src/middleware.test.ts`

**Interfaces:**
- Consumes: `COOKIES` (Task 5).
- Produces: middleware that, for `(idoso)` and `(funcionario)` paths, redirects to `/login` when no `refresh_token` cookie; and redirects non-staff (role cookie not in `{funcionario,admin}`) away from `/dashboard`, `/painel`, and `/funcionario/*` to `/home`. Pure helper `decideRedirect(pathname, hasSession, role)` is unit-tested.

> Route groups `(idoso)`/`(funcionario)` do not appear in the URL. The protected URLs are listed explicitly in `STAFF_PREFIXES` and `IDOSO_PREFIXES`.

- [ ] **Step 1: Write failing test `src/middleware.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { decideRedirect } from '@/middleware'

describe('decideRedirect', () => {
  it('sends anonymous users on protected routes to /login', () => {
    expect(decideRedirect('/home', false, null)).toBe('/login')
    expect(decideRedirect('/dashboard', false, null)).toBe('/login')
  })
  it('lets logged-in idoso into idoso routes', () => {
    expect(decideRedirect('/home', true, 'idoso')).toBeNull()
    expect(decideRedirect('/atividades', true, 'idoso')).toBeNull()
  })
  it('blocks idoso from staff routes → /home', () => {
    expect(decideRedirect('/dashboard', true, 'idoso')).toBe('/home')
    expect(decideRedirect('/painel', true, 'idoso')).toBe('/home')
  })
  it('lets staff into staff routes', () => {
    expect(decideRedirect('/dashboard', true, 'funcionario')).toBeNull()
    expect(decideRedirect('/dashboard', true, 'admin')).toBeNull()
  })
  it('ignores public routes', () => {
    expect(decideRedirect('/login', false, null)).toBeNull()
    expect(decideRedirect('/cadastro', false, null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/middleware.test.ts`
Expected: FAIL — cannot find module `@/middleware`.

- [ ] **Step 3: Implement `src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { COOKIES } from './lib/auth'

const STAFF_PREFIXES = ['/dashboard', '/painel', '/funcionario']
const IDOSO_PREFIXES = ['/home', '/atividades', '/cardapio', '/noticias', '/perfil']
const STAFF_ROLES = ['funcionario', 'admin']

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Pure decision (unit-tested). Returns a redirect path or null. */
export function decideRedirect(
  pathname: string,
  hasSession: boolean,
  role: string | null,
): string | null {
  const isStaffRoute = startsWithAny(pathname, STAFF_PREFIXES)
  const isIdosoRoute = startsWithAny(pathname, IDOSO_PREFIXES)
  if (!isStaffRoute && !isIdosoRoute) return null
  if (!hasSession) return '/login'
  if (isStaffRoute && !(role && STAFF_ROLES.includes(role))) return '/home'
  return null
}

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(COOKIES.refresh)?.value)
  const role = req.cookies.get(COOKIES.role)?.value ?? null
  const target = decideRedirect(req.nextUrl.pathname, hasSession, role)
  if (target) {
    const url = req.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|uploads|favicon.ico).*)'],
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/middleware.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat(next): middleware auth + role route gating"
```

---

## PHASE 3 — Auth flow & public pages

### Task 8: Auth route handlers (login / logout / refresh)

**Files:**
- Create: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/refresh/route.ts`

**Interfaces:**
- Consumes: `COOKIES`, `cookieOptions`, `ACCESS_MAX_AGE`, `REFRESH_MAX_AGE` (Task 5); `isStaff` (Task 4).
- Produces: `POST /api/auth/login` accepts JSON `{email, password, mode}` (mode `'idoso'|'funcionario'`), exchanges via FastAPI `/auth/token`, fetches `/users/me`, validates staff mode, sets `access_token`/`refresh_token`/`role` cookies, returns `{redirect}` (`/home` or `/painel`). `POST /api/auth/logout` clears cookies. `POST /api/auth/refresh` proxies refresh.

- [ ] **Step 1: Implement `src/app/api/auth/login/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  COOKIES, cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE,
} from '@/lib/auth'
import { isStaff } from '@/lib/schemas'
import type { UserPublic } from '@/lib/types'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'
const SECURE = process.env.COOKIE_SECURE === '1'

export async function POST(req: NextRequest) {
  const { email, password, mode } = (await req.json()) as {
    email: string; password: string; mode: 'idoso' | 'funcionario'
  }

  const form = new URLSearchParams({ username: email, password })
  const tokenRes = await fetch(`${API}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    cache: 'no-store',
  })
  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: err.detail ?? 'Usuário ou senha incorretos.' },
      { status: 401 },
    )
  }
  const { access_token, refresh_token } = (await tokenRes.json()) as {
    access_token: string; refresh_token?: string
  }

  const meRes = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: 'no-store',
  })
  if (!meRes.ok) {
    return NextResponse.json({ error: 'Falha ao carregar o perfil.' }, { status: 502 })
  }
  const me = (await meRes.json()) as UserPublic
  const staff = isStaff(me.role, me.is_staff)

  if (mode === 'funcionario' && !staff) {
    return NextResponse.json(
      { error: 'Esta conta não está habilitada como funcionário. Procure a administração.' },
      { status: 403 },
    )
  }

  const jar = await cookies()
  jar.set(COOKIES.access, access_token, cookieOptions(SECURE, ACCESS_MAX_AGE))
  if (refresh_token) jar.set(COOKIES.refresh, refresh_token, cookieOptions(SECURE, REFRESH_MAX_AGE))
  jar.set(COOKIES.role, me.role, cookieOptions(SECURE, REFRESH_MAX_AGE))

  return NextResponse.json({ redirect: staff ? '/painel' : '/home' })
}
```

- [ ] **Step 2: Implement `src/app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIES } from '@/lib/auth'

export async function POST() {
  const jar = await cookies()
  jar.delete(COOKIES.access)
  jar.delete(COOKIES.refresh)
  jar.delete(COOKIES.role)
  return NextResponse.json({ redirect: '/login' })
}
```

- [ ] **Step 3: Implement `src/app/api/auth/refresh/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  COOKIES, cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE,
} from '@/lib/auth'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'
const SECURE = process.env.COOKIE_SECURE === '1'

export async function POST() {
  const jar = await cookies()
  const rt = jar.get(COOKIES.refresh)?.value
  if (!rt) return NextResponse.json({ ok: false }, { status: 401 })
  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json({ ok: false }, { status: 401 })
  const data = (await res.json()) as { access_token: string; refresh_token?: string }
  jar.set(COOKIES.access, data.access_token, cookieOptions(SECURE, ACCESS_MAX_AGE))
  if (data.refresh_token) jar.set(COOKIES.refresh, data.refresh_token, cookieOptions(SECURE, REFRESH_MAX_AGE))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Type-check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth
git commit -m "feat(next): auth route handlers (login/logout/refresh) with httpOnly cookies"
```

---

### Task 9: Login page (idoso/funcionario mode + role redirect)

**Files:**
- Create: `src/app/(public)/login/page.tsx`, `src/components/AuthCard.tsx` (shared shell for auth pages)
- Test: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `POST /api/auth/login` (Task 8); `loginSchema` (Task 4).
- Produces: a client component login form. Two toggle buttons set `mode`. On submit, POST to `/api/auth/login`; on success `router.push(data.redirect)`; on error show an accessible message in `role="alert"`.

**Required DOM (for tests + a11y):**
- `<h1>` page title; toggle buttons `data-testid="mode-idoso"` / `data-testid="mode-funcionario"` with `aria-pressed`; inputs with `<label>` for email + password (email input `type="email"`, password `type="password"`); submit button; error container `role="alert"`.

- [ ] **Step 1: Write failing e2e `e2e/auth.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('login page renders with accessible form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/senha/i)).toBeVisible()
  await expect(page.getByTestId('mode-idoso')).toHaveAttribute('aria-pressed', 'true')
})

test('invalid login shows an alert', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/e-mail/i).fill('nobody@example.com')
  await page.getByLabel(/senha/i).fill('wrongpass')
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})
```

- [ ] **Step 2: Implement `src/components/AuthCard.tsx`**

```tsx
import type { ReactNode } from 'react'

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">{title}</h1>
        {children}
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Implement `src/app/(public)/login/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/AuthCard'

type Mode = 'idoso' | 'funcionario'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('idoso')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
        mode,
      }),
    })
    setLoading(false)
    if (res.ok) {
      const body = (await res.json()) as { redirect: string }
      router.push(body.redirect)
      return
    }
    const body = await res.json().catch(() => ({}))
    setError(body.error ?? 'Não foi possível entrar. Tente novamente.')
  }

  return (
    <AuthCard title="Entrar no Portal">
      <div className="mb-4 flex gap-2" role="group" aria-label="Tipo de acesso">
        <button
          type="button" data-testid="mode-idoso" aria-pressed={mode === 'idoso'}
          onClick={() => setMode('idoso')}
          className={`flex-1 rounded-lg px-4 py-3 text-lg font-semibold ${mode === 'idoso' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >Idoso</button>
        <button
          type="button" data-testid="mode-funcionario" aria-pressed={mode === 'funcionario'}
          onClick={() => setMode('funcionario')}
          className={`flex-1 rounded-lg px-4 py-3 text-lg font-semibold ${mode === 'funcionario' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >Funcionário</button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-lg font-medium">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="username"
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
        </div>
        <div>
          <label htmlFor="password" className="block text-lg font-medium">Senha</label>
          <input id="password" name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>
        )}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white disabled:opacity-60">
          {loading ? 'Entrando…' : `Entrar como ${mode === 'idoso' ? 'Idoso' : 'Funcionário'}`}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sky-700">
        <Link href="/cadastro">Criar conta</Link>
        <Link href="/esqueci-senha">Esqueci a senha</Link>
      </div>
    </AuthCard>
  )
}
```

- [ ] **Step 4: Run e2e (requires the stack up; see "Running e2e" appendix)**

Run: `npx playwright test e2e/auth.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/login" src/components/AuthCard.tsx e2e/auth.spec.ts
git commit -m "feat(next): login page with idoso/funcionario mode + role redirect"
```

---

### Task 10: Cadastro (self-registration) page

**Files:**
- Create: `src/app/(public)/cadastro/page.tsx`
- Test: append to `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `POST /users/` (creates role `idoso`); `cadastroSchema` (Task 4); `AuthCard` (Task 9).
- Produces: a client form using react-hook-form + zod (`@hookform/resolvers/zod`). Required fields: `username`, `email`, `password`; optional profile fields (`first_name`, `last_name`, `phone`). Calls FastAPI through a same-origin proxy is NOT needed (public endpoint) — call `/api/users` via a tiny passthrough? No: `POST /users/` is public and needs no token, but the browser cannot reach the API container directly. **Use a Server Action** `criarConta` that calls `apiFetch('/users/', ...)` (no token needed) and returns `{ok}` or `{error}`.

- [ ] **Step 1: Write failing e2e (append)**

```ts
test('cadastro creates account and returns to login', async ({ page }) => {
  const email = `e2e_${Date.now()}@cidadeidoso.test`
  await page.goto('/cadastro')
  await page.getByLabel(/nome de usuário/i).fill(`e2e_${Date.now()}`)
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill('senha123')
  await page.getByRole('button', { name: /cadastrar/i }).click()
  await expect(page.getByRole('status')).toContainText(/sucesso|criada/i)
})
```

- [ ] **Step 2: Implement `src/app/(public)/cadastro/page.tsx`** (with inline Server Action)

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/AuthCard'
import { cadastroSchema } from '@/lib/schemas'

type Form = z.infer<typeof cadastroSchema>

export default function CadastroPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(cadastroSchema) })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function onSubmit(values: Form) {
    setMsg(''); setErr('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) setMsg('Conta criada com sucesso! Você já pode entrar.')
    else {
      const b = await res.json().catch(() => ({}))
      setErr(b.error ?? 'Não foi possível criar a conta.')
    }
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field id="username" label="Nome de usuário" reg={register('username')} err={errors.username?.message} />
        <Field id="email" label="E-mail" type="email" reg={register('email')} err={errors.email?.message} />
        <Field id="password" label="Senha" type="password" reg={register('password')} err={errors.password?.message} />
        <Field id="first_name" label="Nome" reg={register('first_name')} />
        <Field id="last_name" label="Sobrenome" reg={register('last_name')} />
        <Field id="phone" label="Telefone" reg={register('phone')} />
        {msg && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{msg}</p>}
        {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
        <button type="submit" disabled={isSubmitting}
          className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white disabled:opacity-60">
          Cadastrar
        </button>
      </form>
      <Link href="/login" className="mt-4 block text-sky-700">Já tenho conta</Link>
    </AuthCard>
  )
}

function Field({ id, label, type = 'text', reg, err }: {
  id: string; label: string; type?: string
  reg: ReturnType<ReturnType<typeof useForm>['register']>; err?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">{label}</label>
      <input id={id} type={type} {...reg}
        className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
      {err && <span role="alert" className="text-sm text-red-700">{err}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Create the public proxy `src/app/api/users/route.ts`** (public endpoint, no token)

```ts
import { NextRequest, NextResponse } from 'next/server'
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const res = await fetch(`${API}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  const text = await res.text()
  if (res.ok) return new NextResponse(text, { status: res.status })
  const payload = text ? JSON.parse(text) : {}
  return NextResponse.json({ error: payload.detail ?? 'Erro ao cadastrar.' }, { status: res.status })
}
```

- [ ] **Step 4: Run e2e**

Run: `npx playwright test e2e/auth.spec.ts -g cadastro`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/cadastro" src/app/api/users
git commit -m "feat(next): cadastro page (self-registration) via public proxy"
```

---

### Task 11: Esqueci-senha + Redefinir-senha pages

**Files:**
- Create: `src/app/(public)/esqueci-senha/page.tsx`, `src/app/(public)/redefinir-senha/page.tsx`
- Create: `src/app/api/password/reset-request/route.ts`, `src/app/api/password/reset/route.ts`
- Test: append to `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `POST /password/reset-request`, `POST /password/reset` (both public); `resetRequestSchema`, `resetConfirmSchema` (Task 4); the Next redirect `/redefinir-senha.html → /redefinir-senha` (Task 1).
- Produces: two pages + two public proxy routes preserving the backend status/body contract (200 `{}` / 404 `{message}` and 200/400 `{message}`).

- [ ] **Step 1: Implement proxies**

`src/app/api/password/reset-request/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'
export async function POST(req: NextRequest) {
  const body = await req.text()
  const res = await fetch(`${API}/password/reset-request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store',
  })
  return new NextResponse(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
```

`src/app/api/password/reset/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'
export async function POST(req: NextRequest) {
  const body = await req.text()
  const res = await fetch(`${API}/password/reset`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store',
  })
  return new NextResponse(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
```

- [ ] **Step 2: Implement `esqueci-senha/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { AuthCard } from '@/components/AuthCard'

export default function EsqueciSenhaPage() {
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(''); setErr('')
    const email = new FormData(e.currentTarget).get('email')
    const res = await fetch('/api/password/reset-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    if (res.ok) setMsg('Se o e-mail existir, enviamos um link de redefinição.')
    else {
      const b = await res.json().catch(() => ({}))
      setErr(b.message ?? 'E-mail não encontrado.')
    }
  }
  return (
    <AuthCard title="Recuperar senha">
      <form onSubmit={onSubmit} className="space-y-4">
        <label htmlFor="email" className="block font-medium">E-mail</label>
        <input id="email" name="email" type="email" required
          className="w-full rounded-lg border border-slate-300 p-3 text-lg" />
        {msg && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{msg}</p>}
        {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
        <button type="submit" className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white">
          Enviar link
        </button>
      </form>
    </AuthCard>
  )
}
```

- [ ] **Step 3: Implement `redefinir-senha/page.tsx`** (reads `?token=` via `useSearchParams`)

```tsx
'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AuthCard } from '@/components/AuthCard'
import { resetConfirmSchema } from '@/lib/schemas'

function Inner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [err, setErr] = useState(''); const [ok, setOk] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('')
    const nova_senha = new FormData(e.currentTarget).get('nova_senha') as string
    const parsed = resetConfirmSchema.safeParse({ token, nova_senha })
    if (!parsed.success) { setErr('A senha precisa ter ao menos 4 caracteres.'); return }
    const res = await fetch('/api/password/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data),
    })
    if (res.ok) { setOk(true); setTimeout(() => router.push('/login'), 1500) }
    else { const b = await res.json().catch(() => ({})); setErr(b.message ?? 'Token inválido ou expirado.') }
  }

  return (
    <AuthCard title="Definir nova senha">
      {ok ? (
        <p role="status" className="rounded bg-green-50 p-3 text-green-700">Senha redefinida! Redirecionando…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label htmlFor="nova_senha" className="block font-medium">Nova senha</label>
          <input id="nova_senha" name="nova_senha" type="password" required
            className="w-full rounded-lg border border-slate-300 p-3 text-lg" />
          {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
          <button type="submit" className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white">
            Salvar nova senha
          </button>
        </form>
      )}
    </AuthCard>
  )
}

export default function RedefinirSenhaPage() {
  return <Suspense><Inner /></Suspense>
}
```

- [ ] **Step 4: Write + run e2e (append to `e2e/auth.spec.ts`)**

```ts
test('esqueci-senha shows a confirmation for unknown email path', async ({ page }) => {
  await page.goto('/esqueci-senha')
  await page.getByLabel(/e-mail/i).fill('whoever@example.com')
  await page.getByRole('button', { name: /enviar link/i }).click()
  await expect(page.locator('[role="status"], [role="alert"]')).toBeVisible()
})

test('redefinir-senha.html redirects to /redefinir-senha keeping token', async ({ page }) => {
  await page.goto('/redefinir-senha.html?token=abc123')
  await expect(page).toHaveURL(/\/redefinir-senha\?token=abc123/)
  await expect(page.getByLabel(/nova senha/i)).toBeVisible()
})
```

Run: `npx playwright test e2e/auth.spec.ts`
Expected: PASS (all auth specs).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/esqueci-senha" "src/app/(public)/redefinir-senha" src/app/api/password
git commit -m "feat(next): password recovery pages + reset redirect/token handling"
```

---

## PHASE 4 — Layout, theme, accessibility, shared chrome

### Task 12: Tailwind theme + accessibility tokens (globals.css)

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS variables for colors, the root font-size scale classes (`.a11y-zoom-1`, `.a11y-zoom-2`) on `<html>`, and the `.high-contrast` theme; global `:focus-visible` ring; base typography sized for elderly readability (large defaults).

- [ ] **Step 1: Implement `globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-brand: #0369a1;
  --color-brand-strong: #075985;
  --font-size-base: 1.125rem; /* larger default for readability */
}

/* Accessibility: font scaling via root font-size (rem cascade). */
html { font-size: 100%; }
html.a11y-zoom-1 { font-size: 112.5%; }
html.a11y-zoom-2 { font-size: 125%; }

/* High contrast theme. */
html.high-contrast {
  filter: contrast(1.15);
}
html.high-contrast body {
  background: #000;
  color: #fff;
}
html.high-contrast a { color: #ffd400; }

/* Visible keyboard focus everywhere. */
:focus-visible {
  outline: 3px solid var(--color-brand);
  outline-offset: 2px;
}

body { font-size: var(--font-size-base); }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no CSS/build errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style(next): Tailwind theme + accessibility tokens (font scale, contrast, focus)"
```

---

### Task 13: AccessibilityWidget + root layout (no-FOUC cookie) + error/not-found

**Files:**
- Create: `src/components/AccessibilityWidget.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/not-found.tsx`, `src/app/error.tsx`
- Test: `e2e/a11y.spec.ts`

**Interfaces:**
- Consumes: globals.css classes (Task 12).
- Produces: a floating widget with `A−`, `A+`, contrast toggle that mutates `<html>` classes and persists to the `a11y` cookie (`zoom` 0–2, `contrast` 0/1). Root layout reads the `a11y` cookie on the server and applies the classes on `<html>` (no flash). Widget rendered in root layout so it shows on every page.

**Required DOM:** container `#a11y-bar`; buttons `aria-label="Diminuir fonte"`, `aria-label="Aumentar fonte"`, `aria-label="Alternar alto contraste"` (the last with `aria-pressed`).

- [ ] **Step 1: Write failing e2e `e2e/a11y.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('accessibility bar is present on the login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('#a11y-bar')).toBeVisible()
})

test('increasing font adds a zoom class on <html>', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Aumentar fonte' }).click()
  await expect(page.locator('html')).toHaveClass(/a11y-zoom-1/)
})

test('contrast toggle adds high-contrast class and persists', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Alternar alto contraste' }).click()
  await expect(page.locator('html')).toHaveClass(/high-contrast/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/high-contrast/)
})

test('login form controls have labels (a11y)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/senha/i)).toBeVisible()
})
```

- [ ] **Step 2: Implement `src/components/AccessibilityWidget.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function AccessibilityWidget() {
  const [zoom, setZoom] = useState(0)
  const [contrast, setContrast] = useState(false)

  useEffect(() => {
    const raw = readCookie('a11y')
    if (raw) {
      try {
        const v = JSON.parse(raw) as { zoom?: number; contrast?: number }
        setZoom(v.zoom ?? 0)
        setContrast(Boolean(v.contrast))
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('a11y-zoom-1', zoom === 1)
    html.classList.toggle('a11y-zoom-2', zoom >= 2)
    html.classList.toggle('high-contrast', contrast)
    writeCookie('a11y', JSON.stringify({ zoom, contrast: contrast ? 1 : 0 }))
  }, [zoom, contrast])

  return (
    <div id="a11y-bar"
      className="fixed bottom-4 right-4 z-50 flex gap-2 rounded-full bg-white/95 p-2 shadow-lg ring-1 ring-slate-200"
      role="group" aria-label="Acessibilidade">
      <button type="button" aria-label="Diminuir fonte" onClick={() => setZoom((z) => Math.max(0, z - 1))}
        className="h-11 w-11 rounded-full bg-slate-100 text-lg font-bold">A−</button>
      <button type="button" aria-label="Aumentar fonte" onClick={() => setZoom((z) => Math.min(2, z + 1))}
        className="h-11 w-11 rounded-full bg-slate-100 text-lg font-bold">A+</button>
      <button type="button" aria-label="Alternar alto contraste" aria-pressed={contrast}
        onClick={() => setContrast((c) => !c)}
        className="h-11 w-11 rounded-full bg-slate-800 text-lg font-bold text-white">◐</button>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/app/layout.tsx` (server reads cookie, no FOUC)**

```tsx
import './globals.css'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { AccessibilityWidget } from '@/components/AccessibilityWidget'

export const metadata = { title: 'Portal Cidade do Idoso' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  let cls = ''
  const raw = jar.get('a11y')?.value
  if (raw) {
    try {
      const v = JSON.parse(raw) as { zoom?: number; contrast?: number }
      if (v.zoom === 1) cls += ' a11y-zoom-1'
      if ((v.zoom ?? 0) >= 2) cls += ' a11y-zoom-2'
      if (v.contrast) cls += ' high-contrast'
    } catch { /* ignore */ }
  }
  return (
    <html lang="pt-BR" className={cls.trim()}>
      <body>
        {children}
        <AccessibilityWidget />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Implement `not-found.tsx` and `error.tsx`**

`src/app/not-found.tsx`:
```tsx
import Link from 'next/link'
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <Link href="/home" className="text-sky-700 underline">Voltar ao início</Link>
    </main>
  )
}
```

`src/app/error.tsx`:
```tsx
'use client'
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Algo deu errado</h1>
      <button onClick={reset} className="rounded bg-sky-600 px-4 py-2 text-white">Tentar novamente</button>
    </main>
  )
}
```

- [ ] **Step 5: Run e2e**

Run: `npx playwright test e2e/a11y.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/AccessibilityWidget.tsx "src/app/layout.tsx" "src/app/not-found.tsx" "src/app/error.tsx" e2e/a11y.spec.ts
git commit -m "feat(next): accessibility widget + no-FOUC cookie + error/not-found pages"
```

---

### Task 14: Protected layouts + Header/Nav for idoso and funcionário

**Files:**
- Create: `src/components/Header.tsx`, `src/components/LogoutButton.tsx`
- Create: `src/app/(idoso)/layout.tsx`, `src/app/(funcionario)/layout.tsx`

**Interfaces:**
- Consumes: `apiJson` (Task 6) to read `GET /users/me`; `/api/auth/logout` (Task 8).
- Produces: a `Header` server component showing the logged-in user's name and nav links (idoso: Início/Atividades/Cardápio/Notícias/Perfil; staff: Painel/Dashboard/Atividades/Cardápio/Notícias). `LogoutButton` (client) POSTs `/api/auth/logout` and pushes `/login`. Each group layout fetches `/users/me` and renders the matching `Header`.

- [ ] **Step 1: Implement `LogoutButton.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'
export function LogoutButton() {
  const router = useRouter()
  async function onClick() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }
  return (
    <button onClick={onClick} className="rounded-lg bg-slate-100 px-4 py-2 font-semibold">
      Sair
    </button>
  )
}
```

- [ ] **Step 2: Implement `Header.tsx`**

```tsx
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

type NavItem = { href: string; label: string }

export function Header({ userName, items }: { userName: string; items: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 bg-brand text-white shadow">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
        <span className="text-xl font-bold">Cidade do Idoso</span>
        <nav aria-label="Principal" className="flex flex-wrap gap-3 text-lg">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="rounded px-3 py-1 hover:bg-white/15">{it.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Olá, {userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Implement `(idoso)/layout.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { apiJson } from '@/lib/api'
import type { UserPublic } from '@/lib/types'

const ITEMS = [
  { href: '/home', label: 'Início' },
  { href: '/atividades', label: 'Atividades' },
  { href: '/cardapio', label: 'Cardápio' },
  { href: '/noticias', label: 'Notícias' },
  { href: '/perfil', label: 'Perfil' },
]

export default async function IdosoLayout({ children }: { children: ReactNode }) {
  const me = await apiJson<UserPublic>('/users/me')
  return (
    <>
      <Header userName={me.first_name || me.username} items={ITEMS} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  )
}
```

- [ ] **Step 4: Implement `(funcionario)/layout.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { apiJson } from '@/lib/api'
import type { UserPublic } from '@/lib/types'

const ITEMS = [
  { href: '/painel', label: 'Painel' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/funcionario/atividades', label: 'Atividades' },
  { href: '/funcionario/cardapio', label: 'Cardápio' },
  { href: '/funcionario/noticias', label: 'Notícias' },
]

export default async function FuncionarioLayout({ children }: { children: ReactNode }) {
  const me = await apiJson<UserPublic>('/users/me')
  return (
    <>
      <Header userName={me.first_name || me.username} items={ITEMS} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  )
}
```

> Note: staff sub-pages live at `/funcionario/atividades` etc. Update the folder layout: place staff CRUD pages under `src/app/(funcionario)/funcionario/{atividades,cardapio,noticias}/` so URLs match `STAFF_PREFIXES` in middleware. `dashboard` and `painel` stay at the group root.

- [ ] **Step 5: Type-check + commit**

Run: `npx tsc --noEmit`
```bash
git add src/components/Header.tsx src/components/LogoutButton.tsx "src/app/(idoso)/layout.tsx" "src/app/(funcionario)/layout.tsx"
git commit -m "feat(next): protected layouts + header/nav for idoso and staff"
```

---

## PHASE 5 — Idoso screens

> Pattern for every page in this phase: a **Server Component** fetches data with `apiJson` (cookie token auto-attached) and renders. Mutations use **Server Actions** in a co-located `actions.ts` that call `apiFetch`, then `revalidatePath`. Each page lists its exact endpoint + DOM contract; no two pages share code paths beyond `Card`.

### Task 15: Home page (`/home`)

**Files:**
- Create: `src/app/(idoso)/home/page.tsx`, `src/components/Card.tsx`
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `GET /home/resumo` → `HomeResumo` (Task 4); `resolveMediaUrl` (Task 6).
- Produces: a dashboard-style landing with three sections — próximas atividades, últimas notícias, prévia do cardápio — each rendering its array. Empty arrays render a friendly empty state.

**Required DOM:** `<h1>` "Início"; section headings `<h2>` "Próximas atividades", "Últimas notícias", "Cardápio"; `data-testid="home-atividades"`, `"home-noticias"`, `"home-cardapio"` wrappers.

- [ ] **Step 1: Write failing e2e `e2e/home.spec.ts`** (uses logged-in storage state from the auth setup — see appendix)

```ts
import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('home shows the three sections', async ({ page }) => {
  await page.goto('/home')
  await expect(page.getByRole('heading', { level: 1, name: /início/i })).toBeVisible()
  await expect(page.getByTestId('home-atividades')).toBeVisible()
  await expect(page.getByTestId('home-noticias')).toBeVisible()
  await expect(page.getByTestId('home-cardapio')).toBeVisible()
})
```

- [ ] **Step 2: Implement `src/components/Card.tsx`**

```tsx
import type { ReactNode } from 'react'
import { resolveMediaUrl } from '@/lib/media'

export function Card({ title, subtitle, imageUrl, children }: {
  title: string; subtitle?: string; imageUrl?: string | null; children?: ReactNode
}) {
  const src = resolveMediaUrl(imageUrl)
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
      {src && <img src={src} alt="" className="h-40 w-full object-cover" />}
      <div className="space-y-1 p-4">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-slate-600">{subtitle}</p>}
        {children}
      </div>
    </article>
  )
}
```

- [ ] **Step 3: Implement `src/app/(idoso)/home/page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { HomeResumo } from '@/lib/types'
import { Card } from '@/components/Card'

export default async function HomePage() {
  const data = await apiJson<HomeResumo>('/home/resumo')
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Início</h1>

      <section data-testid="home-atividades">
        <h2 className="mb-3 text-2xl font-semibold">Próximas atividades</h2>
        {data.atividades.length === 0 ? (
          <p className="text-slate-600">Nenhuma atividade no momento.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.atividades.map((a) => (
              <Card key={a.id} title={a.titulo} subtitle={`${a.data} • ${a.hora}`} imageUrl={a.imagem_url} />
            ))}
          </div>
        )}
      </section>

      <section data-testid="home-noticias">
        <h2 className="mb-3 text-2xl font-semibold">Últimas notícias</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.noticias.map((n) => (
            <Card key={n.id} title={n.titulo} subtitle={n.descricao} imageUrl={n.imagem_url} />
          ))}
        </div>
      </section>

      <section data-testid="home-cardapio">
        <h2 className="mb-3 text-2xl font-semibold">Cardápio</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.cardapio.map((c) => (
            <Card key={c.id} title={c.titulo} subtitle={`${c.dia} • ${c.refeicao}`} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run e2e** — `npx playwright test e2e/home.spec.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add "src/app/(idoso)/home" src/components/Card.tsx e2e/home.spec.ts
git commit -m "feat(next): home page with resumo sections + Card component"
```

---

### Task 16: Atividades page + enroll/cancel Server Actions (`/atividades`)

**Files:**
- Create: `src/app/(idoso)/atividades/page.tsx`, `src/app/(idoso)/atividades/actions.ts`, `src/app/(idoso)/atividades/EnrollButton.tsx`
- Test: `e2e/atividades.spec.ts`

**Interfaces:**
- Consumes: `GET /atividades/catalogo` → `{atividades}`, `GET /atividades/minhas-inscricoes` → `{inscricoes}`, `POST /atividades/inscricoes {activity_id}`, `POST /atividades/inscricoes/{id}/cancelar`.
- Produces:
  - `actions.ts`: `inscrever(activityId: number): Promise<{ok: boolean; error?: string}>` and `cancelar(inscricaoId: number): Promise<{ok: boolean; error?: string}>`, both call `apiFetch`, then `revalidatePath('/atividades')`.
  - Page shows each activity card with vagas/inscritos and an `EnrollButton` reflecting whether the user is already enrolled (matched by activity id from minhas-inscricoes with status `confirmado`). Lotada (vagas_disponiveis === 0 and not enrolled) → disabled with "Lotada".

- [ ] **Step 1: Write failing e2e `e2e/atividades.spec.ts`**

```ts
import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('atividades catalog renders cards with enroll buttons', async ({ page }) => {
  await page.goto('/atividades')
  await expect(page.getByRole('heading', { level: 1, name: /atividades/i })).toBeVisible()
  const cards = page.locator('[data-testid="atividade-card"]')
  await expect(cards.first()).toBeVisible()
})

test('enroll then cancel toggles the button label', async ({ page }) => {
  await page.goto('/atividades')
  const first = page.locator('[data-testid="atividade-card"]').first()
  const btn = first.getByRole('button')
  const label = (await btn.textContent())?.trim()
  await btn.click()
  await expect(btn).not.toHaveText(label ?? '', { timeout: 7000 })
})
```

- [ ] **Step 2: Implement `actions.ts`**

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { apiFetch } from '@/lib/api'

export async function inscrever(activityId: number): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch('/atividades/inscricoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_id: activityId }),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { ok: false, error: b.detail ?? 'Não foi possível inscrever.' }
  }
  revalidatePath('/atividades')
  return { ok: true }
}

export async function cancelar(inscricaoId: number): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch(`/atividades/inscricoes/${inscricaoId}/cancelar`, { method: 'POST' })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { ok: false, error: b.detail ?? 'Não foi possível cancelar.' }
  }
  revalidatePath('/atividades')
  return { ok: true }
}
```

- [ ] **Step 3: Implement `EnrollButton.tsx`**

```tsx
'use client'
import { useState, useTransition } from 'react'
import { inscrever, cancelar } from './actions'

export function EnrollButton({ activityId, inscricaoId, full }: {
  activityId: number; inscricaoId: number | null; full: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const enrolled = inscricaoId !== null

  function onClick() {
    setError('')
    start(async () => {
      const r = enrolled ? await cancelar(inscricaoId!) : await inscrever(activityId)
      if (!r.ok) setError(r.error ?? 'Erro')
    })
  }

  if (full && !enrolled) {
    return <span className="inline-block rounded bg-slate-200 px-4 py-2 font-semibold text-slate-600">Lotada</span>
  }
  return (
    <div>
      <button onClick={onClick} disabled={pending}
        className={`rounded-lg px-4 py-2 font-bold text-white disabled:opacity-60 ${enrolled ? 'bg-red-600' : 'bg-sky-600'}`}>
        {pending ? '…' : enrolled ? 'Cancelar inscrição' : 'Inscrever-se'}
      </button>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Implement `page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { AtividadeOut, InscricaoOut } from '@/lib/types'
import { Card } from '@/components/Card'
import { EnrollButton } from './EnrollButton'

export default async function AtividadesPage() {
  const [catalogo, minhas] = await Promise.all([
    apiJson<{ atividades: AtividadeOut[] }>('/atividades/catalogo'),
    apiJson<{ inscricoes: InscricaoOut[] }>('/atividades/minhas-inscricoes'),
  ])
  const enrolledByActivity = new Map<number, number>() // activityId -> inscricaoId
  for (const i of minhas.inscricoes) {
    if (i.status === 'confirmado') enrolledByActivity.set(i.atividade.id, i.id)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Atividades</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalogo.atividades.map((a) => {
          const inscricaoId = enrolledByActivity.get(a.id) ?? null
          const full = a.vagas_disponiveis === 0
          const vagasTxt = a.vagas == null ? 'Vagas livres'
            : `${a.inscritos ?? 0}/${a.vagas} inscritos`
          return (
            <div key={a.id} data-testid="atividade-card">
              <Card title={a.titulo} subtitle={`${a.data} • ${a.hora}`} imageUrl={a.imagem_url}>
                <p className="text-sm text-slate-500">{vagasTxt}</p>
                <div className="mt-2">
                  <EnrollButton activityId={a.id} inscricaoId={inscricaoId} full={full} />
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run e2e** — `npx playwright test e2e/atividades.spec.ts` → PASS.
- [ ] **Step 6: Commit**

```bash
git add "src/app/(idoso)/atividades" e2e/atividades.spec.ts
git commit -m "feat(next): atividades catalog + enroll/cancel server actions"
```

---

### Task 17: Cardápio page (`/cardapio`)

**Files:**
- Create: `src/app/(idoso)/cardapio/page.tsx`
- Test: `e2e/cardapio.spec.ts`

**Interfaces:**
- Consumes: `GET /cardapio/` → `{itens: CardapioItemOut[]}`.
- Produces: items grouped by `dia` (preserving API order), each showing `refeicao`, `titulo`, `descricao`, optional image.

**Required DOM:** `<h1>` "Cardápio"; one `<section>` per day with `<h2>` = day label; `data-testid="cardapio-grid"`.

- [ ] **Step 1: Write failing e2e `e2e/cardapio.spec.ts`** (public — no auth needed because the API endpoint is public, but the PAGE is under `(idoso)`; use idoso storage state)

```ts
import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('cardapio renders heading and grid', async ({ page }) => {
  await page.goto('/cardapio')
  await expect(page.getByRole('heading', { level: 1, name: /cardápio/i })).toBeVisible()
  await expect(page.getByTestId('cardapio-grid')).toBeVisible()
})
```

- [ ] **Step 2: Implement `page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { CardapioItemOut } from '@/lib/types'
import { Card } from '@/components/Card'

export default async function CardapioPage() {
  const { itens } = await apiJson<{ itens: CardapioItemOut[] }>('/cardapio/')
  const byDay = new Map<string, CardapioItemOut[]>()
  for (const it of itens) {
    if (!byDay.has(it.dia)) byDay.set(it.dia, [])
    byDay.get(it.dia)!.push(it)
  }
  return (
    <div className="space-y-8" data-testid="cardapio-grid">
      <h1 className="text-3xl font-bold">Cardápio</h1>
      {itens.length === 0 && <p className="text-slate-600">Cardápio ainda não publicado.</p>}
      {[...byDay.entries()].map(([dia, items]) => (
        <section key={dia}>
          <h2 className="mb-3 text-2xl font-semibold">{dia}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <Card key={it.id} title={`${it.refeicao}: ${it.titulo}`} subtitle={it.descricao} imageUrl={it.imagem_url} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Run e2e** — PASS. **Step 4: Commit**

```bash
git add "src/app/(idoso)/cardapio" e2e/cardapio.spec.ts
git commit -m "feat(next): cardapio page grouped by day"
```

---

### Task 18: Notícias page (`/noticias`)

**Files:**
- Create: `src/app/(idoso)/noticias/page.tsx`
- Test: `e2e/noticias.spec.ts`

**Interfaces:**
- Consumes: `GET /noticias` → `NoticiaOut[]`.
- Produces: a list of news cards. `fonte` is rendered as an external link (`<a href={fonte} rel="noopener noreferrer">`).

**Required DOM:** `<h1>` "Notícias"; `data-testid="noticia-card"` per item.

- [ ] **Step 1: Write failing e2e `e2e/noticias.spec.ts`**

```ts
import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('noticias renders at least one card', async ({ page }) => {
  await page.goto('/noticias')
  await expect(page.getByRole('heading', { level: 1, name: /notícias/i })).toBeVisible()
  await expect(page.locator('[data-testid="noticia-card"]').first()).toBeVisible()
})
```

- [ ] **Step 2: Implement `page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { NoticiaOut } from '@/lib/types'
import { resolveMediaUrl } from '@/lib/media'

export default async function NoticiasPage() {
  const noticias = await apiJson<NoticiaOut[]>('/noticias')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notícias</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {noticias.map((n) => {
          const img = resolveMediaUrl(n.imagem_url)
          return (
            <article key={n.id} data-testid="noticia-card"
              className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
              {img && <img src={img} alt="" className="h-44 w-full object-cover" />}
              <div className="space-y-2 p-4">
                <h2 className="text-xl font-bold">{n.titulo}</h2>
                <p className="text-slate-700">{n.descricao}</p>
                <a href={n.fonte} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                  Ler mais
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run e2e** — PASS. **Step 4: Commit**

```bash
git add "src/app/(idoso)/noticias" e2e/noticias.spec.ts
git commit -m "feat(next): noticias list page"
```

---

### Task 19: Perfil page + update Server Action (`/perfil`)

**Files:**
- Create: `src/app/(idoso)/perfil/page.tsx`, `src/app/(idoso)/perfil/actions.ts`, `src/app/(idoso)/perfil/PerfilForm.tsx`
- Test: `e2e/perfil.spec.ts`

**Interfaces:**
- Consumes: `GET /users/me` → `UserPublic`; `PATCH /users/me` (UserProfileUpdate); `perfilSchema` (Task 4).
- Produces: `actions.ts` `salvarPerfil(data: PerfilInput): Promise<{ok: boolean; error?: string}>` calling `apiFetch('/users/me', {method:'PATCH', ...})` then `revalidatePath('/perfil')`. `PerfilForm` (client) is a react-hook-form pre-filled with current values; on submit calls the action and shows a `role="status"` success.
  - Type `PerfilInput = z.infer<typeof perfilSchema>` exported from `actions.ts`.

- [ ] **Step 1: Write failing e2e `e2e/perfil.spec.ts`**

```ts
import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('perfil saves first name and confirms', async ({ page }) => {
  await page.goto('/perfil')
  await page.getByLabel(/nome/i).first().fill('Maria Teste')
  await page.getByRole('button', { name: /salvar/i }).click()
  await expect(page.getByRole('status')).toBeVisible()
})
```

- [ ] **Step 2: Implement `actions.ts`**

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { perfilSchema } from '@/lib/schemas'

export type PerfilInput = z.infer<typeof perfilSchema>

export async function salvarPerfil(data: PerfilInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = perfilSchema.safeParse(data)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { ok: false, error: b.detail ?? 'Não foi possível salvar.' }
  }
  revalidatePath('/perfil')
  return { ok: true }
}
```

- [ ] **Step 3: Implement `PerfilForm.tsx`** (client; receives initial values)

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { perfilSchema } from '@/lib/schemas'
import { salvarPerfil, type PerfilInput } from './actions'

export function PerfilForm({ initial }: { initial: PerfilInput }) {
  const { register, handleSubmit } = useForm<PerfilInput>({
    resolver: zodResolver(perfilSchema), defaultValues: initial,
  })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  async function onSubmit(values: PerfilInput) {
    setMsg(''); setErr('')
    const r = await salvarPerfil(values)
    if (r.ok) setMsg('Perfil atualizado com sucesso.')
    else setErr(r.error ?? 'Erro ao salvar.')
  }

  const fields: { name: keyof PerfilInput; label: string }[] = [
    { name: 'first_name', label: 'Nome' }, { name: 'last_name', label: 'Sobrenome' },
    { name: 'phone', label: 'Telefone' }, { name: 'address', label: 'Endereço' },
    { name: 'city', label: 'Cidade' }, { name: 'state', label: 'Estado' },
    { name: 'zip_code', label: 'CEP' },
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block font-medium">{f.label}</label>
          <input id={f.name} {...register(f.name)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
        </div>
      ))}
      <div className="sm:col-span-2">
        {msg && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{msg}</p>}
        {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
        <button type="submit" className="mt-2 rounded-lg bg-sky-600 px-6 py-3 text-lg font-bold text-white">
          Salvar
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Implement `page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { UserPublic } from '@/lib/types'
import { PerfilForm, } from './PerfilForm'
import type { PerfilInput } from './actions'

export default async function PerfilPage() {
  const me = await apiJson<UserPublic>('/users/me')
  const initial: PerfilInput = {
    first_name: me.first_name ?? '', last_name: me.last_name ?? '', phone: me.phone ?? '',
    address: me.address ?? '', city: me.city ?? '', state: me.state ?? '',
    zip_code: me.zip_code ?? '', gender: me.gender ?? '', birth_date: me.birth_date ?? '',
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meu perfil</h1>
      <p className="text-slate-600">{me.username} • {me.email}</p>
      <PerfilForm initial={initial} />
    </div>
  )
}
```

- [ ] **Step 5: Run e2e** — PASS. **Step 6: Commit**

```bash
git add "src/app/(idoso)/perfil" e2e/perfil.spec.ts
git commit -m "feat(next): perfil page + profile update server action"
```

---

## PHASE 6 — Funcionário screens

> All pages here are under `(funcionario)`; middleware already blocks non-staff. Staff CRUD pages live at `/funcionario/{atividades,cardapio,noticias}`; `/painel` and `/dashboard` at the group root.

### Task 20: Staff hub (`/painel`)

**Files:** Create `src/app/(funcionario)/painel/page.tsx`. Test: `e2e/staff.spec.ts` (create file).

**Interfaces:** Consumes `GET /dashboard/resumo` → `DashboardIndicadores`. Produces a hub with quick links to dashboard + CRUD pages and a few headline numbers.

- [ ] **Step 1: Write failing e2e `e2e/staff.spec.ts`**

```ts
import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/staff.json' })

test('staff hub shows quick links', async ({ page }) => {
  await page.goto('/painel')
  await expect(page.getByRole('heading', { level: 1, name: /painel/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
})
```

- [ ] **Step 2: Implement `page.tsx`**

```tsx
import Link from 'next/link'
import { apiJson } from '@/lib/api'
import type { DashboardIndicadores } from '@/lib/types'

export default async function PainelPage() {
  const d = await apiJson<DashboardIndicadores>('/dashboard/resumo')
  const stats = [
    { label: 'Idosos', value: d.total_idosos },
    { label: 'Atividades', value: d.total_atividades },
    { label: 'Inscrições', value: d.total_inscricoes_confirmadas },
    { label: 'Notícias', value: d.total_noticias },
  ]
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/funcionario/atividades', label: 'Gerenciar atividades' },
    { href: '/funcionario/cardapio', label: 'Gerenciar cardápio' },
    { href: '/funcionario/noticias', label: 'Gerenciar notícias' },
  ]
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Painel da equipe</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 text-center shadow ring-1 ring-slate-200">
            <div className="text-3xl font-bold text-brand">{s.value}</div>
            <div className="text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className="rounded-2xl bg-brand p-6 text-xl font-semibold text-white shadow hover:bg-brand-strong">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run e2e** — PASS. **Step 4: Commit**

```bash
git add "src/app/(funcionario)/painel" e2e/staff.spec.ts
git commit -m "feat(next): staff hub page"
```

---

### Task 21: Dashboard with charts + CSV export (`/dashboard`)

**Files:**
- Create: `src/app/(funcionario)/dashboard/page.tsx`, `src/components/Charts.tsx`, `src/app/api/export/inscricoes/route.ts`
- Test: append to `e2e/staff.spec.ts`

**Interfaces:**
- Consumes: `GET /dashboard/resumo`, `/inscricoes-por-semana`, `/uso-funcionalidades`, `/alertas`; `GET /dashboard/export/inscricoes.csv` (via the proxy route).
- Produces: `Charts.tsx` (client) wrapping react-chartjs-2 `Line` (inscrições por semana) + `Bar` (uso de funcionalidades) with registered Chart.js components. `export/inscricoes/route.ts` streams the CSV from FastAPI with the cookie token and the `Content-Disposition` header. Page renders indicators, charts, alerts, and a download link `<a href="/api/export/inscricoes">`.

- [ ] **Step 1: Write failing e2e (append to `e2e/staff.spec.ts`)**

```ts
test('dashboard renders charts canvas and export link', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(2)
  await expect(page.getByRole('link', { name: /exportar csv/i })).toBeVisible()
})
```

- [ ] **Step 2: Implement `Charts.tsx`**

```tsx
'use client'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import type { PontoSemana, UsoFuncionalidade } from '@/lib/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

export function InscricoesChart({ pontos }: { pontos: PontoSemana[] }) {
  return (
    <Line
      aria-label="Inscrições por semana"
      data={{
        labels: pontos.map((p) => p.semana),
        datasets: [{ label: 'Inscrições', data: pontos.map((p) => p.total), borderColor: '#0369a1' }],
      }}
    />
  )
}

export function UsoChart({ itens }: { itens: UsoFuncionalidade[] }) {
  return (
    <Bar
      aria-label="Uso por funcionalidade"
      data={{
        labels: itens.map((i) => i.funcionalidade),
        datasets: [{ label: 'Total', data: itens.map((i) => i.total), backgroundColor: '#0369a1' }],
      }}
    />
  )
}
```

- [ ] **Step 3: Implement `src/app/api/export/inscricoes/route.ts`**

```ts
import { apiFetch } from '@/lib/api'

export async function GET() {
  const res = await apiFetch('/dashboard/export/inscricoes.csv')
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="inscricoes_presenca.csv"',
    },
  })
}
```

- [ ] **Step 4: Implement `dashboard/page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type {
  DashboardIndicadores, PontoSemana, UsoFuncionalidade, AlertaAtividade,
} from '@/lib/types'
import { InscricoesChart, UsoChart } from '@/components/Charts'

export default async function DashboardPage() {
  const [resumo, semana, uso, alertas] = await Promise.all([
    apiJson<DashboardIndicadores>('/dashboard/resumo'),
    apiJson<{ pontos: PontoSemana[] }>('/dashboard/inscricoes-por-semana'),
    apiJson<{ itens: UsoFuncionalidade[] }>('/dashboard/uso-funcionalidades'),
    apiJson<{ alertas: AlertaAtividade[] }>('/dashboard/alertas'),
  ])
  const cards = [
    ['Idosos', resumo.total_idosos], ['Funcionários', resumo.total_funcionarios],
    ['Atividades', resumo.total_atividades], ['Inscrições', resumo.total_inscricoes_confirmadas],
    ['Notícias', resumo.total_noticias], ['Itens de cardápio', resumo.total_itens_cardapio],
    ['Presenças', resumo.total_presencas],
  ] as const

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <a href="/api/export/inscricoes" className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">
          Exportar CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 text-center shadow ring-1 ring-slate-200">
            <div className="text-3xl font-bold text-brand">{value}</div>
            <div className="text-slate-600">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
          <h2 className="mb-3 text-xl font-semibold">Inscrições por semana</h2>
          <InscricoesChart pontos={semana.pontos} />
        </section>
        <section className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
          <h2 className="mb-3 text-xl font-semibold">Uso das funcionalidades</h2>
          <UsoChart itens={uso.itens} />
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Alertas de capacidade</h2>
        {alertas.alertas.length === 0 ? (
          <p className="text-slate-600">Nenhuma atividade acima de 90% da capacidade.</p>
        ) : (
          <ul className="space-y-2">
            {alertas.alertas.map((a) => (
              <li key={a.activity_id} className="rounded-lg bg-amber-50 p-3 text-amber-800">
                <strong>{a.titulo}</strong> — {a.inscritos}/{a.capacidade} ({a.percentual}%)
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Run e2e** — PASS. **Step 6: Commit**

```bash
git add "src/app/(funcionario)/dashboard" src/components/Charts.tsx src/app/api/export
git commit -m "feat(next): staff dashboard (charts + alerts + CSV export)"
```

---

### Task 22: Staff atividades CRUD (`/funcionario/atividades`)

**Files:**
- Create: `src/app/(funcionario)/funcionario/atividades/page.tsx`, `.../actions.ts`, `.../AtividadeAdmin.tsx`
- Test: append to `e2e/staff.spec.ts`

**Interfaces:**
- Consumes: `GET /atividades/catalogo`; `POST /atividades/` (`AtividadeCreate`); `PATCH /atividades/{id}`; `DELETE /atividades/{id}`; `atividadeFormSchema` (Task 4).
- Produces: `actions.ts` with `criarAtividade(input)`, `atualizarAtividade(id, input)`, `removerAtividade(id)` (each `apiFetch` + `revalidatePath('/funcionario/atividades')`); a client `AtividadeAdmin` table+form (create + delete is enough for parity; edit optional via PATCH).
  - Exported type `AtividadeInput = z.infer<typeof atividadeFormSchema>`.

- [ ] **Step 1: Write failing e2e (append)**

```ts
test('staff can create an activity', async ({ page }) => {
  await page.goto('/funcionario/atividades')
  const titulo = `Aula Teste ${Date.now()}`
  await page.getByLabel(/título/i).fill(titulo)
  await page.getByLabel(/hora/i).fill('14:00')
  await page.getByLabel(/data/i).fill('Segunda-feira')
  await page.getByRole('button', { name: /criar atividade/i }).click()
  await expect(page.getByText(titulo)).toBeVisible({ timeout: 7000 })
})
```

- [ ] **Step 2: Implement `actions.ts`**

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { atividadeFormSchema } from '@/lib/schemas'

export type AtividadeInput = z.infer<typeof atividadeFormSchema>
const PATH = '/funcionario/atividades'

export async function criarAtividade(input: AtividadeInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = atividadeFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/atividades/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })
  if (!res.ok) return { ok: false, error: 'Falha ao criar.' }
  revalidatePath(PATH); return { ok: true }
}

export async function removerAtividade(id: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/atividades/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath(PATH)
  return { ok: res.ok }
}
```

- [ ] **Step 3: Implement `AtividadeAdmin.tsx`** (client form + list with delete)

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { atividadeFormSchema } from '@/lib/schemas'
import { criarAtividade, removerAtividade, type AtividadeInput } from './actions'
import type { AtividadeOut } from '@/lib/types'

export function AtividadeAdmin({ atividades }: { atividades: AtividadeOut[] }) {
  const { register, handleSubmit, reset } = useForm<AtividadeInput>({ resolver: zodResolver(atividadeFormSchema) })
  const [msg, setMsg] = useState(''); const [pending, start] = useTransition()

  async function onSubmit(values: AtividadeInput) {
    setMsg('')
    const r = await criarAtividade(values)
    if (r.ok) { setMsg('Atividade criada.'); reset() } else setMsg(r.error ?? 'Erro')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-2">
        <Field id="titulo" label="Título" reg={register('titulo')} />
        <Field id="hora" label="Hora" reg={register('hora')} />
        <Field id="data" label="Data" reg={register('data')} />
        <Field id="imagem_url" label="Imagem (URL)" reg={register('imagem_url')} />
        <Field id="vagas" label="Vagas (opcional)" reg={register('vagas')} />
        <div className="sm:col-span-2">
          {msg && <p role="status" className="mb-2 text-green-700">{msg}</p>}
          <button type="submit" className="rounded-lg bg-brand px-6 py-3 font-bold text-white">Criar atividade</button>
        </div>
      </form>

      <ul className="divide-y rounded-2xl bg-white shadow">
        {atividades.map((a) => (
          <li key={a.id} className="flex items-center justify-between p-4">
            <span>{a.titulo} — {a.data} {a.hora}</span>
            <button onClick={() => start(() => removerAtividade(a.id).then(() => {}))} disabled={pending}
              className="rounded bg-red-600 px-3 py-1 text-white">Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Field({ id, label, reg }: {
  id: string; label: string; reg: ReturnType<ReturnType<typeof useForm>['register']>
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">{label}</label>
      <input id={id} {...reg} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
    </div>
  )
}
```

- [ ] **Step 4: Implement `page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { AtividadeOut } from '@/lib/types'
import { AtividadeAdmin } from './AtividadeAdmin'

export default async function FuncAtividadesPage() {
  const { atividades } = await apiJson<{ atividades: AtividadeOut[] }>('/atividades/catalogo')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar atividades</h1>
      <AtividadeAdmin atividades={atividades} />
    </div>
  )
}
```

- [ ] **Step 5: Run e2e** — PASS. **Step 6: Commit**

```bash
git add "src/app/(funcionario)/funcionario/atividades"
git commit -m "feat(next): staff atividades CRUD (create/list/delete + vagas)"
```

---

### Task 23: Staff cardápio CRUD (`/funcionario/cardapio`)

**Files:**
- Create: `src/app/(funcionario)/funcionario/cardapio/page.tsx`, `.../actions.ts`, `.../CardapioAdmin.tsx`
- Test: append to `e2e/staff.spec.ts`

**Interfaces:**
- Consumes: `GET /cardapio/`; `POST /cardapio/itens` (`CardapioItemCreate`); `DELETE /cardapio/itens/{id}`; `cardapioFormSchema` (Task 4).
- Produces: `actions.ts` `criarItem(input)`, `removerItem(id)` (apiFetch + `revalidatePath('/funcionario/cardapio')`); `CardapioAdmin` client form (fields: dia, ordem_dia, ordem_refeicao, refeicao, titulo, descricao, imagem_url) + list with delete.
  - Exported type `CardapioInput = z.infer<typeof cardapioFormSchema>`.

- [ ] **Step 1: Write failing e2e (append)**

```ts
test('staff can create a menu item', async ({ page }) => {
  await page.goto('/funcionario/cardapio')
  const titulo = `Sopa ${Date.now()}`
  await page.getByLabel(/^dia$/i).fill('Segunda-feira')
  await page.getByLabel(/ordem do dia/i).fill('1')
  await page.getByLabel(/ordem da refeição/i).fill('1')
  await page.getByLabel(/refeição/i).fill('Almoço')
  await page.getByLabel(/título/i).fill(titulo)
  await page.getByRole('button', { name: /adicionar item/i }).click()
  await expect(page.getByText(titulo)).toBeVisible({ timeout: 7000 })
})
```

- [ ] **Step 2: Implement `actions.ts`**

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { cardapioFormSchema } from '@/lib/schemas'

export type CardapioInput = z.infer<typeof cardapioFormSchema>
const PATH = '/funcionario/cardapio'

export async function criarItem(input: CardapioInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = cardapioFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/cardapio/itens', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data),
  })
  if (!res.ok) return { ok: false, error: 'Falha ao adicionar.' }
  revalidatePath(PATH); return { ok: true }
}

export async function removerItem(id: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/cardapio/itens/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath(PATH)
  return { ok: res.ok }
}
```

- [ ] **Step 3: Implement `CardapioAdmin.tsx`** (mirror `AtividadeAdmin` shape with these labels: "Dia", "Ordem do dia", "Ordem da refeição", "Refeição", "Título", "Descrição", "Imagem (URL)"; submit "Adicionar item"). Use the same `Field` helper pattern; bind via `register('dia')`, `register('ordem_dia')`, `register('ordem_refeicao')`, `register('refeicao')`, `register('titulo')`, `register('descricao')`, `register('imagem_url')`. List items show `{it.dia} — {it.refeicao}: {it.titulo}` with a delete button calling `removerItem(it.id)`.

- [ ] **Step 4: Implement `page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { CardapioItemOut } from '@/lib/types'
import { CardapioAdmin } from './CardapioAdmin'

export default async function FuncCardapioPage() {
  const { itens } = await apiJson<{ itens: CardapioItemOut[] }>('/cardapio/')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar cardápio</h1>
      <CardapioAdmin itens={itens} />
    </div>
  )
}
```

- [ ] **Step 5: Run e2e** — PASS. **Step 6: Commit**

```bash
git add "src/app/(funcionario)/funcionario/cardapio"
git commit -m "feat(next): staff cardapio CRUD"
```

---

### Task 24: Staff notícias CRUD + image upload (`/funcionario/noticias`)

**Files:**
- Create: `src/app/(funcionario)/funcionario/noticias/page.tsx`, `.../actions.ts`, `.../NoticiaAdmin.tsx`
- Create: `src/app/api/upload/noticias/[id]/route.ts`
- Test: append to `e2e/staff.spec.ts`

**Interfaces:**
- Consumes: `GET /noticias`; `POST /noticias` (`NoticiaCreate`); `DELETE /noticias/{id}`; `POST /noticias/{id}/imagem` (multipart `arquivo`); `noticiaFormSchema` (Task 4).
- Produces:
  - `actions.ts`: `criarNoticia(input)`, `removerNoticia(id)` (apiFetch JSON + `revalidatePath('/funcionario/noticias')`).
  - `api/upload/noticias/[id]/route.ts`: receives the browser `FormData` (field `arquivo`) and forwards it to FastAPI `POST /noticias/{id}/imagem` with the cookie token (multipart passthrough; do NOT set Content-Type manually — let fetch set the boundary).
  - `NoticiaAdmin` (client): create form (titulo, descricao, fonte) + per-item file input that uploads to `/api/upload/noticias/{id}` then `router.refresh()`.

- [ ] **Step 1: Write failing e2e (append)**

```ts
test('staff can create a news item', async ({ page }) => {
  await page.goto('/funcionario/noticias')
  const titulo = `Notícia ${Date.now()}`
  await page.getByLabel(/título/i).fill(titulo)
  await page.getByLabel(/descrição/i).fill('Texto da notícia de teste.')
  await page.getByLabel(/fonte/i).fill('https://example.com')
  await page.getByRole('button', { name: /publicar notícia/i }).click()
  await expect(page.getByText(titulo)).toBeVisible({ timeout: 7000 })
})
```

- [ ] **Step 2: Implement `actions.ts`**

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { noticiaFormSchema } from '@/lib/schemas'

export type NoticiaInput = z.infer<typeof noticiaFormSchema>
const PATH = '/funcionario/noticias'

export async function criarNoticia(input: NoticiaInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = noticiaFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/noticias', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data),
  })
  if (!res.ok) return { ok: false, error: 'Falha ao publicar.' }
  revalidatePath(PATH); return { ok: true }
}

export async function removerNoticia(id: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/noticias/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath(PATH)
  return { ok: res.ok }
}
```

- [ ] **Step 3: Implement `api/upload/noticias/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { apiFetch } from '@/lib/api'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await req.formData() // contains field "arquivo"
  // apiFetch attaches the token; do NOT set Content-Type so fetch adds the multipart boundary.
  const res = await apiFetch(`/noticias/${id}/imagem`, { method: 'POST', body: form })
  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
```

- [ ] **Step 4: Implement `NoticiaAdmin.tsx`** (client): a create form with labels "Título", "Descrição", "Fonte" (submit "Publicar notícia") wired to `criarNoticia`; below, a list of news where each row has a `<input type="file" accept="image/*">` plus an "Enviar imagem" button that does `fetch('/api/upload/noticias/'+id, {method:'POST', body: formDataWithArquivo})` then `router.refresh()`, and a delete button calling `removerNoticia(id)`. Reuse the `Field` pattern from Task 22.

- [ ] **Step 5: Implement `page.tsx`**

```tsx
import { apiJson } from '@/lib/api'
import type { NoticiaOut } from '@/lib/types'
import { NoticiaAdmin } from './NoticiaAdmin'

export default async function FuncNoticiasPage() {
  const noticias = await apiJson<NoticiaOut[]>('/noticias')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar notícias</h1>
      <NoticiaAdmin noticias={noticias} />
    </div>
  )
}
```

- [ ] **Step 6: Run e2e** — PASS. **Step 7: Commit**

```bash
git add "src/app/(funcionario)/funcionario/noticias" src/app/api/upload
git commit -m "feat(next): staff noticias CRUD + image upload proxy"
```

---

## PHASE 7 — e2e harness, CI, cutover, cleanup

### Task 25: Playwright auth setup (storage states) + CI workflow

**Files:**
- Create: `frontend-next/e2e/auth.setup.ts`
- Modify: `frontend-next/playwright.config.ts` (add a `setup` project + dependencies)
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the running stack + seeded demo accounts (idoso + gestora/admin).
- Produces: `e2e/.auth/idoso.json` and `e2e/.auth/staff.json` storage states reused by all logged-in specs. CI brings up the compose stack, seeds the staff account, and runs Playwright against `http://localhost:3000`.

> **Test accounts:** the idoso storage state is created by registering a fresh idoso through `/api/users` then logging in. The staff state logs in as the seeded admin (`gestora@cidadeidoso.com` / `Gestora@123`); CI seeds/promotes it (see step 3).

- [ ] **Step 1: Implement `e2e/auth.setup.ts`**

```ts
import { test as setup, expect } from '@playwright/test'

const IDOSO_FILE = 'e2e/.auth/idoso.json'
const STAFF_FILE = 'e2e/.auth/staff.json'

setup('authenticate idoso', async ({ page, request }) => {
  const email = `idoso_e2e_${Date.now()}@cidadeidoso.test`
  await request.post('/api/users', {
    data: { username: email.split('@')[0], email, password: 'senha123', first_name: 'Idoso' },
  })
  await page.goto('/login')
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill('senha123')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('**/home')
  await page.context().storageState({ path: IDOSO_FILE })
})

setup('authenticate staff', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('mode-funcionario').click()
  await page.getByLabel(/e-mail/i).fill(process.env.E2E_STAFF_EMAIL ?? 'gestora@cidadeidoso.com')
  await page.getByLabel(/senha/i).fill(process.env.E2E_STAFF_PASSWORD ?? 'Gestora@123')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('**/painel')
  await page.context().storageState({ path: STAFF_FILE })
})
```

- [ ] **Step 2: Update `playwright.config.ts` projects**

```ts
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
```

- [ ] **Step 3: Update `.github/workflows/ci.yml`** — replace the e2e job's frontend steps so it builds and runs the Next stack:

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start stack
        run: |
          cp .env.example .env
          docker compose up -d --build
      - name: Wait for API and Web
        run: |
          for i in $(seq 1 60); do curl -sf http://localhost:8000/ && break; sleep 2; done
          for i in $(seq 1 60); do curl -sf http://localhost:3000/login && break; sleep 2; done
      - name: Seed staff account
        run: |
          curl -s -X POST http://localhost:8000/users/ \
            -H 'Content-Type: application/json' \
            -d '{"username":"gestora","email":"gestora@cidadeidoso.com","password":"Gestora@123"}' || true
          docker compose exec -T db psql -U postgres -d cidade_idoso \
            -c "UPDATE users SET role='admin', is_staff=true WHERE email='gestora@cidadeidoso.com';"
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Run Playwright
        working-directory: frontend-next
        env:
          E2E_BASE_URL: http://localhost:3000
        run: |
          npm ci
          npx playwright install --with-deps chromium
          npx playwright test
```

- [ ] **Step 4: Run the full suite locally against the stack**

Run: `cd frontend-next && npx playwright test`
Expected: all specs PASS (auth, a11y, home, atividades, cardapio, noticias, perfil, staff).

- [ ] **Step 5: Commit**

```bash
git add frontend-next/e2e/auth.setup.ts frontend-next/playwright.config.ts .github/workflows/ci.yml
git commit -m "test(next): playwright auth storage states + CI e2e against Next stack"
```

---

### Task 26: Docker cutover verification + docs update

**Files:**
- Modify: `ACESSO-DEMO.md` (URLs 8080 → 3000), `docs/ENTREGA-SPRINTS.md` (frontend section), `README`/`.env.example` notes if present.

**Interfaces:**
- Consumes: Task 3 compose wiring.
- Produces: the full stack serving the Next portal at `http://localhost:3000`, docs updated.

- [ ] **Step 1: Bring up the full stack fresh**

Run: `docker compose down -v && docker compose up -d --build`
Expected: `db`, `redis`, `api`, `web` all healthy/running.

- [ ] **Step 2: Smoke-check the portal**

Run: `curl -sf http://localhost:3000/login >/dev/null && echo OK`
Expected: `OK`. Manually verify login → home (idoso) and login → painel (staff).

- [ ] **Step 3: Update `ACESSO-DEMO.md`** — change `http://localhost:8080` to `http://localhost:3000`; keep API docs at `http://localhost:8000/docs`.

- [ ] **Step 4: Update `docs/ENTREGA-SPRINTS.md`** — note the frontend is now Next.js (App Router, standalone) served on port 3000; nginx removed.

- [ ] **Step 5: Commit**

```bash
git add ACESSO-DEMO.md docs/ENTREGA-SPRINTS.md
git commit -m "docs: point portal URLs to Next on :3000; note nginx removal"
```

---

### Task 27: Remove the legacy static frontend (CONFIRMATION CHECKPOINT)

> **Do NOT run this task without explicit user approval.** It deletes the old `frontend/` (nginx + native JS). Everything remains recoverable in git history.

**Files:**
- Delete: `frontend/` (entire directory).
- Verify: `docker-compose.yml` no longer references `./frontend` (done in Task 3).

- [ ] **Step 1: Confirm with the user** that parity is reached and the old frontend can be removed.

- [ ] **Step 2: Remove the directory**

```bash
git rm -r frontend
```

- [ ] **Step 3: Full stack + e2e re-verify**

Run: `docker compose down -v && docker compose up -d --build && cd frontend-next && npx playwright test`
Expected: stack healthy; all e2e PASS — confirming nothing depended on the old `frontend/`.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove legacy static frontend (replaced by Next.js)"
```

---

## Appendix — Running e2e locally

1. Start the backend stack and the Next dev server (or full Docker):
   - Docker: `docker compose up -d --build` → portal at `http://localhost:3000`.
   - Dev: backend via Docker (`docker compose up -d db redis api`), then `cd frontend-next && API_INTERNAL_URL=http://localhost:8000 npm run dev`.
2. Seed a staff account once (mirrors `ACESSO-DEMO.md`): register `gestora@cidadeidoso.com` via the UI/`/api/users`, then
   `docker compose exec db psql -U postgres -d cidade_idoso -c "UPDATE users SET role='admin', is_staff=true WHERE email='gestora@cidadeidoso.com';"`
3. `cd frontend-next && npx playwright test` (the `setup` project creates the storage states first).

## Self-review notes (coverage map)

- Spec §2 decisions → Global Constraints + Tasks 1,3,5,8,12.
- Spec §3 data-fetching model → Tasks 6 (apiFetch), 8 (auth), 15–24 (Server Components + Server Actions).
- Spec §4 folder structure → Task 1 + per-page tasks.
- Spec §5 auth flow → Tasks 5,7,8 (+ role cookie from `/users/me`).
- Spec §6 screen mapping → Tasks 9,10,11,15,16,17,18,19,20,21,22,23,24.
- Spec §7 accessibility → Tasks 12,13 (+ a11y e2e).
- Spec §8 components/forms/api client → Tasks 4,6,9,13,14, and form tasks.
- Spec §9 Docker/infra → Tasks 1,3,26.
- Spec §10 tests/CI → Tasks 2,25 + e2e per page.
- Spec §11 error handling → Task 13 (error/not-found) + ApiError surfacing in actions.
- Spec §12 migration/cleanup → Tasks 3,26,27.
- Spec §13 out-of-scope respected (no backend change; integration handled via redirects/rewrites/proxies).
