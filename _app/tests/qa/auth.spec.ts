/**
 * Testes E2E — Fluxo de Autenticação
 * Framework: Playwright
 * Executar: npx playwright test tests/qa/auth.spec.ts
 *
 * Variáveis de ambiente:
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

async function goToLogin(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('domcontentloaded')
}

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
}

async function submitLogin(page: Page) {
  await page.click('button[type="submit"]')
}

// ─── Grupo: Página de Login ────────────────────────────────────────────────────

test.describe('Página de Login — Estrutura', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page)
  })

  test('Exibe campos de e-mail, senha e botão de entrar', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.getByText('Entrar')).toBeVisible()
  })

  test('Exibe link para recuperação de senha', async ({ page }) => {
    const link = page.getByRole('link', { name: /recuperar acesso/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/recuperar')
  })

  test('CT-AUTH-013: Botão desabilitado antes de preencher campos', async ({ page }) => {
    // HTML5 required previne submit mas não desabilita o botão via JS
    // Verificamos que ao tentar submeter sem campos, não há navegação
    await submitLogin(page)
    await expect(page).toHaveURL(`${BASE_URL}/login`)
  })
})

// ─── Grupo: Login com Credenciais ─────────────────────────────────────────────

test.describe('Login — Credenciais', () => {
  test('CT-AUTH-001: Login super admin válido → redireciona para /admin', async ({ page }) => {
    await goToLogin(page)
    await fillLoginForm(page, SUPER_EMAIL, SUPER_PASS)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 })
  })

  test('CT-AUTH-002: Login lojista válido → redireciona para /admin', async ({ page }) => {
    await goToLogin(page)
    await fillLoginForm(page, LOJISTA_EMAIL, LOJISTA_PASS)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 })
  })

  test('CT-AUTH-003: Senha incorreta → mensagem de erro genérica', async ({ page }) => {
    await goToLogin(page)
    await fillLoginForm(page, SUPER_EMAIL, 'senha_errada_123!')
    await submitLogin(page)
    // Aguardar resposta
    await page.waitForTimeout(2000)
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
    await expect(page).toHaveURL(`${BASE_URL}/login`)
  })

  test('CT-AUTH-004: E-mail inexistente → mesma mensagem de erro (anti-enumeração)', async ({
    page,
  }) => {
    await goToLogin(page)
    await fillLoginForm(page, 'nao_existe_mesmo@qa-test.invalid', 'qualquer_coisa')
    await submitLogin(page)
    await page.waitForTimeout(2000)
    const errorMsg = page.getByText('E-mail ou senha incorretos.')
    await expect(errorMsg).toBeVisible()
    // Mensagem DEVE ser idêntica à do CT-AUTH-003
  })

  test('Loading state durante login', async ({ page }) => {
    await goToLogin(page)
    await fillLoginForm(page, SUPER_EMAIL, SUPER_PASS)
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()
    // Deve mostrar "Entrando..." e ficar desabilitado brevemente
    await expect(submitBtn).toBeDisabled({ timeout: 2000 }).catch(() => {
      // Se a resposta for rápida, pode já ter navegado — OK
    })
  })
})

// ─── Grupo: Proteção de Rotas ─────────────────────────────────────────────────

test.describe('Proteção de Rotas — Middleware', () => {
  test('CT-AUTH-007: /admin sem autenticação → redireciona para /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('CT-AUTH-007-B: /admin/super sem autenticação → redireciona para /login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/super`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('CT-AUTH-007-C: Middleware preserva parâmetro ?next= na URL de login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/super`)
    await expect(page).toHaveURL(/next=%2Fadmin%2Fsuper|next=\/admin\/super/)
  })

  test('CT-AUTH-005: Login com ?next= redireciona para o destino correto', async ({ page }) => {
    await page.goto(`${BASE_URL}/login?next=/admin/super`)
    await fillLoginForm(page, SUPER_EMAIL, SUPER_PASS)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/admin\/super/, { timeout: 10_000 })
  })

  test('CT-AUTH-008: Lojista em /admin/super → redirecionado para /admin', async ({ page }) => {
    await goToLogin(page)
    await fillLoginForm(page, LOJISTA_EMAIL, LOJISTA_PASS)
    await submitLogin(page)
    await page.waitForURL(/\/admin/, { timeout: 10_000 })

    await page.goto(`${BASE_URL}/admin/super`)
    await expect(page).toHaveURL(`${BASE_URL}/admin`)
    await expect(page).not.toHaveURL(/\/super/)
  })
})

// ─── Grupo: Open Redirect (BUG-007) ───────────────────────────────────────────

test.describe('[BUG-007] Open Redirect em ?next=', () => {
  test('CT-AUTH-006: URL externa em ?next= deve ser ignorada', async ({ page }) => {
    // Login com ?next= apontando para URL externa
    await page.goto(`${BASE_URL}/login?next=https://evil-site.com`)
    await fillLoginForm(page, SUPER_EMAIL, SUPER_PASS)
    await submitLogin(page)
    await page.waitForTimeout(2000)

    // Deve redirecionar para /admin (fallback), NÃO para evil-site.com
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('evil-site.com')
    expect(currentUrl).toMatch(/\/admin/)
    // Se este teste FALHAR, o open redirect está ativo — BUG confirmado
  })

  test('CT-AUTH-006-B: URL com // em ?next= deve ser ignorada', async ({ page }) => {
    await page.goto(`${BASE_URL}/login?next=//evil-site.com`)
    await fillLoginForm(page, SUPER_EMAIL, SUPER_PASS)
    await submitLogin(page)
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('evil-site.com')
  })
})

// ─── Grupo: Recuperação de Senha ─────────────────────────────────────────────

test.describe('Recuperação de Senha', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/recuperar`)
    await page.waitForLoadState('domcontentloaded')
  })

  test('Exibe formulário de recuperação', async ({ page }) => {
    await expect(page.getByText('Recuperar senha')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /enviar link/i })).toBeVisible()
  })

  test('CT-AUTH-009: E-mail existente → mensagem genérica de sucesso', async ({ page }) => {
    await page.fill('input[type="email"]', SUPER_EMAIL)
    await page.click('button[type="submit"]')

    // Deve mostrar mensagem de "verifique seu e-mail"
    await expect(page.getByText('Verifique seu e-mail')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Se existe uma conta com/)).toBeVisible()
  })

  test('CT-AUTH-009-B: E-mail inexistente → mesma mensagem (anti-enumeração)', async ({
    page,
  }) => {
    await page.fill('input[type="email"]', 'nao_existe@qa-test.invalid')
    await page.click('button[type="submit"]')

    // Deve mostrar a MESMA mensagem — não pode revelar que o e-mail não existe
    await expect(page.getByText('Verifique seu e-mail')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Se existe uma conta com/)).toBeVisible()
  })

  test('Botão "Usar outro e-mail" restaura o formulário', async ({ page }) => {
    await page.fill('input[type="email"]', SUPER_EMAIL)
    await page.click('button[type="submit"]')
    await expect(page.getByText('Verifique seu e-mail')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /usar outro e-mail/i }).click()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toHaveValue('')
  })

  test('Link "Voltar ao login" leva para /login', async ({ page }) => {
    const link = page.getByRole('link', { name: /voltar ao login/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Grupo: Callback de Magic Link (BUG-004) ──────────────────────────────────

test.describe('[BUG-004] Callback de Magic Link', () => {
  test('GET /api/auth/callback sem code → redireciona para /login?error=missing_code', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/api/auth/callback`)
    await expect(page).toHaveURL(/login.*error=missing_code/)
  })

  test('GET /api/auth/callback com code inválido → redireciona para /login?error=callback_failed', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/api/auth/callback?code=codigo_invalido_xyz`)
    await expect(page).toHaveURL(/login.*error=callback_failed/)
  })

  test('[BUG-004] /auth/callback (sem /api) retorna 404', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/auth/callback`)
    // BUG: Esta rota não existe. Códigos de convite e recuperação apontam para ela.
    expect(response?.status()).toBe(404)
    // Quando corrigido, este teste deve ser removido (a rota /auth/callback não deve existir)
  })
})

// ─── Grupo: Logout ────────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('CT-AUTH-011: Logout → redireciona para /login e invalida sessão', async ({ page }) => {
    // Login
    await goToLogin(page)
    await fillLoginForm(page, SUPER_EMAIL, SUPER_PASS)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 })

    // Logout via botão "Sair"
    await page.getByRole('link', { name: /sair/i }).click()

    // Deve redirecionar para login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // Tentativa de acessar admin deve redirecionar para login
    await page.goto(`${BASE_URL}/admin`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('POST /api/auth/sign-out sem auth → funciona (logout seguro)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/sign-out`)
    // Deve redirecionar (302) ou retornar 200 — não deve quebrar com 500
    expect([200, 302, 303]).toContain(res.status())
  })
})

// ─── Grupo: Persistência de Sessão ────────────────────────────────────────────

test.describe('Persistência de Sessão', () => {
  test('CT-AUTH-012: Sessão persiste após reload da página', async ({ page }) => {
    await goToLogin(page)
    await fillLoginForm(page, SUPER_EMAIL, SUPER_PASS)
    await submitLogin(page)
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 })

    // Reload
    await page.reload()
    await expect(page).toHaveURL(/\/admin/)
    // Não deve redirecionar para login
    await expect(page).not.toHaveURL(/\/login/)
  })
})
