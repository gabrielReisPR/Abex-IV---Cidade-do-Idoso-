'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { perfilSchema } from '@/lib/schemas'

export type PerfilInput = z.infer<typeof perfilSchema>

export async function salvarPerfil(data: PerfilInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = perfilSchema.safeParse(data)
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }

  // Send only filled fields — empty strings would fail typed optional
  // backend fields (e.g. birth_date as a date). PATCH updates only what we send.
  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== '' && v != null),
  )

  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    const detail = typeof b?.detail === 'string' ? b.detail : 'Não foi possível salvar.'
    return { ok: false, error: detail }
  }
  revalidatePath('/perfil')
  return { ok: true }
}
