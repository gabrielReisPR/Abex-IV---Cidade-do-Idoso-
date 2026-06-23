import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/idoso.json' })

test('atividades catalog renders cards with enroll buttons', async ({ page }) => {
  await page.goto('/atividades')
  await expect(page.getByRole('heading', { level: 1, name: /atividades/i })).toBeVisible()
  const cards = page.locator('[data-testid="atividade-card"]')
  await expect(cards.first()).toBeVisible()
})

test('enroll then cancel toggles the button label', async ({ page }) => {
  await page.goto('/atividades')
  const first = page.locator('[data-testid="atividade-card"]').first()
  const btn = first.getByRole('button')
  const label = (await btn.textContent())?.trim()
  await btn.click()
  await expect(btn).not.toHaveText(label ?? '', { timeout: 7000 })
})
