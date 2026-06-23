export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return path.charAt(0) === '/' ? path : `/${path}`
}
