'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; icon: string; label: string }

const IDOSO_ITEMS: NavItem[] = [
  { href: '/home',       icon: 'fa-home',          label: 'Início' },
  { href: '/atividades', icon: 'fa-calendar-check', label: 'Atividades' },
  { href: '/cardapio',   icon: 'fa-utensils',       label: 'Cardápio' },
  { href: '/noticias',   icon: 'fa-newspaper',      label: 'Notícias' },
  { href: '/perfil',     icon: 'fa-user',           label: 'Perfil' },
]

const STAFF_ITEMS: NavItem[] = [
  { href: '/painel',                icon: 'fa-gauge',         label: 'Painel' },
  { href: '/dashboard',             icon: 'fa-chart-line',    label: 'Dashboard' },
  { href: '/funcionario/atividades',icon: 'fa-calendar-check',label: 'Atividades' },
  { href: '/funcionario/cardapio',  icon: 'fa-utensils',      label: 'Cardápio' },
  { href: '/funcionario/noticias',  icon: 'fa-newspaper',     label: 'Notícias' },
]

export function BottomNav({ variant }: { variant: 'idoso' | 'staff' }) {
  const pathname = usePathname()
  const items = variant === 'idoso' ? IDOSO_ITEMS : STAFF_ITEMS

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center"
      style={{
        background: 'var(--brand-gradient)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
        minHeight: '64px',
      }}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-white',
              'transition-colors min-w-[64px]',
              isActive ? 'bg-white/20' : 'hover:bg-white/10',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            <i className={`fas ${item.icon} text-lg`} aria-hidden="true" />
            <span className="text-[11px] font-medium leading-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
