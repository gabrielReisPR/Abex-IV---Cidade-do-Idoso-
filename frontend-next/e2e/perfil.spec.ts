import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('perfil saves first name and confirms', async ({ page }) => {
  await page.goto('/perfil')
  await page.getByLabel(/nome/i).first().fill('Maria Teste')
  await page.getByRole('button', { name: /salvar/i }).click()
  await expect(page.getByRole('status')).toBeVisible()
})
