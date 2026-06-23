// Fluxos principais do idoso (Sprint 5): login, cardápio, notícias e
// catálogo/inscrição em atividades. Roda contra a stack Docker.
const { test, expect } = require('@playwright/test');

let seq = 0;
function uniqueUser() {
  seq += 1;
  const tag = `${Date.now()}${seq}`;
  return {
    username: `e2e${tag}`,
    email: `e2e${tag}@test.com`,
    password: 'senha1234',
  };
}

async function registrarUsuario(request, user) {
  const res = await request.post('/api/users/', { data: user });
  expect(res.ok(), 'cadastro de usuário deve funcionar').toBeTruthy();
}

async function loginUI(page, user) {
  await page.goto('/login.html');
  await page.fill('#cpfUsuario', user.email);
  await page.fill('#senha', user.password);
  await page.click('#submit-btn');
}

test('login pela UI leva o idoso à home', async ({ page, request }) => {
  const user = uniqueUser();
  await registrarUsuario(request, user);
  await loginUI(page, user);
  await page.waitForURL('**/home.html', { timeout: 15_000 });
  expect(page.url()).toContain('home.html');
  // token persistido (refresh incluso)
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const refresh = await page.evaluate(() =>
    localStorage.getItem('refresh_token')
  );
  expect(token).toBeTruthy();
  expect(refresh).toBeTruthy();
});

test('cardápio exibe itens da semana', async ({ page }) => {
  await page.goto('/cardapio.html');
  await expect(page.locator('body')).toContainText(
    /Almoço|Jantar|Caf[ée]|Segunda/i,
    { timeout: 15_000 }
  );
});

test('notícias exibe a lista', async ({ page }) => {
  await page.goto('/noticias.html');
  await expect(page.locator('body')).toContainText(
    /Chapecó|Prefeitura|not[íi]cia/i,
    { timeout: 15_000 }
  );
});

test('catálogo de atividades renderiza para o idoso logado', async ({
  page,
  request,
}) => {
  const user = uniqueUser();
  await registrarUsuario(request, user);
  await loginUI(page, user);
  await page.waitForURL('**/home.html', { timeout: 15_000 });
  await page.goto('/atividades.html');
  await expect(page.locator('body')).toContainText(
    /Yoga|Nata[çc][ãa]o|atividade|Inscrever/i,
    { timeout: 15_000 }
  );
});
