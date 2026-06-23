'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AuthCard } from '@/components/AuthCard'
import { resetConfirmSchema } from '@/lib/schemas'

function Inner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [err, setErr] = useState(''); const [ok, setOk] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('')
    const nova_senha = new FormData(e.currentTarget).get('nova_senha') as string
    const parsed = resetConfirmSchema.safeParse({ token, nova_senha })
    if (!parsed.success) { setErr('A senha precisa ter ao menos 4 caracteres.'); return }
    const res = await fetch('/api/password/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data),
    })
    if (res.ok) { setOk(true); setTimeout(() => router.push('/login'), 1500) }
    else { const b = await res.json().catch(() => ({})); setErr(b.message ?? 'Token inválido ou expirado.') }
  }

  return (
    <AuthCard title="Definir nova senha">
      {ok ? (
        <p role="status" className="feedback-success">Senha redefinida! Redirecionando…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="nova_senha" className="block text-base font-medium mb-1" style={{ color: 'var(--color-ink)' }}>
              Nova senha
            </label>
            <input
              id="nova_senha"
              name="nova_senha"
              type="password"
              required
              className="field-input"
            />
          </div>

          {err && <p role="alert" className="feedback-error">{err}</p>}

          <button type="submit" className="btn-primary w-full">
            Salvar nova senha
          </button>
        </form>
      )}
    </AuthCard>
  )
}

export default function RedefinirSenhaPage() {
  return <Suspense><Inner /></Suspense>
}
