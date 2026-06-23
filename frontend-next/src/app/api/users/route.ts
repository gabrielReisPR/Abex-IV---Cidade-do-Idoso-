import { NextRequest, NextResponse } from 'next/server'
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const res = await fetch(`${API}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  const text = await res.text()
  if (res.ok) return new NextResponse(text, { status: res.status })
  const payload = text ? JSON.parse(text) : {}
  return NextResponse.json({ error: payload.detail ?? 'Erro ao cadastrar.' }, { status: res.status })
}
