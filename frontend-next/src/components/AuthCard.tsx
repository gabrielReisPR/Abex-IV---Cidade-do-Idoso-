import type { ReactNode } from 'react'

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#21422F' }}
    >
      <section className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Green gradient header band */}
        <div
          className="px-6 py-5 text-white text-center"
          style={{ background: 'linear-gradient(135deg, #00B931 0%, #01200F 100%)' }}
        >
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {/* Body */}
        <div className="p-6">{children}</div>
      </section>
    </main>
  )
}
