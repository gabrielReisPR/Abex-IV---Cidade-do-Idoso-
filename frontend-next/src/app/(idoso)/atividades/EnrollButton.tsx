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
    return <span className="inline-block rounded bg-slate-200 px-4 py-2 font-semibold text-slate-600">Lotada</span>
  }
  return (
    <div>
      <button onClick={onClick} disabled={pending}
        className={`rounded-lg px-4 py-2 font-bold text-white disabled:opacity-60 ${enrolled ? 'bg-red-600' : 'bg-sky-600'}`}>
        {pending ? '…' : enrolled ? 'Cancelar inscrição' : 'Inscrever-se'}
      </button>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}
