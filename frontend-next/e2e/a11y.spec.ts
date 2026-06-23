import { test, expect } from '@playwright/test'

test('accessibility bar is present on the login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('#a11y-bar')).toBeVisible()
})

test('increasing font adds a zoom class on <html>', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Aumentar fonte' }).click()
  await expect(page.locator('html')).toHaveClass(/a11y-zoom-1/)
})

test('contrast toggle adds high-contrast class and persists', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Alternar alto contraste' }).click()
  await expect(page.locator('html')).toHaveClass(/high-contrast/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/high-contrast/)
})

test('login form controls have labels (a11y)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/senha/i)).toBeVisible()
})
