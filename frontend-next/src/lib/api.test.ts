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
