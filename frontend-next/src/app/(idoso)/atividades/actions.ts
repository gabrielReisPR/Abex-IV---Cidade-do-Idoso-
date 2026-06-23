'use server'
import { revalidatePath } from 'next/cache'
import { apiFetch } from '@/lib/api'

export async function inscrever(activityId: number): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch('/atividades/inscricoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_id: activityId }),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { ok: false, error: b.detail ?? 'Não foi possível inscrever.' }
  }
  revalidatePath('/atividades')
  return { ok: true }
}

export async function cancelar(inscricaoId: number): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch(`/atividades/inscricoes/${inscricaoId}/cancelar`, { method: 'POST' })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    return { ok: false, error: b.detail ?? 'Não foi possível cancelar.' }
  }
  revalidatePath('/atividades')
  return { ok: true }
}
