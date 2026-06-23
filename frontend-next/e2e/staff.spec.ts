import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/staff.json' })

test('staff hub shows quick links', async ({ page }) => {
  await page.goto('/painel')
  await expect(page.getByRole('heading', { level: 1, name: /painel/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
})
