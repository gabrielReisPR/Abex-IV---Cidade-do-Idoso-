'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { noticiaFormSchema } from '@/lib/schemas'
import { criarNoticia, removerNoticia, type NoticiaInput } from './actions'
import type { NoticiaOut } from '@/lib/types'

export function NoticiaAdmin({ noticias }: { noticias: NoticiaOut[] }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<NoticiaInput>({ resolver: zodResolver(noticiaFormSchema) })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [pending, start] = useTransition()
  const router = useRouter()

  async function onSubmit(values: NoticiaInput) {
    setMsg(''); setErr('')
    const r = await criarNoticia(values)
    if (r.ok) { setMsg('Notícia publicada.'); setErr(''); reset() } else { setErr(r.error ?? 'Erro'); setMsg('') }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-2xl bg-[--color-surface] border border-[--color-border] p-6 shadow-sm sm:grid-cols-2">
        <Field id="titulo" label="Título" reg={register('titulo')} />
        <Field id="fonte" label="Fonte" reg={register('fonte')} />
        <div className="sm:col-span-2">
          <Field id="descricao" label="Descrição" reg={register('descricao')} />
        </div>
        <div className="sm:col-span-2 space-y-3">
          {msg && <p role="status" className="rounded-lg border border-[#b8dfc8] bg-[#e8f5ec] p-3 text-[#0d3d1f]">{msg}</p>}
          {err && <p role="alert" className="rounded-lg border border-[#f5c6cb] bg-[#f8d7da] p-3 text-[#721c24]">{err}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            Publicar notícia
          </button>
        </div>
      </form>

      <ul className="divide-y divide-[--color-border] rounded-2xl bg-[--color-surface] border border-[--color-border] shadow-sm">
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
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <span className="flex-1 truncate font-medium text-[--color-ink]">{noticia.titulo}</span>
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="text-sm text-[--color-muted]" disabled={uploading} />
        <button
          type="button"
          onClick={enviarImagem}
          disabled={pending || uploading}
          className="btn-primary py-2 px-4 text-base"
        >
          <i className="fas fa-upload mr-1" aria-hidden="true" />
          Enviar imagem
        </button>
        <button
          type="button"
          onClick={() => start(() => removerNoticia(noticia.id).then(() => {}))}
          disabled={pending || uploading}
          className="btn-danger"
        >
          <i className="fas fa-trash mr-1" aria-hidden="true" />
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
      <label htmlFor={id} className="block font-semibold text-[--color-ink] mb-1">{label}</label>
      <input id={id} {...reg} className="field-input" />
    </div>
  )
}
