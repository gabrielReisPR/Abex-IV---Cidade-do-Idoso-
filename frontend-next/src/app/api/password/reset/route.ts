import { NextRequest, NextResponse } from 'next/server'
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'
export async function POST(req: NextRequest) {
  const body = await req.text()
  const res = await fetch(`${API}/password/reset`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store',
  })
  return new NextResponse(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
