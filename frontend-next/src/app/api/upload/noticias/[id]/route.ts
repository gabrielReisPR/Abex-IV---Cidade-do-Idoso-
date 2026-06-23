import { NextRequest, NextResponse } from 'next/server'
import { apiFetch } from '@/lib/api'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await req.formData() // contains field "arquivo"
  // apiFetch attaches the token; do NOT set Content-Type so fetch adds the multipart boundary.
  const res = await apiFetch(`/noticias/${id}/imagem`, { method: 'POST', body: form })
  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
