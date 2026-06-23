'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { perfilSchema } from '@/lib/schemas'

export type PerfilInput = z.infer<typeof perfilSchema>

export async function salvarPerfil(data: PerfilInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = perfilSchema.safeParse(data)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { ok: false, error: b.detail ?? 'Não foi possível salvar.' }
  }
  revalidatePath('/perfil')
  return { ok: true }
}
