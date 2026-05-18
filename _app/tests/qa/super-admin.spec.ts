/**
 * Testes E2E — Painel Super Admin
 * Framework: Playwright
 * Executar: npx playwright test tests/qa/super-admin.spec.ts
 *
 * Variáveis de ambiente necessárias:
 *   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
 *   LOJISTA_EMAIL, LOJISTA_PASSWORD
 *   BASE_URL (default: http://localhost:3000)
 */

import { test, expect, type Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const SUPER_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'francisco.efjr@gmail.com'
const SUPER_PASS = process.env.SUPER_ADMIN_PASSWORD ?? '123'
const LOJISTA_EMAIL = process.env.LOJISTA_EMAIL ?? 'teste@me.com'
const LOJISTA_PASS = process.env.LOJISTA_PASSWORD ?? '123'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/admin**`, { timeout: 10_000 })
}

async function loginAsSuperAdmin(page: Page) {
  await loginAs(page, SUPER_EMAIL, SUPER_PASS)
  await page.goto(`${BASE_URL}/admin/super`)
  await page.waitForLoadState('networkidle')
}

// ─── Grupo: Acesso e Autorização ──────────────────────────────────────────────

test.describe('Acesso ao Painel Super Admin', () => {
  test('CT-SA-014-A: Sem autenticação → redireciona para login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/super`)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('CT-SA-014-B: Lojista autenticado → redireciona para /admin', async ({ page }) => {
    await loginAs(page, LOJISTA_EMAIL, LOJISTA_PASS)
    await page.goto(`${BASE_URL}/admin/super`)
    await expect(page).toHaveURL(`${BASE_URL}/admin`)
    await expect(page).not.toHaveURL(/\/super/)
  })

  test('CT-SA-001: Super admin → painel carregado com KPIs', async ({ page }) => {
    await loginAsSuperAdmin(page)
    await expect(page).toHaveURL(/\/admin\/super/)
    await expect(page.getByText('Visão geral da plataforma')).toBeVisible()
    // 4 KPI blocks (rótulos do design entregue — Vitrine Virtual.html)
    await expect(page.getByText('Lojas ativas')).toBeVisible()
    await expect(page.getByText('Cabines')).toBeVisible()
  })
})

// ─── Grupo: API Endpoints (fetch direto) ──────────────────────────────────────

test.describe('API Super Admin — autorização', () => {
  test('CT-SA-014-C: GET /api/super-admin/lojas sem auth → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/super-admin/lojas`)
    expect(res.status()).toBe(401)
  })

  test('CT-SA-014-D: PATCH /api/super-admin/settings sem auth → 401', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/super-admin/settings`, {
      data: { try_on_enabled: true },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── Grupo: Lista de Lojas ────────────────────────────────────────────────────

test.describe('Lista de Lojas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page)
  })

  test('CT-SA-004: Lojas listadas com nome, badge e estatísticas', async ({ page }) => {
    const lojaCards = page.locator('[data-testid="loja-row"], .loja-row').first()
    // Pelo menos 1 loja visível
    await expect(page.getByText('peças').first()).toBeVisible()
    await expect(page.getByText('vendidas').first()).toBeVisible()
    // Coluna de modelo de imagem (renomeada no design entregue)
    await expect(page.getByText('Modelo IA').first()).toBeVisible()
  })

  test('CT-SA-005: Toggle de loja ativa/inativa dispara PATCH correto', async ({ page }) => {
    // Monitora network
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/super-admin/lojas/') && req.method() === 'PATCH'
    )

    // Clica no primeiro toggle de loja
    const firstToggle = page.locator('button[role="switch"]').first()
    const initialState = await firstToggle.getAttribute('aria-checked')
    await firstToggle.click()

    const request = await requestPromise
    const body = JSON.parse(request.postData() ?? '{}')

    // O body deve ter `ativa` como booleano
    expect(typeof body.ativa).toBe('boolean')
    // Deve ter invertido o estado
    expect(body.ativa).toBe(initialState !== 'true')
  })

  test('CT-SA-005-B: Toggle de loja — resposta bem-sucedida do servidor', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/super-admin/lojas/') && res.request().method() === 'PATCH'
    )

    await page.locator('button[role="switch"]').first().click()
    const response = await responsePromise

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok ?? body.id).toBeTruthy()
  })
})

// ─── Grupo: Kill Switch ───────────────────────────────────────────────────────

test.describe('Kill Switch Global', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page)
  })

  test('CT-SA-006: Kill switch visível com estado correto', async ({ page }) => {
    await expect(page.getByText('Kill switch — Cabine')).toBeVisible()
    // Badge ON ou OFF deve estar visível
    const badge = page.getByText(/^(ON|OFF)$/).first()
    await expect(badge).toBeVisible()
  })

  test('CT-SA-006-B: Toggle kill switch envia PATCH para settings', async ({ page }) => {
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/super-admin/settings') && req.method() === 'PATCH'
    )

    // Encontrar o toggle do kill switch (não o de loja)
    const killToggle = page.locator('[aria-label*="kill"], [aria-label*="Kill"]').first()
      ?? page.getByText('Kill switch — Cabine').locator('..').locator('button[role="switch"]')

    await killToggle.click()

    const request = await requestPromise
    const body = JSON.parse(request.postData() ?? '{}')
    expect(typeof body.try_on_enabled).toBe('boolean')
  })

  test('CT-SA-006-C: Kill switch salvo no servidor com sucesso', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/super-admin/settings') && res.request().method() === 'PATCH'
    )

    // Clicar no toggle do kill switch
    await page.getByText('Kill switch — Cabine')
      .locator('..')
      .locator('button[role="switch"]')
      .click()

    const response = await responsePromise
    expect(response.status()).toBe(200)

    // Clicar novamente para restaurar estado
    await page.getByText('Kill switch — Cabine')
      .locator('..')
      .locator('button[role="switch"]')
      .click()
  })
})

// ─── Grupo: Orçamento (Bug Documentado) ───────────────────────────────────────

test.describe('Orçamento Mensal — Bug conhecidos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page)
  })

  test('CT-SA-007: Campo de orçamento exibe valor do banco', async ({ page }) => {
    const budgetInput = page.locator('input[type="number"]').filter({ hasText: '' })
    // O input deve ter um valor numérico positivo
    const value = await page.locator('input[type="number"]').first().inputValue()
    expect(parseFloat(value)).toBeGreaterThan(0)
  })

  // Regressão de BUG-001/BUG-002 (corrigidos): o botão "Salvar" agora dispara
  // PATCH /api/super-admin/settings com o orçamento, e o backend persiste.
  test('CT-SA-007-FIX: Botão "Salvar" persiste o orçamento via PATCH', async ({ page }) => {
    const requestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/super-admin/settings') && req.method() === 'PATCH',
    )

    await page.locator('input[type="number"]').first().fill('999')
    await page.getByRole('button', { name: /salvar/i }).click()

    const request = await requestPromise
    const body = JSON.parse(request.postData() ?? '{}')
    expect(body.try_on_monthly_budget_usd).toBe(999)
  })
})

// ─── Grupo: Criação de Nova Loja ──────────────────────────────────────────────

test.describe('Criação de Nova Loja', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page)
  })

  test('CT-SA-008: Modal de criação abre ao clicar no botão', async ({ page }) => {
    await page.getByRole('button', { name: /nova loja/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel('Nome da loja')).toBeVisible()
    await expect(page.getByLabel('E-mail da lojista')).toBeVisible()
    await expect(page.getByLabel(/URL da vitrine/i)).toBeVisible()
  })

  test('CT-SA-008-B: Botão "Criar" desabilitado com campos vazios', async ({ page }) => {
    await page.getByRole('button', { name: /nova loja/i }).click()
    const createBtn = page.getByRole('button', { name: /criar loja/i })
    await expect(createBtn).toBeDisabled()
  })

  test('CT-SA-012: Slug auto-gerado a partir do nome', async ({ page }) => {
    await page.getByRole('button', { name: /nova loja/i }).click()
    const nomeInput = page.getByLabel('Nome da loja')
    const slugInput = page.getByLabel(/URL da vitrine/i)

    await nomeInput.fill('Atelier Laila')
    await expect(slugInput).toHaveValue('atelier-laila')

    await nomeInput.fill('Café & Moda')
    await expect(slugInput).toHaveValue('cafe-moda')
  })

  test('CT-SA-013: Fechar modal limpa o estado', async ({ page }) => {
    await page.getByRole('button', { name: /nova loja/i }).click()
    await page.getByLabel('Nome da loja').fill('Loja Temporária')

    // Fechar
    await page.getByRole('button', { name: /cancelar/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Reabrir — campo deve estar limpo
    await page.getByRole('button', { name: /nova loja/i }).click()
    await expect(page.getByLabel('Nome da loja')).toHaveValue('')
  })

  test('[BUG-003] CT-SA-009-BUG: E-mail do 5º usuário não detecta duplicata', async ({
    request,
    page,
  }) => {
    // Este teste documenta o BUG-003 via API direta
    // Como não temos cookie de auth no `request` fixture facilmente, este é um
    // placeholder para execução com storageState configurado
    test.skip(true, 'Requer storageState com sessão super admin — configure playwright.config.ts')
  })
})

// ─── Grupo: Bloqueio de API para não-super-admin ───────────────────────────────

test.describe('API Super Admin — lojista não autorizado', () => {
  let lojistaPage: Page

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    lojistaPage = await ctx.newPage()
    await loginAs(lojistaPage, LOJISTA_EMAIL, LOJISTA_PASS)
  })

  test('CT-SA-014-E: GET /api/super-admin/lojas → 403 para lojista', async () => {
    const response = await lojistaPage.request.get(`${BASE_URL}/api/super-admin/lojas`)
    expect(response.status()).toBe(403)
  })

  test('CT-SA-014-F: PATCH /api/super-admin/settings → 403 para lojista', async () => {
    const response = await lojistaPage.request.patch(`${BASE_URL}/api/super-admin/settings`, {
      data: { try_on_enabled: true },
    })
    expect(response.status()).toBe(403)
  })
})
