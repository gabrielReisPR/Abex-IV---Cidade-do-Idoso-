'use client'
import { useState, useTransition } from 'react'
import { inscrever, cancelar } from './actions'

export function EnrollButton({ activityId, inscricaoId, full }: {
  activityId: number; inscricaoId: number | null; full: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const enrolled = inscricaoId !== null

  function onClick() {
    setError('')
    start(async () => {
      const r = enrolled ? await cancelar(inscricaoId!) : await inscrever(activityId)
      if (!r.ok) setError(r.error ?? 'Erro')
    })
  }

  if (full && !enrolled) {
    return (
      <span
        className="inline-flex items-center rounded-lg px-4 py-3 font-semibold text-base"
        style={{ background: 'var(--color-border)', color: 'var(--color-muted)', minHeight: '48px' }}
      >
        Lotada
      </span>
    )
  }
  return (
    <div>
      <button
        onClick={onClick}
        disabled={pending}
        className={enrolled ? 'btn-danger' : 'btn-primary'}
      >
        {pending ? '…' : enrolled ? 'Cancelar inscrição' : 'Inscrever-se'}
      </button>
      {error && <p role="alert" className="feedback-error mt-2 text-base">{error}</p>}
    </div>
  )
}
