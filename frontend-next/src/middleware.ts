import { NextRequest, NextResponse } from 'next/server'
import { COOKIES } from './lib/auth'

const STAFF_PREFIXES = ['/dashboard', '/painel', '/funcionario']
const IDOSO_PREFIXES = ['/home', '/atividades', '/cardapio', '/noticias', '/perfil']
const STAFF_ROLES = ['funcionario', 'admin']

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Pure decision (unit-tested). Returns a redirect path or null. */
export function decideRedirect(
  pathname: string,
  hasSession: boolean,
  role: string | null,
): string | null {
  const isStaffRoute = startsWithAny(pathname, STAFF_PREFIXES)
  const isIdosoRoute = startsWithAny(pathname, IDOSO_PREFIXES)
  if (!isStaffRoute && !isIdosoRoute) return null
  if (!hasSession) return '/login'
  if (isStaffRoute && !(role && STAFF_ROLES.includes(role))) return '/home'
  return null
}

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(COOKIES.refresh)?.value)
  const role = req.cookies.get(COOKIES.role)?.value ?? null
  const target = decideRedirect(req.nextUrl.pathname, hasSession, role)
  if (target) {
    const url = req.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|uploads|favicon.ico).*)'],
}
