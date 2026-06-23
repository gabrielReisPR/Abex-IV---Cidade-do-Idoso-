'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { perfilSchema } from '@/lib/schemas'
import { salvarPerfil, type PerfilInput } from './actions'

export function PerfilForm({ initial }: { initial: PerfilInput }) {
  const { register, handleSubmit } = useForm<PerfilInput>({
    resolver: zodResolver(perfilSchema), defaultValues: initial,
  })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  async function onSubmit(values: PerfilInput) {
    setMsg(''); setErr('')
    const r = await salvarPerfil(values)
    if (r.ok) setMsg('Perfil atualizado com sucesso.')
    else setErr(r.error ?? 'Erro ao salvar.')
  }

  const fields: { name: keyof PerfilInput; label: string }[] = [
    { name: 'first_name', label: 'Nome' }, { name: 'last_name', label: 'Sobrenome' },
    { name: 'phone', label: 'Telefone' }, { name: 'address', label: 'Endereço' },
    { name: 'city', label: 'Cidade' }, { name: 'state', label: 'Estado' },
    { name: 'zip_code', label: 'CEP' },
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block font-medium">{f.label}</label>
          <input id={f.name} {...register(f.name)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
        </div>
      ))}
      <div className="sm:col-span-2">
        {msg && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{msg}</p>}
        {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
        <button type="submit" className="mt-2 rounded-lg bg-sky-600 px-6 py-3 text-lg font-bold text-white">
          Salvar
        </button>
      </div>
    </form>
  )
}
