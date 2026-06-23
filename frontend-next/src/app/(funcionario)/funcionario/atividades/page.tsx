import { apiJson } from '@/lib/api'
import type { AtividadeOut } from '@/lib/types'
import { AtividadeAdmin } from './AtividadeAdmin'

export default async function FuncAtividadesPage() {
  const { atividades } = await apiJson<{ atividades: AtividadeOut[] }>('/atividades/catalogo')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--color-ink]">Gerenciar atividades</h1>
      <AtividadeAdmin atividades={atividades} />
    </div>
  )
}
