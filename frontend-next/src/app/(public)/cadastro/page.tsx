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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field id="username" label="Nome de usuário" reg={register('username')} err={errors.username?.message} />
        <Field id="email" label="E-mail" type="email" reg={register('email')} err={errors.email?.message} />
        <Field id="password" label="Senha" type="password" reg={register('password')} err={errors.password?.message} />
        <Field id="first_name" label="Nome" reg={register('first_name')} />
        <Field id="last_name" label="Sobrenome" reg={register('last_name')} />
        <Field id="phone" label="Telefone" reg={register('phone')} />

        {msg && <p role="status" className="feedback-success">{msg}</p>}
        {err && <p role="alert" className="feedback-error">{err}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          Cadastrar
        </button>
      </form>

      <Link href="/login" className="mt-5 block text-base font-medium hover:underline" style={{ color: 'var(--color-brand-mid)' }}>
        Já tenho conta
      </Link>
    </AuthCard>
  )
}

function Field({ id, label, type = 'text', reg, err }: {
  id: string; label: string; type?: string
  reg: ReturnType<ReturnType<typeof useForm>['register']>; err?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-base font-medium mb-1" style={{ color: 'var(--color-ink)' }}>
        {label}
      </label>
      <input id={id} type={type} {...reg} className="field-input" />
      {err && <span role="alert" className="mt-1 block text-sm" style={{ color: 'var(--color-danger)' }}>{err}</span>}
    </div>
  )
}
