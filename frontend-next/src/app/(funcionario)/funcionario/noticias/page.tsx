import { apiJson } from '@/lib/api'
import type { NoticiaOut } from '@/lib/types'
import { NoticiaAdmin } from './NoticiaAdmin'

export default async function FuncNoticiasPage() {
  const noticias = await apiJson<NoticiaOut[]>('/noticias')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--color-ink]">Gerenciar notícias</h1>
      <NoticiaAdmin noticias={noticias} />
    </div>
  )
}
