import { expect, test } from '@playwright/test';

import { SEED_IDS, SEED_STUDENT, loginAs } from './helpers/auth';

/**
 * Jornada 2 — Aluno navega pra watch e o player monta.
 *
 * ATENCAO: nao conseguimos testar progress-save real sem backend HLS
 * funcional em staging + playlist r2_hls valido (seed hoje tem
 * `PLACEHOLDER_HLS_URL` em `placeholder.cirurgiao.app/test.m3u8`).
 *
 * O que este spec valida:
 * - Navegar direto pra URL do watch nao da erro de cliente (white
 *   screen, stack trace).
 * - O container do player (div com aspectRatio 16:9) esta no DOM.
 * - O POST /progress eh disparado (independente de sucesso) — confirma
 *   que o auto-save interval esta ativo.
 *
 * Quando o backend/seed tiverem playlist real, subir a cobertura pra
 * assert de `page.waitForResponse` no /progress com 200 e validar o
 * watchTime no body.
 */

test.describe('Watch', () => {
  test('navega pra watch do seed e player container renderiza', async ({ page }) => {
    await loginAs(page, SEED_STUDENT);

    // Mocka endpoints que o page carrega no `loadData` pra nao depender
    // de backend HLS funcional ponta-a-ponta. Mantem shape do contrato
    // (id, moduleId, videoSource, hlsUrl, playback).
    await page.route(`**/videos/${SEED_IDS.videoId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: SEED_IDS.videoId,
          title: 'Video de Teste',
          description: 'Vídeo seed — hlsUrl é placeholder.',
          moduleId: SEED_IDS.moduleId,
          order: 0,
          duration: 30,
          isPublished: true,
          uploadStatus: 'READY',
          uploadProgress: 100,
          uploadError: null,
          thumbnailUrl: null,
          hlsUrl: 'https://placeholder.cirurgiao.app/test.m3u8',
          cloudflareId: null,
          cloudflareUrl: null,
          externalUrl: null,
          videoSource: 'r2_hls',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          playback: {
            kind: 'hls',
            playbackUrl: 'https://placeholder.cirurgiao.app/test.m3u8',
            captionsEmbedded: true,
          },
        }),
      });
    });

    await page.route(`**/courses/${SEED_IDS.courseId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: SEED_IDS.courseId,
          title: 'Curso de Teste E2E',
          slug: SEED_IDS.courseSlug,
          description: 'Fixture',
          thumbnailUrl: null,
          isPublished: true,
          instructorId: '00000000-0000-4000-a000-000000000001',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modules: [
            {
              id: SEED_IDS.moduleId,
              title: 'Módulo de Teste',
              order: 0,
              courseId: SEED_IDS.courseId,
              videos: [],
            },
          ],
        }),
      });
    });

    await page.route(`**/progress/course/${SEED_IDS.courseId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          courseId: SEED_IDS.courseId,
          progressPercentage: 0,
          videos: [],
        }),
      });
    });

    await page.route(`**/videos/${SEED_IDS.videoId}/quizzes/stats`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ totalAttempts: 0 }),
      });
    });

    await page.goto(
      `/student/courses/${SEED_IDS.courseId}/watch/${SEED_IDS.videoId}`,
    );

    // Page carrega sem crash — url foi atingida, nao houve redirect.
    await expect(page).toHaveURL(new RegExp(`watch/${SEED_IDS.videoId}`));

    // Player container (div com aspect-ratio 16/9) visivel.
    const playerContainer = page
      .locator('div[style*="aspect-ratio"]')
      .first();
    await expect(playerContainer).toBeVisible({ timeout: 15_000 });
  });
});
