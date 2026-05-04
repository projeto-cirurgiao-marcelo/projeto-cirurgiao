import { create } from 'zustand';
import type { ConfidenceLevel } from '../types/quiz.types';

export interface QuizAnswerInProgress {
  questionId: string;
  answer: number | null;
  confidence: ConfidenceLevel | null;
  isCorrect?: boolean;
}

interface QuizState {
  quizId: string | null;
  questions: any[];
  currentIndex: number;
  answers: Map<string, QuizAnswerInProgress>;
  combo: number;
  comboMax: number;
  startedAt: number | null;

  // actions
  startQuiz: (quizId: string, questions: any[]) => void;
  selectAnswer: (questionId: string, answer: number) => void;
  setConfidence: (questionId: string, confidence: ConfidenceLevel) => void;
  markCorrectness: (questionId: string, isCorrect: boolean) => void;
  next: () => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizId: null,
  questions: [],
  currentIndex: 0,
  answers: new Map(),
  combo: 0,
  comboMax: 0,
  startedAt: null,

  startQuiz: (quizId, questions) =>
    set({
      quizId,
      questions,
      currentIndex: 0,
      answers: new Map(),
      combo: 0,
      comboMax: 0,
      startedAt: Date.now(),
    }),

  selectAnswer: (questionId, answer) => {
    const next = new Map(get().answers);
    const prev = next.get(questionId) ?? { questionId, answer: null, confidence: null };
    next.set(questionId, { ...prev, answer });
    set({ answers: next });
  },

  setConfidence: (questionId, confidence) => {
    const next = new Map(get().answers);
    const prev = next.get(questionId) ?? { questionId, answer: null, confidence: null };
    next.set(questionId, { ...prev, confidence });
    set({ answers: next });
  },

  markCorrectness: (questionId, isCorrect) => {
    const next = new Map(get().answers);
    const prev = next.get(questionId) ?? { questionId, answer: null, confidence: null };
    next.set(questionId, { ...prev, isCorrect });
    const newCombo = isCorrect ? get().combo + 1 : 0;
    set({
      answers: next,
      combo: newCombo,
      comboMax: Math.max(get().comboMax, newCombo),
    });
  },

  next: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length),
    })),

  reset: () =>
    set({
      quizId: null,
      questions: [],
      currentIndex: 0,
      answers: new Map(),
      combo: 0,
      comboMax: 0,
      startedAt: null,
    }),
}));
