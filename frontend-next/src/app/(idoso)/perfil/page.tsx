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
      <div
        className="rounded-2xl p-6 text-white flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #01200F 0%, #00B931 100%)' }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl"
          style={{ background: 'linear-gradient(135deg, #00B931 0%, #01200F 100%)' }}
          aria-hidden="true"
        >
          <i className="fas fa-user" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meu perfil</h1>
          <p className="mt-1 opacity-85 text-base">{me.username} • {me.email}</p>
        </div>
      </div>
      <PerfilForm initial={initial} />
    </div>
  )
}
