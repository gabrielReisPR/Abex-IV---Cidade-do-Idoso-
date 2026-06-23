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
