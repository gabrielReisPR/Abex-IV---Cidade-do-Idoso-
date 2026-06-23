import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('home shows the three sections', async ({ page }) => {
  await page.goto('/home')
  await expect(page.getByRole('heading', { level: 1, name: /início/i })).toBeVisible()
  await expect(page.getByTestId('home-atividades')).toBeVisible()
  await expect(page.getByTestId('home-noticias')).toBeVisible()
  await expect(page.getByTestId('home-cardapio')).toBeVisible()
})
