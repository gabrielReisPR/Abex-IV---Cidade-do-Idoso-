import { apiJson } from '@/lib/api'
import type { NoticiaOut } from '@/lib/types'
import { resolveMediaUrl } from '@/lib/media'
import { safeExternalUrl } from '@/lib/url'

export default async function NoticiasPage() {
  const noticias = await apiJson<NoticiaOut[]>('/noticias')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>Notícias</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {noticias.map((n) => {
          const img = resolveMediaUrl(n.imagem_url)
          const href = safeExternalUrl(n.fonte)
          return (
            <article
              key={n.id}
              data-testid="noticia-card"
              className="overflow-hidden rounded-2xl transition-transform hover:-translate-y-1"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              {img && <img src={img} alt="" className="h-44 w-full object-cover" />}
              <div className="space-y-2 p-5">
                <div
                  className="mb-2 flex h-10 w-10 items-center justify-center rounded-full text-white text-base"
                  style={{ background: 'linear-gradient(135deg, #00B931 0%, #01200F 100%)' }}
                  aria-hidden="true"
                >
                  <i className="fas fa-newspaper" />
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-ink)' }}>{n.titulo}</h2>
                <p style={{ color: 'var(--color-muted)' }}>{n.descricao}</p>
                {href
                  ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                      style={{ color: 'var(--color-brand)' }}
                    >
                      <i className="fas fa-external-link-alt text-sm" aria-hidden="true" />
                      Ler mais
                    </a>
                  )
                  : n.fonte
                    ? <span style={{ color: 'var(--color-muted)' }}>{n.fonte}</span>
                    : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
