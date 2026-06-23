import Image from 'next/image'
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

export function Header({
  userName,
  variant,
}: {
  userName: string
  variant: 'idoso' | 'staff'
}) {
  return (
    <header
      className="sticky top-0 z-40 text-white"
      style={{
        background: 'var(--brand-gradient)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* ── Left: logo + title ───────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/IMAGENS/pasted_file_QqQlpv_Roberto-Carlos-2-1024x683.jpg"
            alt="Logo Cidade do Idoso"
            width={52}
            height={52}
            className="rounded-full object-cover border-2 border-white/40 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xl font-bold leading-tight truncate">Cidade do Idoso</p>
            <p className="text-xs opacity-75 leading-tight">Chapecó - Santa Catarina</p>
          </div>
        </div>

        {/* ── Right: greeting + actions ────────────────────── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline text-sm opacity-90 mr-1">
            Olá, {userName}
          </span>

          {variant === 'idoso' && (
            <Link
              href="/perfil"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
                         bg-white/20 border border-white/40 hover:bg-white/30 transition-colors"
            >
              <i className="fas fa-user" aria-hidden="true" />
              <span className="hidden sm:inline">Meu Perfil</span>
            </Link>
          )}

          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
