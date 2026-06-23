import { apiJson } from '@/lib/api'
import type { NoticiaOut } from '@/lib/types'
import { resolveMediaUrl } from '@/lib/media'
import { safeExternalUrl } from '@/lib/url'

export default async function NoticiasPage() {
  const noticias = await apiJson<NoticiaOut[]>('/noticias')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notícias</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {noticias.map((n) => {
          const img = resolveMediaUrl(n.imagem_url)
          const href = safeExternalUrl(n.fonte)
          return (
            <article key={n.id} data-testid="noticia-card"
              className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
              {img && <img src={img} alt="" className="h-44 w-full object-cover" />}
              <div className="space-y-2 p-4">
                <h2 className="text-xl font-bold">{n.titulo}</h2>
                <p className="text-slate-700">{n.descricao}</p>
                {href
                  ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                      Ler mais
                    </a>
                  )
                  : n.fonte
                    ? <span className="text-slate-500">{n.fonte}</span>
                    : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
