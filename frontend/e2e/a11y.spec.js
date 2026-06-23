// 8 casos de teste de acessibilidade automatizados (WCAG AA) — Sprint 5.
// Cobrem o widget de acessibilidade (fonte/contraste), persistência,
// navegação por teclado e atributos ARIA obrigatórios.
const { test, expect } = require('@playwright/test');

test.describe('Acessibilidade (WCAG AA)', () => {
  test('1. barra de acessibilidade visível com 3 controles', async ({ page }) => {
    await page.goto('/cardapio.html');
    const bar = page.locator('#a11y-bar');
    await expect(bar).toBeVisible();
    await expect(bar.locator('button')).toHaveCount(3);
  });

  test('2. A+ aumenta o tamanho (zoom) da página em 2 níveis', async ({ page }) => {
    await page.goto('/cardapio.html');
    const inc = page.locator('#a11y-bar [data-act="inc"]');
    await inc.click();
    await expect(page.locator('html')).toHaveClass(/a11y-zoom-1/);
    await inc.click();
    await expect(page.locator('html')).toHaveClass(/a11y-zoom-2/);
  });

  test('3. A- reduz o tamanho do texto', async ({ page }) => {
    await page.goto('/cardapio.html');
    await page.locator('#a11y-bar [data-act="inc"]').click();
    await page.locator('#a11y-bar [data-act="dec"]').click();
    await expect(page.locator('html')).not.toHaveClass(/a11y-zoom-1/);
  });

  test('4. alto contraste alterna a classe e o aria-pressed', async ({ page }) => {
    await page.goto('/cardapio.html');
    const btn = page.locator('#a11y-bar [data-act="contrast"]');
    await btn.click();
    await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  test('5. preferências de acessibilidade persistem após recarregar', async ({ page }) => {
    await page.goto('/cardapio.html');
    await page.locator('#a11y-bar [data-act="inc"]').click();
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/a11y-zoom-1/);
  });

  test('6. navegação inferior possui rótulo acessível (aria-label)', async ({ page }) => {
    await page.goto('/cardapio.html');
    const navComLabel = page.locator('nav[aria-label]');
    await expect(navComLabel.first()).toBeVisible();
  });

  test('7. campos de formulário têm rótulos associados', async ({ page }) => {
    await page.goto('/redefinir-senha.html?token=teste-e2e');
    const inputs = page.locator('input:visible');
    const total = await inputs.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i++) {
      const el = inputs.nth(i);
      const id = await el.getAttribute('id');
      const aria = await el.getAttribute('aria-label');
      const labelledby = await el.getAttribute('aria-labelledby');
      const hasFor = id
        ? await page.locator(`label[for="${id}"]`).count()
        : 0;
      expect(Boolean(hasFor) || Boolean(aria) || Boolean(labelledby)).toBeTruthy();
    }
  });

  test('8. controles de acessibilidade acionáveis por teclado', async ({ page }) => {
    await page.goto('/cardapio.html');
    const inc = page.locator('#a11y-bar [data-act="inc"]');
    await inc.focus();
    await expect(inc).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveClass(/a11y-zoom-1/);
  });
});
