import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do apiClient ANTES de importar o serviço
const post = vi.fn();
vi.mock('./client', () => ({ apiClient: { post: (...a: unknown[]) => post(...a) } }));

import { quizzesService, type QuizAnswer } from './quizzes.service';

beforeEach(() => post.mockReset());

describe('quizzesService.checkAnswer', () => {
  it('chama POST quizzes/:id/check-answer com questionId e answer', async () => {
    post.mockResolvedValue({ data: { isCorrect: true } });
    const res = await quizzesService.checkAnswer('quiz1', 'q1', 2);
    expect(post).toHaveBeenCalledWith('quizzes/quiz1/check-answer', {
      questionId: 'q1',
      answer: 2,
    });
    expect(res).toEqual({ isCorrect: true });
  });
});

describe('quizzesService.submitQuiz', () => {
  it('inclui confidence no payload quando presente', async () => {
    post.mockResolvedValue({ data: { score: 100 } });
    const answers: QuizAnswer[] = [
      { questionId: 'q1', answer: 1, timeSpent: 5, confidence: 'MASTERED' },
    ];
    await quizzesService.submitQuiz('quiz1', answers, 42);
    expect(post).toHaveBeenCalledWith('quizzes/quiz1/submit', {
      answers,
      totalTimeSpent: 42,
    });
  });
});
