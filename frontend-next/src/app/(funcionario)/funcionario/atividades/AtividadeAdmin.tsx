'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { atividadeFormSchema } from '@/lib/schemas'
import { criarAtividade, removerAtividade, type AtividadeInput } from './actions'
import type { AtividadeOut } from '@/lib/types'

export function AtividadeAdmin({ atividades }: { atividades: AtividadeOut[] }) {
  const { register, handleSubmit, reset } = useForm<AtividadeInput>({ resolver: zodResolver(atividadeFormSchema) })
  const [msg, setMsg] = useState(''); const [pending, start] = useTransition()

  async function onSubmit(values: AtividadeInput) {
    setMsg('')
    const r = await criarAtividade(values)
    if (r.ok) { setMsg('Atividade criada.'); reset() } else setMsg(r.error ?? 'Erro')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-2">
        <Field id="titulo" label="Título" reg={register('titulo')} />
        <Field id="hora" label="Hora" reg={register('hora')} />
        <Field id="data" label="Data" reg={register('data')} />
        <Field id="imagem_url" label="Imagem (URL)" reg={register('imagem_url')} />
        <Field id="vagas" label="Vagas (opcional)" reg={register('vagas')} />
        <div className="sm:col-span-2">
          {msg && <p role="status" className="mb-2 text-green-700">{msg}</p>}
          <button type="submit" className="rounded-lg bg-brand px-6 py-3 font-bold text-white">Criar atividade</button>
        </div>
      </form>

      <ul className="divide-y rounded-2xl bg-white shadow">
        {atividades.map((a) => (
          <li key={a.id} className="flex items-center justify-between p-4">
            <span>{a.titulo} — {a.data} {a.hora}</span>
            <button onClick={() => start(() => removerAtividade(a.id).then(() => {}))} disabled={pending}
              className="rounded bg-red-600 px-3 py-1 text-white">Excluir</button>
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
      <label htmlFor={id} className="block font-medium">{label}</label>
      <input id={id} {...reg} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
    </div>
  )
}
