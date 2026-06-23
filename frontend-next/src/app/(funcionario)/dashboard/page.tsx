import { apiJson } from '@/lib/api'
import type {
  DashboardIndicadores, PontoSemana, UsoFuncionalidade, AlertaAtividade,
} from '@/lib/types'
import { InscricoesChart, UsoChart } from '@/components/Charts'

export default async function DashboardPage() {
  const [resumo, semana, uso, alertas] = await Promise.all([
    apiJson<DashboardIndicadores>('/dashboard/resumo'),
    apiJson<{ pontos: PontoSemana[] }>('/dashboard/inscricoes-por-semana'),
    apiJson<{ itens: UsoFuncionalidade[] }>('/dashboard/uso-funcionalidades'),
    apiJson<{ alertas: AlertaAtividade[] }>('/dashboard/alertas'),
  ])
  const cards = [
    { label: 'Idosos', value: resumo.total_idosos, icon: 'fa-users' },
    { label: 'Funcionários', value: resumo.total_funcionarios, icon: 'fa-id-badge' },
    { label: 'Atividades', value: resumo.total_atividades, icon: 'fa-calendar-check' },
    { label: 'Inscrições', value: resumo.total_inscricoes_confirmadas, icon: 'fa-clipboard-list' },
    { label: 'Notícias', value: resumo.total_noticias, icon: 'fa-newspaper' },
    { label: 'Itens de cardápio', value: resumo.total_itens_cardapio, icon: 'fa-utensils' },
    { label: 'Presenças', value: resumo.total_presencas, icon: 'fa-user-check' },
  ] as const

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[--color-ink]">Dashboard</h1>
        <a
          href="/api/export/inscricoes"
          className="btn-primary flex items-center gap-2"
        >
          <i className="fas fa-download" aria-hidden="true" />
          Exportar CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-2xl bg-[--color-surface] border border-[--color-border] p-5 text-center shadow-sm"
          >
            <div
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg, #00B931 0%, #01200F 100%)' }}
            >
              <i className={`fas ${icon} text-white text-sm`} aria-hidden="true" />
            </div>
            <div className="text-3xl font-bold text-[--color-brand]">{value}</div>
            <div className="text-[--color-muted] text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-[--color-surface] border border-[--color-border] p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-[--color-ink]">Inscrições por semana</h2>
          <InscricoesChart pontos={semana.pontos} />
        </section>
        <section className="rounded-2xl bg-[--color-surface] border border-[--color-border] p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-[--color-ink]">Uso das funcionalidades</h2>
          <UsoChart itens={uso.itens} />
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-[--color-ink]">Alertas de capacidade</h2>
        {alertas.alertas.length === 0 ? (
          <p className="text-[--color-muted]">Nenhuma atividade acima de 90% da capacidade.</p>
        ) : (
          <ul className="space-y-2">
            {alertas.alertas.map((a) => (
              <li
                key={a.activity_id}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
              >
                <i className="fas fa-triangle-exclamation mr-2" aria-hidden="true" />
                <strong>{a.titulo}</strong> — {a.inscritos}/{a.capacidade} ({a.percentual}%)
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
