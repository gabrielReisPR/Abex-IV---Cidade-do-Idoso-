import type { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { apiJson } from '@/lib/api'
import type { UserPublic } from '@/lib/types'

const ITEMS = [
  { href: '/painel', label: 'Painel' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/funcionario/atividades', label: 'Atividades' },
  { href: '/funcionario/cardapio', label: 'Cardápio' },
  { href: '/funcionario/noticias', label: 'Notícias' },
]

export default async function FuncionarioLayout({ children }: { children: ReactNode }) {
  const me = await apiJson<UserPublic>('/users/me')
  return (
    <>
      <Header userName={me.first_name || me.username} items={ITEMS} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  )
}
