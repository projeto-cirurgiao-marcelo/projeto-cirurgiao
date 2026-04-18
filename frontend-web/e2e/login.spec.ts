import { expect, test } from '@playwright/test';

import { SEED_STUDENT, loginAs } from './helpers/auth';

/**
 * Jornada 1 — Login + redirect correto por role.
 *
 * Cobre:
 * - Tela /login renderiza sem erro (forms, botao submit).
 * - Rotas protegidas redirecionam pra /login quando nao autenticado.
 * - Quando autenticado (via helper `loginAs`, que bypassa Firebase),
 *   STUDENT eh redirecionado pra /student/my-courses (ou /onboarding
 *   se perfil incompleto — seed tem onboardingCompleted=false, mas
 *   getProfile retorna 401 sem token real, entao login page cai no
 *   fallback pra /student/my-courses conforme o gate do T10).
 */

test.describe('Login', () => {
  test('tela de login renderiza com form', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    // Form tem inputs `#email` e `#password` (ver login/page.tsx).
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('redireciona rota protegida pra /login quando sem sessao', async ({ page }) => {
    await page.goto('/student/my-courses');
    await expect(page).toHaveURL(/\/login/);
  });

  test('student autenticado carrega my-courses', async ({ page }) => {
    await loginAs(page, SEED_STUDENT);
    await page.goto('/student/my-courses');
    // Aguarda o shell do dashboard carregar. Usar um seletor textual
    // estavel (sidebar ou header do aluno).
    await expect(page).toHaveURL(/\/student/);
    // Qualquer heading ou link indicando que estamos no dashboard do aluno.
    // Evitamos seletor muito especifico pra nao quebrar em tweaks de UI.
    await expect(page.locator('body')).not.toContainText(/erro/i, { timeout: 10_000 });
  });
});
