import { test as setup, expect } from '@playwright/test'

const IDOSO_FILE = 'e2e/.auth/idoso.json'
const STAFF_FILE = 'e2e/.auth/staff.json'

setup('authenticate idoso', async ({ page, request }) => {
  const email = `idoso_e2e_${Date.now()}@mailinator.com`
  await request.post('/api/users', {
    data: { username: email.split('@')[0], email, password: 'senha123', first_name: 'Idoso' },
  })
  await page.goto('/login')
  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill('senha123')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('**/home')
  await page.context().storageState({ path: IDOSO_FILE })
})

setup('authenticate staff', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('mode-funcionario').click()
  await page.getByLabel(/e-mail/i).fill(process.env.E2E_STAFF_EMAIL ?? 'gestora@cidadeidoso.com')
  await page.getByLabel(/senha/i).fill(process.env.E2E_STAFF_PASSWORD ?? 'Gestora@123')
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('**/painel')
  await page.context().storageState({ path: STAFF_FILE })
})
