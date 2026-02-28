import { apiClient } from './client';

export interface Quiz {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit?: number;
  passingScore: number;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  order: number;
  points: number;
}

export interface QuizAnswer {
  questionId: string;
  answer: number;
  timeSpent?: number;
}

export interface QuizResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  answers: {
    questionId: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeSpent?: number;
  passed: boolean;
  completedAt: string;
}

export interface QuizStats {
  totalAttempts: number;
  bestScore: number;
  averageScore: number;
  passed: boolean;
  lastAttemptDate: string | null;
}

export interface UserQuizStats {
  totalAttempts: number;
  uniqueQuizzes: number;
  passedQuizzes: number;
  averageScore: number;
  recentAttempts: QuizAttempt[];
}

export interface GenerateQuizDto {
  title?: string;
  description?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  questionCount?: number;
  timeLimit?: number;
  passingScore?: number;
}

export const quizzesService = {
  /**
   * Gera um novo quiz para um vídeo usando IA
   */
  async generateQuiz(videoId: string, data: GenerateQuizDto = {}): Promise<Quiz> {
    const response = await apiClient.post(
      `videos/${videoId}/quizzes/generate`,
      data
    );
    return response.data;
  },

  /**
   * Lista todos os quizzes de um vídeo
   */
  async listQuizzesByVideo(videoId: string): Promise<Quiz[]> {
    const response = await apiClient.get(`videos/${videoId}/quizzes`);
    return response.data;
  },

  /**
   * Obtém um quiz específico (sem respostas corretas)
   */
  async getQuiz(quizId: string): Promise<Quiz> {
    const response = await apiClient.get(`quizzes/${quizId}`);
    return response.data;
  },

  /**
   * Deleta um quiz
   */
  async deleteQuiz(quizId: string): Promise<void> {
    await apiClient.delete(`quizzes/${quizId}`);
  },

  /**
   * Submete as respostas do quiz
   */
  async submitQuiz(
    quizId: string,
    answers: QuizAnswer[],
    totalTimeSpent?: number
  ): Promise<QuizResult> {
    const response = await apiClient.post(`quizzes/${quizId}/submit`, {
      answers,
      totalTimeSpent,
    });
    return response.data;
  },

  /**
   * Lista todas as tentativas do usuário para um quiz
   */
  async listAttempts(quizId: string): Promise<QuizAttempt[]> {
    const response = await apiClient.get(`quizzes/${quizId}/attempts`);
    return response.data;
  },

  /**
   * Obtém uma tentativa específica
   */
  async getAttempt(attemptId: string): Promise<QuizAttempt> {
    const response = await apiClient.get(`attempts/${attemptId}`);
    return response.data;
  },

  /**
   * Obtém estatísticas do usuário para um quiz
   */
  async getQuizStats(quizId: string): Promise<QuizStats> {
    const response = await apiClient.get(`quizzes/${quizId}/stats`);
    return response.data;
  },

  /**
   * Obtém estatísticas gerais do usuário (todos os quizzes)
   */
  async getUserStats(): Promise<UserQuizStats> {
    const response = await apiClient.get('users/me/quiz-stats');
    return response.data;
  },
};