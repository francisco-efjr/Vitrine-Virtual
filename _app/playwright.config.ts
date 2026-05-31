import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:3000'
const parsedBaseURL = new URL(baseURL)
const serverPort = parsedBaseURL.port || (parsedBaseURL.protocol === 'https:' ? '443' : '80')

export default defineConfig({
  testDir: './tests/qa',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${serverPort}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
})
