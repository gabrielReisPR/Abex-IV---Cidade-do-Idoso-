'use client'
import { useState } from 'react'
import { AuthCard } from '@/components/AuthCard'

export default function EsqueciSenhaPage() {
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(''); setErr('')
    const email = new FormData(e.currentTarget).get('email')
    const res = await fetch('/api/password/reset-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    if (res.ok) setMsg('Se o e-mail existir, enviamos um link de redefinição.')
    else {
      const b = await res.json().catch(() => ({}))
      setErr(b.message ?? 'E-mail não encontrado.')
    }
  }
  return (
    <AuthCard title="Recuperar senha">
      <form onSubmit={onSubmit} className="space-y-4">
        <label htmlFor="email" className="block font-medium">E-mail</label>
        <input id="email" name="email" type="email" required
          className="w-full rounded-lg border border-slate-300 p-3 text-lg" />
        {msg && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{msg}</p>}
        {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
        <button type="submit" className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white">
          Enviar link
        </button>
      </form>
    </AuthCard>
  )
}
