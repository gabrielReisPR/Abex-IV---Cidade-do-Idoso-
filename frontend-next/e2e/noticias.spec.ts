import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('noticias renders at least one card', async ({ page }) => {
  await page.goto('/noticias')
  await expect(page.getByRole('heading', { level: 1, name: /notícias/i })).toBeVisible()
  await expect(page.locator('[data-testid="noticia-card"]').first()).toBeVisible()
})
