'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { atividadeFormSchema } from '@/lib/schemas'

export type AtividadeInput = z.infer<typeof atividadeFormSchema>
const PATH = '/funcionario/atividades'

export async function criarAtividade(input: AtividadeInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = atividadeFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/atividades/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })
  if (!res.ok) return { ok: false, error: 'Falha ao criar.' }
  revalidatePath(PATH); return { ok: true }
}

export async function removerAtividade(id: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/atividades/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath(PATH)
  return { ok: res.ok }
}
