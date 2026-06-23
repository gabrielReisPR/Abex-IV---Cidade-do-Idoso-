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
