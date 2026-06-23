import './globals.css'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { AccessibilityWidget } from '@/components/AccessibilityWidget'

export const metadata = { title: 'Portal Cidade do Idoso' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  let cls = ''
  const raw = jar.get('a11y')?.value
  if (raw) {
    try {
      const v = JSON.parse(raw) as { zoom?: number; contrast?: number }
      if (v.zoom === 1) cls += ' a11y-zoom-1'
      if ((v.zoom ?? 0) >= 2) cls += ' a11y-zoom-2'
      if (v.contrast) cls += ' high-contrast'
    } catch { /* ignore */ }
  }
  return (
    <html lang="pt-BR" className={cls.trim()}>
      <body>
        {children}
        <AccessibilityWidget />
      </body>
    </html>
  )
}
