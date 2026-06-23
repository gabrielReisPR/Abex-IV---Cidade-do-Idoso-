'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/AuthCard'
import { cadastroSchema } from '@/lib/schemas'

type Form = z.infer<typeof cadastroSchema>

export default function CadastroPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(cadastroSchema) })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function onSubmit(values: Form) {
    setMsg(''); setErr('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) setMsg('Conta criada com sucesso! Você já pode entrar.')
    else {
      const b = await res.json().catch(() => ({}))
      setErr(b.error ?? 'Não foi possível criar a conta.')
    }
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field id="username" label="Nome de usuário" reg={register('username')} err={errors.username?.message} />
        <Field id="email" label="E-mail" type="email" reg={register('email')} err={errors.email?.message} />
        <Field id="password" label="Senha" type="password" reg={register('password')} err={errors.password?.message} />
        <Field id="first_name" label="Nome" reg={register('first_name')} />
        <Field id="last_name" label="Sobrenome" reg={register('last_name')} />
        <Field id="phone" label="Telefone" reg={register('phone')} />
        {msg && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{msg}</p>}
        {err && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{err}</p>}
        <button type="submit" disabled={isSubmitting}
          className="w-full rounded-lg bg-sky-600 px-4 py-3 text-lg font-bold text-white disabled:opacity-60">
          Cadastrar
        </button>
      </form>
      <Link href="/login" className="mt-4 block text-sky-700">Já tenho conta</Link>
    </AuthCard>
  )
}

function Field({ id, label, type = 'text', reg, err }: {
  id: string; label: string; type?: string
  reg: ReturnType<ReturnType<typeof useForm>['register']>; err?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">{label}</label>
      <input id={id} type={type} {...reg}
        className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg" />
      {err && <span role="alert" className="text-sm text-red-700">{err}</span>}
    </div>
  )
}
