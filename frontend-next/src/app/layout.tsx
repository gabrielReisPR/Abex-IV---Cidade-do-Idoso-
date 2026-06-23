import './globals.css'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { AccessibilityWidget } from '@/components/AccessibilityWidget'

export const metadata = { title: 'Portal Cidade do Idoso' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  let zoom = 0
  let contrast = false
  const raw = jar.get('a11y')?.value
  if (raw) {
    try {
      const v = JSON.parse(raw) as { zoom?: number; contrast?: number }
      zoom = v.zoom ?? 0
      contrast = Boolean(v.contrast)
    } catch { /* ignore */ }
  }
  let cls = ''
  if (zoom === 1) cls += ' a11y-zoom-1'
  if (zoom >= 2) cls += ' a11y-zoom-2'
  if (contrast) cls += ' high-contrast'

  return (
    <html lang="pt-BR" className={cls.trim()}>
      <body>
        {children}
        <AccessibilityWidget initialZoom={zoom} initialContrast={contrast} />
      </body>
    </html>
  )
}
