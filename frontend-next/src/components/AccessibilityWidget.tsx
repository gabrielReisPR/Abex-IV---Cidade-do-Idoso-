'use client'
import { useEffect, useState } from 'react'

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function AccessibilityWidget() {
  const [zoom, setZoom] = useState(0)
  const [contrast, setContrast] = useState(false)

  useEffect(() => {
    const raw = readCookie('a11y')
    if (raw) {
      try {
        const v = JSON.parse(raw) as { zoom?: number; contrast?: number }
        setZoom(v.zoom ?? 0)
        setContrast(Boolean(v.contrast))
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('a11y-zoom-1', zoom === 1)
    html.classList.toggle('a11y-zoom-2', zoom >= 2)
    html.classList.toggle('high-contrast', contrast)
    writeCookie('a11y', JSON.stringify({ zoom, contrast: contrast ? 1 : 0 }))
  }, [zoom, contrast])

  return (
    <div id="a11y-bar"
      className="fixed bottom-4 right-4 z-50 flex gap-2 rounded-full bg-white/95 p-2 shadow-lg ring-1 ring-slate-200"
      role="group" aria-label="Acessibilidade">
      <button type="button" aria-label="Diminuir fonte" onClick={() => setZoom((z) => Math.max(0, z - 1))}
        className="h-11 w-11 rounded-full bg-slate-100 text-lg font-bold">A−</button>
      <button type="button" aria-label="Aumentar fonte" onClick={() => setZoom((z) => Math.min(2, z + 1))}
        className="h-11 w-11 rounded-full bg-slate-100 text-lg font-bold">A+</button>
      <button type="button" aria-label="Alternar alto contraste" aria-pressed={contrast}
        onClick={() => setContrast((c) => !c)}
        className="h-11 w-11 rounded-full bg-slate-800 text-lg font-bold text-white">◐</button>
    </div>
  )
}
