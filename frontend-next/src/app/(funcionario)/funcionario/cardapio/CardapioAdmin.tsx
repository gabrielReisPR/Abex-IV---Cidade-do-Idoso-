'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { cardapioFormSchema } from '@/lib/schemas'
import { criarItem, removerItem, type CardapioInput } from './actions'
import type { CardapioItemOut } from '@/lib/types'

export function CardapioAdmin({ itens }: { itens: CardapioItemOut[] }) {
  const { register, handleSubmit, reset } = useForm<CardapioInput>({ resolver: zodResolver(cardapioFormSchema) })
  const [msg, setMsg] = useState(''); const [pending, start] = useTransition()

  async function onSubmit(values: CardapioInput) {
    setMsg('')
    const r = await criarItem(values)
    if (r.ok) { setMsg('Item adicionado.'); reset() } else setMsg(r.error ?? 'Erro')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-2">
        <Field id="dia" label="Dia" reg={register('dia')} />
        <Field id="ordem_dia" label="Ordem do dia" reg={register('ordem_dia')} />
        <Field id="ordem_refeicao" label="Ordem da refeição" reg={register('ordem_refeicao')} />
        <Field id="refeicao" label="Refeição" reg={register('refeicao')} />
        <Field id="titulo" label="Título" reg={register('titulo')} />
        <Field id="descricao" label="Descrição" reg={register('descricao')} />
        <Field id="imagem_url" label="Imagem (URL)" reg={register('imagem_url')} />
        <div className="sm:col-span-2">
          {msg && <p role="status" className="mb-2 text-green-700">{msg}</p>}
          <button type="submit" className="rounded-lg bg-brand px-6 py-3 font-bold text-white">Adicionar item</button>
        </div>
      </form>

      <ul className="divide-y rounded-2xl bg-white shadow">
        {itens.map((it) => (
          <li key={it.id} className="flex items-center justify-between p-4">
            <span>{it.dia} — {it.refeicao}: {it.titulo}</span>
            <button onClick={() => start(() => removerItem(it.id).then(() => {}))} disabled={pending}
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
