import { apiJson } from '@/lib/api'
import type { HomeResumo } from '@/lib/types'
import { Card } from '@/components/Card'

export default async function HomePage() {
  const data = await apiJson<HomeResumo>('/home/resumo')
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Início</h1>

      <section data-testid="home-atividades">
        <h2 className="mb-3 text-2xl font-semibold">Próximas atividades</h2>
        {data.atividades.length === 0 ? (
          <p className="text-slate-600">Nenhuma atividade no momento.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.atividades.map((a) => (
              <Card key={a.id} title={a.titulo} subtitle={`${a.data} • ${a.hora}`} imageUrl={a.imagem_url} />
            ))}
          </div>
        )}
      </section>

      <section data-testid="home-noticias">
        <h2 className="mb-3 text-2xl font-semibold">Últimas notícias</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.noticias.map((n) => (
            <Card key={n.id} title={n.titulo} subtitle={n.descricao} imageUrl={n.imagem_url} />
          ))}
        </div>
      </section>

      <section data-testid="home-cardapio">
        <h2 className="mb-3 text-2xl font-semibold">Cardápio</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.cardapio.map((c) => (
            <Card key={c.id} title={c.titulo} subtitle={`${c.dia} • ${c.refeicao}`} />
          ))}
        </div>
      </section>
    </div>
  )
}
