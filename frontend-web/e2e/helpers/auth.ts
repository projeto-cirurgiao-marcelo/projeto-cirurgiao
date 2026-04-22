import { Page } from '@playwright/test';

/**
 * Credenciais do seed staging (mantem sincronizado com
 * `backend-api/prisma/seed-staging.ts`).
 */
export const SEED_STUDENT = {
  id: '00000000-0000-4000-a000-000000000002',
  email: 'test@cirurgiao.app',
  password: 'Seed!Student2026',
  name: 'Seed Student',
  role: 'STUDENT' as const,
};

export const SEED_ADMIN = {
  id: '00000000-0000-4000-a000-000000000001',
  email: 'admin@cirurgiao.app',
  password: 'Seed!Admin2026',
  name: 'Seed Admin',
  role: 'ADMIN' as const,
};

/**
 * Ids deterministicos do seed staging — usaveis em page.goto().
 */
export const SEED_IDS = {
  courseId: '00000000-0000-4000-a000-000000000010',
  courseSlug: 'curso-teste-e2e',
  moduleId: '00000000-0000-4000-a000-000000000011',
  videoId: '00000000-0000-4000-a000-000000000012',
  quizId: '00000000-0000-4000-a000-000000000013',
};

type SeedUser = typeof SEED_STUDENT | typeof SEED_ADMIN;

/**
 * Bypassa o flow Firebase real (que exige SDK browser + credenciais
 * reais no Firebase Auth) injetando o state autenticado:
 *
 * 1. Cookie `auth-session` via page.context().addCookies — middleware
 *    SSR le o cookie no primeiro request, entao precisa estar setado
 *    ANTES de qualquer page.goto().
 * 2. localStorage do Zustand persist via addInitScript — hidrata o
 *    auth-store client-side pra `useAuthStore(...isAuthenticated)`
 *    ja comecar `true`.
 * 3. Mock de `POST /auth/firebase-login` — caso AuthProvider chame
 *    `loadUser()` na hidratacao, devolve shape valido.
 *
 * Depois de chamar, o proximo `page.goto('/student/...')` vai direto
 * pro destino autenticado sem passar por tela de login.
 */
export async function loginAs(page: Page, user: SeedUser) {
  const fakeFirebaseToken = 'e2e-fake-firebase-token';
  const backendUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Cookie pro middleware SSR — precisa estar no context antes do goto.
  // baseURL vem do playwright config; fallback pro dev default.
  const baseUrlRaw = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
  const url = new URL(baseUrlRaw);
  await page.context().addCookies([
    {
      name: 'auth-session',
      value: JSON.stringify({ role: user.role }),
      domain: url.hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 86400,
    },
  ]);

  // 2. Mock de auth/firebase-login (caso algo chame loadUser).
  await page.route('**/auth/firebase-login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: backendUser,
        firebaseToken: fakeFirebaseToken,
      }),
    });
  });

  // 3. LocalStorage do Zustand persist.
  const authStoragePayload = {
    state: {
      user: backendUser,
      firebaseToken: fakeFirebaseToken,
      isAuthenticated: true,
    },
    version: 0,
  };

  await page.addInitScript(
    ({ storageKey, payload }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    {
      // Chave do Zustand persist em `lib/stores/auth-store.ts` — se o
      // store mudar a config, atualizar aqui.
      storageKey: 'auth-storage-firebase',
      payload: authStoragePayload,
    },
  );
}
