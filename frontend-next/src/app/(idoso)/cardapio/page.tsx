import { apiJson } from '@/lib/api'
import type { CardapioItemOut } from '@/lib/types'
import { Card } from '@/components/Card'

export default async function CardapioPage() {
  const { itens } = await apiJson<{ itens: CardapioItemOut[] }>('/cardapio/')
  const byDay = new Map<string, CardapioItemOut[]>()
  for (const it of itens) {
    if (!byDay.has(it.dia)) byDay.set(it.dia, [])
    byDay.get(it.dia)!.push(it)
  }
  return (
    <div className="space-y-8" data-testid="cardapio-grid">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>Cardápio</h1>
      {itens.length === 0 && (
        <p style={{ color: 'var(--color-muted)' }}>Cardápio ainda não publicado.</p>
      )}
      {[...byDay.entries()].map(([dia, items]) => (
        <section key={dia}>
          <h2
            className="mb-4 flex items-center gap-2 text-2xl font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            <i className="fas fa-utensils text-[--color-brand]" aria-hidden="true" />
            {dia}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <Card key={it.id} title={`${it.refeicao}: ${it.titulo}`} subtitle={it.descricao} imageUrl={it.imagem_url} icon="fa-utensils" />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
