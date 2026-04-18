import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — smoke suite de 3 jornadas e2e.
 *
 * URL base configuravel via `E2E_BASE_URL` (default `http://localhost:3001`
 * — mesma porta do `npm run dev`). Em CI/staging apontar pra URL do
 * deploy.
 *
 * Usuario de teste gerado pelo seed em
 * `backend-api/prisma/seed-staging.ts` (documentado em
 * `backend-api/docs/DEPLOY.md`):
 *   test@cirurgiao.app / Seed!Student2026
 *
 * Para rodar local:
 *   1. Backend com seed aplicado (cd backend-api && npx ts-node prisma/seed-staging.ts).
 *   2. Frontend: `npm run dev` (porta 3001).
 *   3. `npx playwright test` (inicia a suite).
 *
 * Chromium precisa estar instalado uma vez:
 *   npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
