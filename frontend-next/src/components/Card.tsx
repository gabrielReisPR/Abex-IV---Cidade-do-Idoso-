import type { ReactNode } from 'react'
import { resolveMediaUrl } from '@/lib/media'

export function Card({
  title,
  subtitle,
  imageUrl,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  imageUrl?: string | null
  icon?: string
  children?: ReactNode
}) {
  const src = resolveMediaUrl(imageUrl)
  return (
    <article
      className="overflow-hidden rounded-2xl bg-white transition-transform hover:-translate-y-1"
      style={{
        border: '1px solid var(--color-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {src && (
        <img src={src} alt="" className="h-40 w-full object-cover" />
      )}
      <div className="space-y-1 p-4">
        {/* Icon badge (green gradient circle) */}
        {icon && (
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white text-xl"
            style={{ background: 'linear-gradient(135deg, #00B931 0%, #01200F 100%)' }}
            aria-hidden="true"
          >
            <i className={`fas ${icon}`} />
          </div>
        )}
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ color: 'var(--color-muted)' }}>{subtitle}</p>
        )}
        {children}
      </div>
    </article>
  )
}
