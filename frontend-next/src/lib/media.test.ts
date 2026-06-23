import { describe, it, expect } from 'vitest'
import { resolveMediaUrl } from '@/lib/media'

describe('resolveMediaUrl', () => {
  it('passes absolute urls through', () => {
    expect(resolveMediaUrl('https://x.test/a.png')).toBe('https://x.test/a.png')
  })
  it('returns relative uploads path unchanged (same-origin rewrite)', () => {
    expect(resolveMediaUrl('/uploads/news/a.png')).toBe('/uploads/news/a.png')
  })
  it('handles null/empty', () => {
    expect(resolveMediaUrl(null)).toBe('')
    expect(resolveMediaUrl(undefined)).toBe('')
  })
})
