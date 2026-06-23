import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

type NavItem = { href: string; label: string }

export function Header({ userName, items }: { userName: string; items: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 bg-brand text-white shadow">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
        <span className="text-xl font-bold">Cidade do Idoso</span>
        <nav aria-label="Principal" className="flex flex-wrap gap-3 text-lg">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="rounded px-3 py-1 hover:bg-white/15">{it.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Olá, {userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
