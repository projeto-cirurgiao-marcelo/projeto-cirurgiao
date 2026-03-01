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
  async generateQuiz(videoId: string, data: GenerateQuizDto = {}): Promise<Quiz> {
    const response = await apiClient.post(`videos/${videoId}/quizzes/generate`, data);
    return response.data;
  },

  async listQuizzesByVideo(videoId: string): Promise<Quiz[]> {
    const response = await apiClient.get(`videos/${videoId}/quizzes`);
    return response.data;
  },

  async getQuiz(quizId: string): Promise<Quiz> {
    const response = await apiClient.get(`quizzes/${quizId}`);
    return response.data;
  },

  async deleteQuiz(quizId: string): Promise<void> {
    await apiClient.delete(`quizzes/${quizId}`);
  },

  async submitQuiz(quizId: string, answers: QuizAnswer[], totalTimeSpent?: number): Promise<QuizResult> {
    const response = await apiClient.post(`quizzes/${quizId}/submit`, { answers, totalTimeSpent });
    return response.data;
  },

  async listAttempts(quizId: string): Promise<QuizAttempt[]> {
    const response = await apiClient.get(`quizzes/${quizId}/attempts`);
    return response.data;
  },

  async getAttempt(attemptId: string): Promise<QuizAttempt> {
    const response = await apiClient.get(`attempts/${attemptId}`);
    return response.data;
  },

  async getQuizStats(quizId: string): Promise<QuizStats> {
    const response = await apiClient.get(`quizzes/${quizId}/stats`);
    return response.data;
  },

  async getUserStats(): Promise<UserQuizStats> {
    const response = await apiClient.get('users/me/quiz-stats');
    return response.data;
  },
};
