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

export function parseApiPayload(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text // non-JSON body → keep the raw text
  }
}

export function apiErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    const m = o.detail ?? o.message
    if (typeof m === 'string') return m
  }
  if (typeof payload === 'string' && payload) return payload
  return `HTTP ${status}`
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
      await res.body?.cancel()
      res = await fetch(url, { ...init, headers: buildHeaders(), cache: 'no-store' })
    }
  }
  return res
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  const text = await res.text()
  const payload = parseApiPayload(text)
  if (!res.ok) {
    throw new ApiError(apiErrorMessage(payload, res.status), res.status, payload)
  }
  return payload as T
}
