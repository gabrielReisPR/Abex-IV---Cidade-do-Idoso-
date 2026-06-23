'use client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  async function onClick() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white
                 bg-white/20 border border-white/40 hover:bg-white/30 transition-colors"
    >
      <i className="fas fa-sign-out-alt" aria-hidden="true" />
      <span className="hidden sm:inline">Sair</span>
    </button>
  )
}
