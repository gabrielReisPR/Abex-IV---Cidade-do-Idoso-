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
