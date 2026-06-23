'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { atividadeFormSchema } from '@/lib/schemas'
import { criarAtividade, removerAtividade, type AtividadeInput } from './actions'
import type { AtividadeOut } from '@/lib/types'

export function AtividadeAdmin({ atividades }: { atividades: AtividadeOut[] }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<AtividadeInput>({ resolver: zodResolver(atividadeFormSchema) })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [pending, start] = useTransition()

  async function onSubmit(values: AtividadeInput) {
    setMsg(''); setErr('')
    const r = await criarAtividade(values)
    if (r.ok) { setMsg('Atividade criada.'); setErr(''); reset() } else { setErr(r.error ?? 'Erro'); setMsg('') }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-2xl bg-[--color-surface] border border-[--color-border] p-6 shadow-sm sm:grid-cols-2">
        <Field id="titulo" label="Título" reg={register('titulo')} />
        <Field id="hora" label="Hora" reg={register('hora')} />
        <Field id="data" label="Data" reg={register('data')} />
        <Field id="imagem_url" label="Imagem (URL)" reg={register('imagem_url')} />
        <Field id="vagas" label="Vagas (opcional)" reg={register('vagas')} />
        <div className="sm:col-span-2 space-y-3">
          {msg && <p role="status" className="rounded-lg border border-[#b8dfc8] bg-[#e8f5ec] p-3 text-[#0d3d1f]">{msg}</p>}
          {err && <p role="alert" className="rounded-lg border border-[#f5c6cb] bg-[#f8d7da] p-3 text-[#721c24]">{err}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            Criar atividade
          </button>
        </div>
      </form>

      <ul className="divide-y divide-[--color-border] rounded-2xl bg-[--color-surface] border border-[--color-border] shadow-sm">
        {atividades.map((a) => (
          <li key={a.id} className="flex items-center justify-between p-4 gap-4">
            <span className="text-[--color-ink] font-medium flex-1">{a.titulo} — {a.data} {a.hora}</span>
            <button
              onClick={() => start(() => removerAtividade(a.id).then(() => {}))}
              disabled={pending}
              className="btn-danger"
            >
              <i className="fas fa-trash mr-1" aria-hidden="true" />
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Field({ id, label, reg }: {
  id: string; label: string; reg: ReturnType<ReturnType<typeof useForm>['register']>
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-[--color-ink] mb-1">{label}</label>
      <input id={id} {...reg} className="field-input" />
    </div>
  )
}
