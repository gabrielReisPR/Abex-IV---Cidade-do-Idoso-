import { describe, it, expect } from 'vitest'
import { shouldRetryAfter401, ApiError, parseApiPayload, apiErrorMessage } from '@/lib/api'

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

describe('parseApiPayload', () => {
  it('parses valid JSON', () => {
    expect(parseApiPayload('{"a":1}')).toEqual({ a: 1 })
  })
  it('returns raw string for non-JSON body', () => {
    expect(parseApiPayload('<html>502</html>')).toBe('<html>502</html>')
  })
  it('returns null for empty string', () => {
    expect(parseApiPayload('')).toBeNull()
  })
})

describe('apiErrorMessage', () => {
  it('uses detail when present', () => {
    expect(apiErrorMessage({ detail: 'x' }, 400)).toBe('x')
  })
  it('uses message when detail is absent', () => {
    expect(apiErrorMessage({ message: 'y' }, 400)).toBe('y')
  })
  it('returns raw string payload', () => {
    expect(apiErrorMessage('<html>', 502)).toBe('<html>')
  })
  it('falls back to HTTP status', () => {
    expect(apiErrorMessage({}, 500)).toBe('HTTP 500')
  })
})
