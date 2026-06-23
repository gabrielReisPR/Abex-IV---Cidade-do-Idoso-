import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('cardapio renders heading and grid', async ({ page }) => {
  await page.goto('/cardapio')
  await expect(page.getByRole('heading', { level: 1, name: /cardápio/i })).toBeVisible()
  await expect(page.getByTestId('cardapio-grid')).toBeVisible()
})
