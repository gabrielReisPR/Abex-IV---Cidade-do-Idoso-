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
      {/* Mode toggle — translucent in header style, active = filled white */}
      <div className="mb-6 flex gap-2" role="group" aria-label="Tipo de acesso">
        <button
          type="button"
          data-testid="mode-idoso"
          aria-pressed={mode === 'idoso'}
          onClick={() => setMode('idoso')}
          className="flex-1 rounded-lg px-4 py-3 text-lg font-semibold border transition-colors"
          style={
            mode === 'idoso'
              ? { background: 'var(--brand-gradient)', color: '#fff', borderColor: 'transparent' }
              : { background: 'transparent', color: 'var(--color-brand-dark)', borderColor: 'var(--color-border)' }
          }
        >
          <i className="fas fa-user-clock mr-2" aria-hidden="true" />
          Idoso
        </button>
        <button
          type="button"
          data-testid="mode-funcionario"
          aria-pressed={mode === 'funcionario'}
          onClick={() => setMode('funcionario')}
          className="flex-1 rounded-lg px-4 py-3 text-lg font-semibold border transition-colors"
          style={
            mode === 'funcionario'
              ? { background: 'var(--brand-gradient)', color: '#fff', borderColor: 'transparent' }
              : { background: 'transparent', color: 'var(--color-brand-dark)', borderColor: 'var(--color-border)' }
          }
        >
          <i className="fas fa-id-badge mr-2" aria-hidden="true" />
          Funcionário
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-base font-medium mb-1" style={{ color: 'var(--color-ink)' }}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-base font-medium mb-1" style={{ color: 'var(--color-ink)' }}>
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="field-input"
          />
        </div>

        {error && (
          <p role="alert" className="feedback-error">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Entrando…' : `Entrar como ${mode === 'idoso' ? 'Idoso' : 'Funcionário'}`}
        </button>
      </form>

      <div className="mt-5 flex justify-between text-base font-medium" style={{ color: 'var(--color-brand-dark)' }}>
        <Link href="/cadastro" className="hover:underline" style={{ color: 'var(--color-brand-mid)' }}>
          Criar conta
        </Link>
        <Link href="/esqueci-senha" className="hover:underline" style={{ color: 'var(--color-brand-mid)' }}>
          Esqueci a senha
        </Link>
      </div>
    </AuthCard>
  )
}
