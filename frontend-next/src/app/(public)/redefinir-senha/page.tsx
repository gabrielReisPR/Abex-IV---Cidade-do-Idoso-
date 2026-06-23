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
        <p role="status" className="rounded bg-green-50 p-3 text-green-700">Senha redefinida! Redirecionando…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label htmlFor="nova_senha" className="block font-medium">Nova senha</label>
          <input id="nova_senha" name="nova_senha" type="password" required
            className="w-full rounded-lg border border-slate-300 p-3 text-lg" />
          {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
          <button type="submit" className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white">
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
