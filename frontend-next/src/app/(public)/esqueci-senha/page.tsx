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
        <div>
          <label htmlFor="email" className="block text-base font-medium mb-1" style={{ color: 'var(--color-ink)' }}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="field-input"
          />
        </div>

        {msg && <p role="status" className="feedback-success">{msg}</p>}
        {err && <p role="alert" className="feedback-error">{err}</p>}

        <button type="submit" className="btn-primary w-full">
          Enviar link
        </button>
      </form>
    </AuthCard>
  )
}
