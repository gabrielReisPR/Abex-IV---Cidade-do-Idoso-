import { apiJson } from '@/lib/api'
import type { HomeResumo } from '@/lib/types'
import { Card } from '@/components/Card'

export default async function HomePage() {
  const data = await apiJson<HomeResumo>('/home/resumo')
  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 text-white flex items-center gap-5"
        style={{ background: 'linear-gradient(135deg, #01200F 0%, #00B931 100%)' }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl"
          style={{ background: 'linear-gradient(135deg, #00B931 0%, #01200F 100%)' }}
          aria-hidden="true"
        >
          <i className="fas fa-heart" />
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">Início</h1>
          <p className="mt-1 text-lg opacity-90">
            Bem-vindo ao Portal Cidade do Idoso — seu espaço de saúde, cultura e convivência.
          </p>
        </div>
      </div>

      <section data-testid="home-atividades">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          <i className="fas fa-calendar-check text-[--color-brand]" aria-hidden="true" />
          Próximas atividades
        </h2>
        {data.atividades.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>Nenhuma atividade no momento.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.atividades.map((a) => (
              <Card key={a.id} title={a.titulo} subtitle={`${a.data} • ${a.hora}`} imageUrl={a.imagem_url} icon="fa-calendar-check" />
            ))}
          </div>
        )}
      </section>

      <section data-testid="home-noticias">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          <i className="fas fa-newspaper text-[--color-brand]" aria-hidden="true" />
          Últimas notícias
        </h2>
        {data.noticias.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>Nenhuma notícia no momento.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.noticias.map((n) => (
              <Card key={n.id} title={n.titulo} subtitle={n.descricao} imageUrl={n.imagem_url} icon="fa-newspaper" />
            ))}
          </div>
        )}
      </section>

      <section data-testid="home-cardapio">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          <i className="fas fa-utensils text-[--color-brand]" aria-hidden="true" />
          Cardápio
        </h2>
        {data.cardapio.length === 0 ? (
          <p style={{ color: 'var(--color-muted)' }}>Cardápio ainda não disponível.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.cardapio.map((c) => (
              <Card key={c.id} title={c.titulo} subtitle={`${c.dia} • ${c.refeicao}`} icon="fa-utensils" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
