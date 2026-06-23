'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { cardapioFormSchema } from '@/lib/schemas'

export type CardapioInput = z.infer<typeof cardapioFormSchema>
const PATH = '/funcionario/cardapio'

export async function criarItem(input: CardapioInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = cardapioFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/cardapio/itens', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data),
  })
  if (!res.ok) return { ok: false, error: 'Falha ao adicionar.' }
  revalidatePath(PATH); return { ok: true }
}

export async function removerItem(id: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/cardapio/itens/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath(PATH)
  return { ok: res.ok }
}
