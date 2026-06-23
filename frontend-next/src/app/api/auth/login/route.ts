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
