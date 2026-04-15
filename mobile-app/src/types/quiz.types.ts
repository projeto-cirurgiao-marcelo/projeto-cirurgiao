export type QuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Quiz {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  difficulty: QuizDifficulty;
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

export interface GenerateQuizDto {
  title?: string;
  description?: string;
  difficulty?: QuizDifficulty;
  questionCount?: number;
  timeLimit?: number;
  passingScore?: number;
}

export interface QuizAnswerDto {
  questionId: string;
  answer: number;
  timeSpent?: number;
}

export interface SubmitQuizDto {
  answers: QuizAnswerDto[];
  totalTimeSpent?: number;
}

export interface QuizResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  answers: QuizResultAnswer[];
}

export interface QuizResultAnswer {
  questionId: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
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
