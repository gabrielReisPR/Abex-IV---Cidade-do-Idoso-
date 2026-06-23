import Link from 'next/link'
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <Link href="/home" className="text-sky-700 underline">Voltar ao início</Link>
    </main>
  )
}
