/** Returns the URL only if it uses a safe external scheme (http/https).
 *  Prevents javascript:/data:/vbscript: URLs from becoming clickable (XSS). */
export function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return null
}
