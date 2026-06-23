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
    ['Idosos', resumo.total_idosos], ['Funcionários', resumo.total_funcionarios],
    ['Atividades', resumo.total_atividades], ['Inscrições', resumo.total_inscricoes_confirmadas],
    ['Notícias', resumo.total_noticias], ['Itens de cardápio', resumo.total_itens_cardapio],
    ['Presenças', resumo.total_presencas],
  ] as const

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <a href="/api/export/inscricoes" className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">
          Exportar CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 text-center shadow ring-1 ring-slate-200">
            <div className="text-3xl font-bold text-brand">{value}</div>
            <div className="text-slate-600">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
          <h2 className="mb-3 text-xl font-semibold">Inscrições por semana</h2>
          <InscricoesChart pontos={semana.pontos} />
        </section>
        <section className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
          <h2 className="mb-3 text-xl font-semibold">Uso das funcionalidades</h2>
          <UsoChart itens={uso.itens} />
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Alertas de capacidade</h2>
        {alertas.alertas.length === 0 ? (
          <p className="text-slate-600">Nenhuma atividade acima de 90% da capacidade.</p>
        ) : (
          <ul className="space-y-2">
            {alertas.alertas.map((a) => (
              <li key={a.activity_id} className="rounded-lg bg-amber-50 p-3 text-amber-800">
                <strong>{a.titulo}</strong> — {a.inscritos}/{a.capacidade} ({a.percentual}%)
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
