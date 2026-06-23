import { test, expect } from '@playwright/test'

test('login page renders with accessible form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/senha/i)).toBeVisible()
  await expect(page.getByTestId('mode-idoso')).toHaveAttribute('aria-pressed', 'true')
})

test('invalid login shows an alert', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/e-mail/i).fill('nobody@example.com')
  await page.getByLabel(/senha/i).fill('wrongpass')
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})
