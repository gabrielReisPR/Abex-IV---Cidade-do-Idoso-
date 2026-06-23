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
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name}>
          <label
            htmlFor={f.name}
            className="mb-1 block font-semibold text-base"
            style={{ color: 'var(--color-ink)' }}
          >
            {f.label}
          </label>
          <input
            id={f.name}
            {...register(f.name)}
            className="field-input"
          />
        </div>
      ))}
      <div className="sm:col-span-2 space-y-3">
        {msg && (
          <p role="status" className="feedback-success">{msg}</p>
        )}
        {err && (
          <p role="alert" className="feedback-error">{err}</p>
        )}
        <button type="submit" className="btn-primary">
          <i className="fas fa-save" aria-hidden="true" />
          Salvar
        </button>
      </div>
    </form>
  )
}
