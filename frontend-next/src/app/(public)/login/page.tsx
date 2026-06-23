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
      <div className="mb-4 flex gap-2" role="group" aria-label="Tipo de acesso">
        <button
          type="button" data-testid="mode-idoso" aria-pressed={mode === 'idoso'}
          onClick={() => setMode('idoso')}
          className={`flex-1 rounded-lg px-4 py-3 text-lg font-semibold ${mode === 'idoso' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >Idoso</button>
        <button
          type="button" data-testid="mode-funcionario" aria-pressed={mode === 'funcionario'}
          onClick={() => setMode('funcionario')}
          className={`flex-1 rounded-lg px-4 py-3 text-lg font-semibold ${mode === 'funcionario' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >Funcionário</button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-lg font-medium">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="username"
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
        </div>
        <div>
          <label htmlFor="password" className="block text-lg font-medium">Senha</label>
          <input id="password" name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>
        )}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white disabled:opacity-60">
          {loading ? 'Entrando…' : `Entrar como ${mode === 'idoso' ? 'Idoso' : 'Funcionário'}`}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sky-700">
        <Link href="/cadastro">Criar conta</Link>
        <Link href="/esqueci-senha">Esqueci a senha</Link>
      </div>
    </AuthCard>
  )
}
