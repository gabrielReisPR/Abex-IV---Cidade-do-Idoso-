import Link from 'next/link'
import { apiJson } from '@/lib/api'
import type { DashboardIndicadores } from '@/lib/types'

export default async function PainelPage() {
  const d = await apiJson<DashboardIndicadores>('/dashboard/resumo')
  const stats = [
    { label: 'Idosos', value: d.total_idosos },
    { label: 'Atividades', value: d.total_atividades },
    { label: 'Inscrições', value: d.total_inscricoes_confirmadas },
    { label: 'Notícias', value: d.total_noticias },
  ]
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/funcionario/atividades', label: 'Gerenciar atividades' },
    { href: '/funcionario/cardapio', label: 'Gerenciar cardápio' },
    { href: '/funcionario/noticias', label: 'Gerenciar notícias' },
  ]
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Painel da equipe</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 text-center shadow ring-1 ring-slate-200">
            <div className="text-3xl font-bold text-brand">{s.value}</div>
            <div className="text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className="rounded-2xl bg-brand p-6 text-xl font-semibold text-white shadow hover:bg-brand-strong">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
