'use client'
import { useEffect, useRef, useState } from 'react'

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function AccessibilityWidget({
  initialZoom = 0,
  initialContrast = false,
}: {
  initialZoom?: number
  initialContrast?: boolean
}) {
  const [zoom, setZoom] = useState(initialZoom)
  const [contrast, setContrast] = useState(initialContrast)
  const firstRun = useRef(true)

  useEffect(() => {
    // The server already applied the classes on <html> for the initial
    // values (no-FOUC); only react to user-driven changes after mount.
    if (firstRun.current) {
      firstRun.current = false
      return
    }
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
