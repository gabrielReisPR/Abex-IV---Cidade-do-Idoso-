import type { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { apiJson } from '@/lib/api'
import type { UserPublic } from '@/lib/types'

export default async function FuncionarioLayout({ children }: { children: ReactNode }) {
  const me = await apiJson<UserPublic>('/users/me')
  const name = me.first_name || me.username
  return (
    <>
      <Header userName={name} variant="staff" />
      <main
        className="mx-auto max-w-6xl px-4 py-8 pb-28 min-h-screen"
        style={{ background: 'var(--color-bg-soft)' }}
      >
        {children}
      </main>
      <BottomNav variant="staff" />
    </>
  )
}
