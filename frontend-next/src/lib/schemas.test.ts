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
