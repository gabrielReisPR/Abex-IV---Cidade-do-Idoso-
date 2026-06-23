import Link from 'next/link'
import { apiJson } from '@/lib/api'
import type { DashboardIndicadores } from '@/lib/types'

export default async function PainelPage() {
  const d = await apiJson<DashboardIndicadores>('/dashboard/resumo')
  const stats = [
    { label: 'Idosos', value: d.total_idosos, icon: 'fa-users' },
    { label: 'Atividades', value: d.total_atividades, icon: 'fa-calendar-check' },
    { label: 'Inscrições', value: d.total_inscricoes_confirmadas, icon: 'fa-clipboard-list' },
    { label: 'Notícias', value: d.total_noticias, icon: 'fa-newspaper' },
  ]
  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { href: '/funcionario/atividades', label: 'Gerenciar atividades', icon: 'fa-calendar-check' },
    { href: '/funcionario/cardapio', label: 'Gerenciar cardápio', icon: 'fa-utensils' },
    { href: '/funcionario/noticias', label: 'Gerenciar notícias', icon: 'fa-newspaper' },
  ]
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-[--color-ink]">Painel da equipe</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-[--color-surface] border border-[--color-border] p-6 text-center shadow-sm"
          >
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg, #00B931 0%, #01200F 100%)' }}
            >
              <i className={`fas ${s.icon} text-white text-lg`} aria-hidden="true" />
            </div>
            <div className="text-3xl font-bold text-[--color-brand]">{s.value}</div>
            <div className="text-[--color-muted] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-4 rounded-2xl p-6 text-xl font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #01200F 0%, #00B931 100%)' }}
          >
            <i className={`fas ${l.icon} text-2xl`} aria-hidden="true" />
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
