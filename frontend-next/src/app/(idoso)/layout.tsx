import type { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { apiJson } from '@/lib/api'
import type { UserPublic } from '@/lib/types'

const ITEMS = [
  { href: '/home', label: 'Início' },
  { href: '/atividades', label: 'Atividades' },
  { href: '/cardapio', label: 'Cardápio' },
  { href: '/noticias', label: 'Notícias' },
  { href: '/perfil', label: 'Perfil' },
]

export default async function IdosoLayout({ children }: { children: ReactNode }) {
  const me = await apiJson<UserPublic>('/users/me')
  return (
    <>
      <Header userName={me.first_name || me.username} items={ITEMS} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  )
}
