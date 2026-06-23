'use client'
import { useRouter } from 'next/navigation'
export function LogoutButton() {
  const router = useRouter()
  async function onClick() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }
  return (
    <button onClick={onClick} className="rounded-lg bg-slate-100 px-4 py-2 font-semibold">
      Sair
    </button>
  )
}
