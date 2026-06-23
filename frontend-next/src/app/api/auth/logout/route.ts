import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIES } from '@/lib/auth'

export async function POST() {
  const jar = await cookies()
  jar.delete(COOKIES.access)
  jar.delete(COOKIES.refresh)
  jar.delete(COOKIES.role)
  return NextResponse.json({ redirect: '/login' })
}
