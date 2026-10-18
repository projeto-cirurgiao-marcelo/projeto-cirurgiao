/**
 * Contrato entre o QuizPlayer (lógica, em RN) e a tela do quiz em Rive.
 *
 * Os nomes dos campos são os nomes das propriedades dos view models no .riv
 * (`Quiz`, `Option`, `ReviewItem`) e os valores de enum são as chaves dos
 * enums de lá. Mudou aqui, muda no `scene.rml` — e vice-versa.
 *
 * O app é a fonte da verdade: o Rive só desenha o que recebe e devolve
 * toques pelos triggers de `QUIZ_TRIGGERS`.
 */
import type { ConfidenceLevel, QuizQuestion, QuizResult } from '../../../types/quiz.types';

export type QuizPhase = 'question' | 'feedback' | 'result';
export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';
export type FeedbackKind = 'none' | 'correct' | 'wrong';
export type ConfidenceKey = 'none' | 'guessed' | 'thoughtKnew' | 'knew' | 'mastered';

/** View model `Option` — uma linha da lista de alternativas. */
export interface OptionViewModel {
  text: string;
  state: OptionState;
}

/** View model `ReviewItem` — uma linha da revisão no resultado. */
export interface ReviewItemViewModel {
  title: string;
  question: string;
  isCorrect: boolean;
  /** Vazios quando a resposta está certa (a tela só mostra no erro). */
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
}

/** View model `Quiz` — a tela inteira. */
export interface QuizViewModel {
  phase: QuizPhase;

  // pergunta
  progressLabel: string;
  questionNumber: number;
  questionCount: number;
  questionText: string;
  options: OptionViewModel[];
  /** Alternativas não aceitam toque (conferindo, no feedback ou enviando). */
  locked: boolean;

  // HUD
  combo: number;
  /** 0–100: corretas / total, a barra do topo. */
  xpProgress: number;

  // feedback (Dr. Gelpi + nível de confiança)
  feedbackKind: FeedbackKind;
  feedbackTitle: string;
  feedbackSubtitle: string;
  xpGained: number;
  /** 0–100, acerto até aqui. */
  accuracy: number;
  confidence: ConfidenceKey;
  canContinue: boolean;

  submitting: boolean;

  // resultado
  score: number;
  passed: boolean;
  resultSummary: string;
  review: ReviewItemViewModel[];
  /** "Novo Quiz" em andamento. */
  generating: boolean;
}

/** Triggers que o Rive dispara e o app escuta. */
export const QUIZ_TRIGGERS = {
  optionTap: 'tap', // em cada item de `options`
  confidence: {
    GUESSED: 'pickGuessed',
    THOUGHT_KNEW: 'pickThoughtKnew',
    KNEW: 'pickKnew',
    MASTERED: 'pickMastered',
  } satisfies Record<ConfidenceLevel, string>,
  continue: 'continueTap',
  retry: 'retryTap',
  close: 'closeTap',
} as const;

const CONFIDENCE_KEY: Record<ConfidenceLevel, ConfidenceKey> = {
  GUESSED: 'guessed',
  THOUGHT_KNEW: 'thoughtKnew',
  KNEW: 'knew',
  MASTERED: 'mastered',
};

const FEEDBACK_TEXT = {
  correct: { title: 'Excelente, doutor!', subtitle: 'Resposta certeira — diagnóstico em segundos.' },
  wrong: { title: 'Quase lá, doutor!', subtitle: 'Vamos revisar essa juntos.' },
};

/** O que o QuizPlayer já guarda hoje, sem estado novo. */
export interface QuizScreenState {
  phase: 'play' | 'result';
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  selectedOption: number | null;
  /** Resposta do servidor pra pergunta atual; null enquanto não respondeu. */
  lastAnswerCorrect: boolean | null;
  selectedConfidence?: ConfidenceLevel;
  combo: number;
  correctCount: number;
  accuracyPct: number;
  xpGained: number;
  submitting: boolean;
  result: QuizResult | null;
  generating: boolean;
}

export function toQuizViewModel(s: QuizScreenState): QuizViewModel {
  const total = s.questions.length;
  const question = s.questions[s.currentQuestionIndex];
  const answered = s.lastAnswerCorrect !== null;
  const phase: QuizPhase =
    s.phase === 'result' ? 'result' : answered ? 'feedback' : 'question';

  // O gabarito não vem durante o quiz: só a escolhida muda de estado.
  const selectedState: OptionState = !answered
    ? 'selected'
    : s.lastAnswerCorrect
      ? 'correct'
      : 'wrong';
  const options = (question?.options ?? []).map((text, i) => ({
    text,
    state: i === s.selectedOption ? selectedState : ('idle' as const),
  }));

  const feedbackKind: FeedbackKind = !answered ? 'none' : s.lastAnswerCorrect ? 'correct' : 'wrong';
  const feedbackText = feedbackKind === 'none' ? { title: '', subtitle: '' } : FEEDBACK_TEXT[feedbackKind];

  const r = s.result;
  const review = (r?.answers ?? []).map((a, i): ReviewItemViewModel => {
    const q = s.questions.find((x) => x.id === a.questionId);
    return {
      title: `Questão ${i + 1}`,
      question: q?.question ?? '',
      isCorrect: a.isCorrect,
      yourAnswer: a.isCorrect ? '' : (q?.options[a.userAnswer] ?? ''),
      correctAnswer: a.isCorrect ? '' : (q?.options[a.correctAnswer] ?? ''),
      explanation: a.explanation ?? '',
    };
  });

  return {
    phase,
    progressLabel: question ? `Pergunta ${s.currentQuestionIndex + 1} de ${total}` : '',
    questionNumber: question ? s.currentQuestionIndex + 1 : 0,
    questionCount: total,
    questionText: question?.question ?? '',
    options,
    locked: s.selectedOption !== null || s.submitting,
    combo: s.combo,
    xpProgress: total > 0 ? Math.round((s.correctCount / total) * 100) : 0,
    feedbackKind,
    feedbackTitle: feedbackText.title,
    feedbackSubtitle: feedbackText.subtitle,
    xpGained: s.lastAnswerCorrect ? s.xpGained : 0,
    accuracy: Math.round(s.accuracyPct),
    confidence: s.selectedConfidence ? CONFIDENCE_KEY[s.selectedConfidence] : 'none',
    canContinue: answered && !!s.selectedConfidence && !s.submitting,
    submitting: s.submitting,
    score: r ? Math.round(r.score) : 0,
    passed: r?.passed ?? false,
    resultSummary: r ? `${r.correctCount} de ${r.totalQuestions} corretas` : '',
    review,
    generating: s.generating,
  };
}
