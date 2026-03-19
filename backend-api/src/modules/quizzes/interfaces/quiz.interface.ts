export interface QuizQuestion {
  question: string;
  options: string[]; // Array com 4 opções
  correctAnswer: number; // Índice da resposta correta (0-3)
  explanation: string; // Explicação da resposta correta
}

export interface GeneratedQuiz {
  questions: QuizQuestion[];
}

export interface QuizResult {
  score: number; // Pontuação (0-100)
  correctCount: number; // Número de acertos
  totalQuestions: number; // Total de questões
  passed: boolean; // Se passou ou não
  answers: {
    questionId: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
  }[];
}