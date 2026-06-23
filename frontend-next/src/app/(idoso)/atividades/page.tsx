import { apiJson } from '@/lib/api'
import type { AtividadeOut, InscricaoOut } from '@/lib/types'
import { Card } from '@/components/Card'
import { EnrollButton } from './EnrollButton'

export default async function AtividadesPage() {
  const [catalogo, minhas] = await Promise.all([
    apiJson<{ atividades: AtividadeOut[] }>('/atividades/catalogo'),
    apiJson<{ inscricoes: InscricaoOut[] }>('/atividades/minhas-inscricoes'),
  ])
  const enrolledByActivity = new Map<number, number>() // activityId -> inscricaoId
  for (const i of minhas.inscricoes) {
    if (i.status === 'confirmado') enrolledByActivity.set(i.atividade.id, i.id)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Atividades</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalogo.atividades.map((a) => {
          const inscricaoId = enrolledByActivity.get(a.id) ?? null
          const full = a.vagas_disponiveis === 0
          const vagasTxt = a.vagas == null ? 'Vagas livres'
            : `${a.inscritos ?? 0}/${a.vagas} inscritos`
          return (
            <div key={a.id} data-testid="atividade-card">
              <Card title={a.titulo} subtitle={`${a.data} • ${a.hora}`} imageUrl={a.imagem_url}>
                <p className="text-sm text-slate-500">{vagasTxt}</p>
                <div className="mt-2">
                  <EnrollButton activityId={a.id} inscricaoId={inscricaoId} full={full} />
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
