'use client'
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Algo deu errado</h1>
      <button onClick={reset} className="rounded bg-sky-600 px-4 py-2 text-white">Tentar novamente</button>
    </main>
  )
}
