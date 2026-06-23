import type { ReactNode } from 'react'
import { resolveMediaUrl } from '@/lib/media'

export function Card({ title, subtitle, imageUrl, children }: {
  title: string; subtitle?: string; imageUrl?: string | null; children?: ReactNode
}) {
  const src = resolveMediaUrl(imageUrl)
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
      {src && <img src={src} alt="" className="h-40 w-full object-cover" />}
      <div className="space-y-1 p-4">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-slate-600">{subtitle}</p>}
        {children}
      </div>
    </article>
  )
}
