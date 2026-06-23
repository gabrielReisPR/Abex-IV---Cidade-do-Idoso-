import { apiJson } from '@/lib/api'
import type { CardapioItemOut } from '@/lib/types'
import { CardapioAdmin } from './CardapioAdmin'

export default async function FuncCardapioPage() {
  const { itens } = await apiJson<{ itens: CardapioItemOut[] }>('/cardapio/')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--color-ink]">Gerenciar cardápio</h1>
      <CardapioAdmin itens={itens} />
    </div>
  )
}
