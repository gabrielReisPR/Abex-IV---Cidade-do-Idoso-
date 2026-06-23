import { describe, it, expect } from 'vitest'
import { safeExternalUrl } from '@/lib/url'

describe('safeExternalUrl', () => {
  it('allows http and https', () => {
    expect(safeExternalUrl('https://x.test/a')).toBe('https://x.test/a')
    expect(safeExternalUrl('http://x.test')).toBe('http://x.test')
  })
  it('rejects javascript: and data: and other schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('  javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('JavaScript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,<script>1</script>')).toBeNull()
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull()
  })
  it('handles null/undefined/empty', () => {
    expect(safeExternalUrl(null)).toBeNull()
    expect(safeExternalUrl(undefined)).toBeNull()
    expect(safeExternalUrl('')).toBeNull()
  })
})
