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

test('cadastro creates account and returns to login', async ({ page }) => {
  const email = `e2e_${Date.now()}@mailinator.com`
  await page.goto('/cadastro')
  await page.getByLabel(/nome de usuário/i).fill(`e2e_${Date.now()}`)
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill('senha123')
  await page.getByRole('button', { name: /cadastrar/i }).click()
  await expect(page.getByRole('status')).toContainText(/sucesso|criada/i)
})

test('esqueci-senha shows a confirmation for unknown email path', async ({ page }) => {
  await page.goto('/esqueci-senha')
  await page.getByLabel(/e-mail/i).fill('whoever@example.com')
  await page.getByRole('button', { name: /enviar link/i }).click()
  await expect(page.locator('[role="status"], [role="alert"]')).toBeVisible()
})

test('redefinir-senha.html redirects to /redefinir-senha keeping token', async ({ page }) => {
  await page.goto('/redefinir-senha.html?token=abc123')
  await expect(page).toHaveURL(/\/redefinir-senha\?token=abc123/)
  await expect(page.getByLabel(/nova senha/i)).toBeVisible()
})
