'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { noticiaFormSchema } from '@/lib/schemas'
import { criarNoticia, removerNoticia, type NoticiaInput } from './actions'
import type { NoticiaOut } from '@/lib/types'

export function NoticiaAdmin({ noticias }: { noticias: NoticiaOut[] }) {
  const { register, handleSubmit, reset } = useForm<NoticiaInput>({ resolver: zodResolver(noticiaFormSchema) })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [pending, start] = useTransition()
  const router = useRouter()

  async function onSubmit(values: NoticiaInput) {
    setMsg(''); setErr('')
    const r = await criarNoticia(values)
    if (r.ok) { setMsg('Notícia publicada.'); setErr(''); reset() } else { setErr(r.error ?? 'Erro'); setMsg('') }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-2">
        <Field id="titulo" label="Título" reg={register('titulo')} />
        <Field id="fonte" label="Fonte" reg={register('fonte')} />
        <div className="sm:col-span-2">
          <Field id="descricao" label="Descrição" reg={register('descricao')} />
        </div>
        <div className="sm:col-span-2">
          {msg && <p role="status" className="mb-2 text-green-700">{msg}</p>}
          {err && <p role="alert" className="mb-2 text-red-700">{err}</p>}
          <button type="submit" className="rounded-lg bg-brand px-6 py-3 font-bold text-white">Publicar notícia</button>
        </div>
      </form>

      <ul className="divide-y rounded-2xl bg-white shadow">
        {noticias.map((n) => (
          <NoticiaRow key={n.id} noticia={n} pending={pending} start={start} router={router} />
        ))}
      </ul>
    </div>
  )
}

function NoticiaRow({
  noticia,
  pending,
  start,
  router,
}: {
  noticia: NoticiaOut
  pending: boolean
  start: ReturnType<typeof useTransition>[1]
  router: ReturnType<typeof useRouter>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function enviarImagem() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('arquivo', file)
    setUploading(true)
    try {
      await fetch('/api/upload/noticias/' + noticia.id, { method: 'POST', body: fd })
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-4">
      <span className="flex-1 truncate">{noticia.titulo}</span>
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="text-sm" disabled={uploading} />
        <button
          type="button"
          onClick={enviarImagem}
          disabled={pending || uploading}
          className="rounded bg-blue-600 px-3 py-1 text-white"
        >
          Enviar imagem
        </button>
        <button
          type="button"
          onClick={() => start(() => removerNoticia(noticia.id).then(() => {}))}
          disabled={pending || uploading}
          className="rounded bg-red-600 px-3 py-1 text-white"
        >
          Excluir
        </button>
      </div>
    </li>
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
