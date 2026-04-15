import { apiClient } from './client';
import type {
  Quiz,
  GenerateQuizDto,
  SubmitQuizDto,
  QuizResult,
  QuizAttempt,
  QuizStats,
} from '../../types/quiz.types';

export const quizzesService = {
  async generateQuiz(videoId: string, dto?: GenerateQuizDto): Promise<Quiz> {
    const response = await apiClient.post<Quiz>(
      `/videos/${videoId}/quizzes/generate`,
      dto || {}
    );
    return response.data;
  },

  async listByVideo(videoId: string): Promise<Quiz[]> {
    try {
      const response = await apiClient.get<Quiz[]>(`/videos/${videoId}/quizzes`);
      return response.data;
    } catch (error) {
      console.error('[quizzesService] Erro ao listar quizzes:', error);
      return [];
    }
  },

  async getById(quizId: string): Promise<Quiz> {
    const response = await apiClient.get<Quiz>(`/quizzes/${quizId}`);
    return response.data;
  },

  async submit(quizId: string, dto: SubmitQuizDto): Promise<QuizResult> {
    const response = await apiClient.post<QuizResult>(
      `/quizzes/${quizId}/submit`,
      dto
    );
    return response.data;
  },

  async listAttempts(quizId: string): Promise<QuizAttempt[]> {
    try {
      const response = await apiClient.get<QuizAttempt[]>(
        `/quizzes/${quizId}/attempts`
      );
      return response.data;
    } catch (error) {
      console.error('[quizzesService] Erro ao listar tentativas:', error);
      return [];
    }
  },

  async getStats(quizId: string): Promise<QuizStats | null> {
    try {
      const response = await apiClient.get<QuizStats>(
        `/quizzes/${quizId}/stats`
      );
      return response.data;
    } catch (error) {
      console.error('[quizzesService] Erro ao obter stats:', error);
      return null;
    }
  },
};

export default quizzesService;
