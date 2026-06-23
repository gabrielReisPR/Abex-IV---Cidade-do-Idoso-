import './globals.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { AccessibilityWidget } from '@/components/AccessibilityWidget'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

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
      <head>
      </head>
      <body className={inter.className}>
        {children}
        <AccessibilityWidget initialZoom={zoom} initialContrast={contrast} />
      </body>
    </html>
  )
}
