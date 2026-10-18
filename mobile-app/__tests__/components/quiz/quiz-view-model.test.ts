import {
  toQuizViewModel,
  type QuizScreenState,
} from '../../../src/components/quiz/rive/quiz-view-model';
import type { QuizQuestion } from '../../../src/types/quiz.types';

const questions: QuizQuestion[] = [
  { id: 'q1', question: 'Fio para sutura intradérmica?', options: ['Poliglecaprone', 'Seda', 'Aço'], order: 1, points: 1 },
  { id: 'q2', question: 'Jejum hídrico?', options: ['Nenhum', '2 horas'], order: 2, points: 1 },
];

const base: QuizScreenState = {
  phase: 'play',
  questions,
  currentQuestionIndex: 0,
  selectedOption: null,
  lastAnswerCorrect: null,
  combo: 0,
  correctCount: 0,
  accuracyPct: 0,
  xpGained: 0,
  submitting: false,
  result: null,
  generating: false,
};

describe('toQuizViewModel', () => {
  it('pergunta aberta: alternativas idle e liberadas', () => {
    const vm = toQuizViewModel(base);
    expect(vm.phase).toBe('question');
    expect(vm.progressLabel).toBe('Pergunta 1 de 2');
    expect(vm.questionText).toBe('Fio para sutura intradérmica?');
    expect(vm.options.map((o) => o.state)).toEqual(['idle', 'idle', 'idle']);
    expect(vm.locked).toBe(false);
    expect(vm.feedbackKind).toBe('none');
    expect(vm.canContinue).toBe(false);
  });

  it('conferindo no servidor: só a escolhida fica selected e tudo trava', () => {
    const vm = toQuizViewModel({ ...base, selectedOption: 1 });
    expect(vm.phase).toBe('question');
    expect(vm.options.map((o) => o.state)).toEqual(['idle', 'selected', 'idle']);
    expect(vm.locked).toBe(true);
  });

  it('acerto: feedback correct, XP e continuar só depois da confiança', () => {
    const acerto = { ...base, selectedOption: 0, lastAnswerCorrect: true, xpGained: 15, combo: 1, correctCount: 1, accuracyPct: 100 };
    const vm = toQuizViewModel(acerto);
    expect(vm.phase).toBe('feedback');
    expect(vm.options[0].state).toBe('correct');
    expect(vm.feedbackKind).toBe('correct');
    expect(vm.feedbackTitle).toBe('Excelente, doutor!');
    expect(vm.xpGained).toBe(15);
    expect(vm.xpProgress).toBe(50);
    expect(vm.confidence).toBe('none');
    expect(vm.canContinue).toBe(false);

    const comConfianca = toQuizViewModel({ ...acerto, selectedConfidence: 'THOUGHT_KNEW' });
    expect(comConfianca.confidence).toBe('thoughtKnew');
    expect(comConfianca.canContinue).toBe(true);
  });

  it('erro: só a escolhida fica wrong (o gabarito não vem durante o quiz) e sem XP', () => {
    const vm = toQuizViewModel({ ...base, selectedOption: 2, lastAnswerCorrect: false, xpGained: 15, accuracyPct: 66.67 });
    expect(vm.options.map((o) => o.state)).toEqual(['idle', 'idle', 'wrong']);
    expect(vm.feedbackKind).toBe('wrong');
    expect(vm.xpGained).toBe(0);
    expect(vm.accuracy).toBe(67);
  });

  it('enviando a última resposta: travado e sem continuar', () => {
    const vm = toQuizViewModel({
      ...base,
      currentQuestionIndex: 1,
      selectedOption: 0,
      lastAnswerCorrect: true,
      selectedConfidence: 'KNEW',
      submitting: true,
    });
    expect(vm.submitting).toBe(true);
    expect(vm.locked).toBe(true);
    expect(vm.canContinue).toBe(false);
  });

  it('resultado: resumo e revisão com respostas só nos erros', () => {
    const vm = toQuizViewModel({
      ...base,
      phase: 'result',
      result: {
        score: 49.6,
        correctCount: 1,
        totalQuestions: 2,
        passed: false,
        answers: [
          { questionId: 'q1', userAnswer: 0, correctAnswer: 0, isCorrect: true, explanation: 'Absorvível e monofilamentar.' },
          { questionId: 'q2', userAnswer: 0, correctAnswer: 1, isCorrect: false, explanation: '' },
        ],
      },
    });
    expect(vm.phase).toBe('result');
    expect(vm.score).toBe(50);
    expect(vm.resultSummary).toBe('1 de 2 corretas');
    expect(vm.review).toEqual([
      { title: 'Questão 1', question: 'Fio para sutura intradérmica?', isCorrect: true, yourAnswer: '', correctAnswer: '', explanation: 'Absorvível e monofilamentar.' },
      { title: 'Questão 2', question: 'Jejum hídrico?', isCorrect: false, yourAnswer: 'Nenhum', correctAnswer: '2 horas', explanation: '' },
    ]);
  });

  it('quiz vazio não quebra', () => {
    const vm = toQuizViewModel({ ...base, questions: [] });
    expect(vm.progressLabel).toBe('');
    expect(vm.options).toEqual([]);
    expect(vm.xpProgress).toBe(0);
  });
});
