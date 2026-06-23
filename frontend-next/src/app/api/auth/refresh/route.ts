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
