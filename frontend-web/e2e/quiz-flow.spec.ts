import { expect, test } from '@playwright/test';

import { SEED_IDS, SEED_STUDENT, loginAs } from './helpers/auth';

/**
 * Jornada 3 — Aluno abre quiz e fluxo nao quebra.
 *
 * Assim como `watch-and-save.spec.ts`, mockamos os endpoints pra
 * rodar a suite sem depender de HLS/quiz reais em staging. Foco:
 * confirmar que o fluxo `/student/courses/:id/quiz/:quizId`
 * renderiza sem crashes ate a tela de submissao.
 */

test.describe('Quiz', () => {
  test('abre tela do quiz e renderiza intro/perguntas', async ({ page }) => {
    await loginAs(page, SEED_STUDENT);

    // Shape minimo de Quiz que o frontend espera — 3 perguntas MCQ.
    const mockedQuiz = {
      id: SEED_IDS.quizId,
      videoId: SEED_IDS.videoId,
      title: 'Quiz do Vídeo de Teste',
      description: 'Quiz determinístico para E2E.',
      difficulty: 'MEDIUM',
      passingScore: 70,
      timeLimit: null,
      questions: [
        {
          id: '00000000-0000-4000-a000-000000000101',
          question: 'Qual é a cor do céu em um dia claro?',
          options: ['Verde', 'Vermelho', 'Azul', 'Amarelo'],
          correctAnswer: 2,
          order: 0,
          points: 10,
        },
        {
          id: '00000000-0000-4000-a000-000000000102',
          question: 'Quantos dedos tem uma mão humana padrão?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 2,
          order: 1,
          points: 10,
        },
        {
          id: '00000000-0000-4000-a000-000000000103',
          question: 'Qual animal é o melhor amigo do homem?',
          options: ['Gato', 'Cachorro', 'Papagaio', 'Peixe'],
          correctAnswer: 1,
          order: 2,
          points: 10,
        },
      ],
    };

    await page.route(`**/quizzes/${SEED_IDS.quizId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockedQuiz),
      });
    });

    // submitQuiz retorna resultado de teste com passed=true.
    await page.route(`**/quizzes/${SEED_IDS.quizId}/submit`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'attempt-1',
          score: 100,
          correctCount: 3,
          totalQuestions: 3,
          timeSpent: 30,
          passed: true,
          answers: [
            { questionId: mockedQuiz.questions[0].id, answer: 2, isCorrect: true },
            { questionId: mockedQuiz.questions[1].id, answer: 2, isCorrect: true },
            { questionId: mockedQuiz.questions[2].id, answer: 1, isCorrect: true },
          ],
        }),
      });
    });

    await page.goto(
      `/student/courses/${SEED_IDS.courseId}/quiz/${SEED_IDS.quizId}`,
    );

    await expect(page).toHaveURL(new RegExp(`quiz/${SEED_IDS.quizId}`));

    // Aguarda o heading do quiz aparecer — prova de que o
    // GET /quizzes/:id foi consumido e a UI montou. Usamos role=heading
    // pra evitar strict-mode violation (tem um span na sidebar com o
    // mesmo texto).
    await expect(
      page.getByRole('heading', { name: /Quiz do Vídeo de Teste/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
