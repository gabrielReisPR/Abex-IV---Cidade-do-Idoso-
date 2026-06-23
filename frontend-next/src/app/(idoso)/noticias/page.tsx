import { apiJson } from '@/lib/api'
import type { NoticiaOut } from '@/lib/types'
import { resolveMediaUrl } from '@/lib/media'

export default async function NoticiasPage() {
  const noticias = await apiJson<NoticiaOut[]>('/noticias')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notícias</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {noticias.map((n) => {
          const img = resolveMediaUrl(n.imagem_url)
          return (
            <article key={n.id} data-testid="noticia-card"
              className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
              {img && <img src={img} alt="" className="h-44 w-full object-cover" />}
              <div className="space-y-2 p-4">
                <h2 className="text-xl font-bold">{n.titulo}</h2>
                <p className="text-slate-700">{n.descricao}</p>
                <a href={n.fonte} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                  Ler mais
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
