import { apiFetch } from '@/lib/api'

export async function GET() {
  const res = await apiFetch('/dashboard/export/inscricoes.csv')
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="inscricoes_presenca.csv"',
    },
  })
}
