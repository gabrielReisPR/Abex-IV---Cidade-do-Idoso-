import { apiJson } from '@/lib/api'
import type { UserPublic } from '@/lib/types'
import { PerfilForm, } from './PerfilForm'
import type { PerfilInput } from './actions'

export default async function PerfilPage() {
  const me = await apiJson<UserPublic>('/users/me')
  const initial: PerfilInput = {
    first_name: me.first_name ?? '', last_name: me.last_name ?? '', phone: me.phone ?? '',
    address: me.address ?? '', city: me.city ?? '', state: me.state ?? '',
    zip_code: me.zip_code ?? '', gender: me.gender ?? '', birth_date: me.birth_date ?? '',
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meu perfil</h1>
      <p className="text-slate-600">{me.username} • {me.email}</p>
      <PerfilForm initial={initial} />
    </div>
  )
}
