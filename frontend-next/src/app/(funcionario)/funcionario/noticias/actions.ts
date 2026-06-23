'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { noticiaFormSchema } from '@/lib/schemas'

export type NoticiaInput = z.infer<typeof noticiaFormSchema>
const PATH = '/funcionario/noticias'

export async function criarNoticia(input: NoticiaInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = noticiaFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/noticias', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data),
  })
  if (!res.ok) return { ok: false, error: 'Falha ao publicar.' }
  revalidatePath(PATH); return { ok: true }
}

export async function removerNoticia(id: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/noticias/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath(PATH)
  return { ok: res.ok }
}
