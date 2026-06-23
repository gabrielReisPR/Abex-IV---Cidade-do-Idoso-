import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/staff.json' })

test('staff hub shows quick links', async ({ page }) => {
  await page.goto('/painel')
  await expect(page.getByRole('heading', { level: 1, name: /painel/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
})

test('dashboard renders charts canvas and export link', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(2)
  await expect(page.getByRole('link', { name: /exportar csv/i })).toBeVisible()
})

test('staff can create an activity', async ({ page }) => {
  await page.goto('/funcionario/atividades')
  const titulo = `Aula Teste ${Date.now()}`
  await page.getByLabel(/título/i).fill(titulo)
  await page.getByLabel(/hora/i).fill('14:00')
  await page.getByLabel(/data/i).fill('Segunda-feira')
  await page.getByRole('button', { name: /criar atividade/i }).click()
  await expect(page.getByText(titulo)).toBeVisible({ timeout: 7000 })
})

test('staff can create a menu item', async ({ page }) => {
  await page.goto('/funcionario/cardapio')
  const titulo = `Sopa ${Date.now()}`
  await page.getByLabel(/^dia$/i).fill('Segunda-feira')
  await page.getByLabel(/ordem do dia/i).fill('1')
  await page.getByLabel(/ordem da refeição/i).fill('1')
  await page.getByLabel(/refeição/i).fill('Almoço')
  await page.getByLabel(/título/i).fill(titulo)
  await page.getByRole('button', { name: /adicionar item/i }).click()
  await expect(page.getByText(titulo)).toBeVisible({ timeout: 7000 })
})
