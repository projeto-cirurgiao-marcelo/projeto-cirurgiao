/**
 * Banco de provas do quiz em Rive — fora do fluxo do app, sem backend.
 * Abrir com: projetocirurgiao://rive-spike
 *
 * Roda o QuizRiveView real com um quiz local (a primeira alternativa é sempre
 * a certa) pra testar o fluxo inteiro sem login. Apagar na fase 5.
 */
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuizRiveView } from '../src/components/quiz/rive/QuizRiveView';
import { toQuizViewModel } from '../src/components/quiz/rive/quiz-view-model';
import type { ConfidenceLevel, QuizQuestion, QuizResult } from '../src/types/quiz.types';

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Qual fio é mais indicado para a sutura intradérmica após uma orquiectomia em cão?',
    options: ['Poliglecaprone 25 (absorvível monofilamentar)', 'Seda', 'Nylon multifilamentar com nós externos', 'Aço'],
    order: 1,
    points: 1,
  },
  {
    id: 'q2',
    question: 'Tempo de jejum hídrico recomendado antes da anestesia em cães adultos saudáveis?',
    options: ['2 horas', 'Nenhum', '12 horas'],
    order: 2,
    points: 1,
  },
];

export default function RiveQuizHarness() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel>();
  const [answers, setAnswers] = useState<{ q: number; a: number }[]>([]);
  const [combo, setCombo] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);

  const correctCount = answers.filter((x) => x.a === 0).length;
  const answered = answers.length + (correct === null ? 0 : 1);
  const hits = correctCount + (correct ? 1 : 0);

  const reset = () => {
    setIndex(0);
    setSelected(null);
    setCorrect(null);
    setConfidence(undefined);
    setAnswers([]);
    setCombo(0);
    setResult(null);
  };

  const vm = toQuizViewModel({
    phase: result ? 'result' : 'play',
    questions: QUESTIONS,
    currentQuestionIndex: index,
    selectedOption: selected,
    lastAnswerCorrect: correct,
    selectedConfidence: confidence,
    combo,
    correctCount: hits,
    accuracyPct: answered ? (hits / answered) * 100 : 0,
    xpGained: 15 + Math.max(0, combo - 1) * 2,
    submitting: false,
    result,
    generating: false,
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <QuizRiveView
        vm={vm}
        onOptionTap={(i) => {
          if (selected !== null) return;
          setSelected(i);
          // simula a latência do checkAnswer
          setTimeout(() => {
            setCorrect(i === 0);
            setCombo((c) => (i === 0 ? c + 1 : 0));
          }, 400);
        }}
        onConfidence={(level) => correct !== null && setConfidence(level)}
        onContinue={() => {
          if (correct === null || !confidence || selected === null) return;
          const all = [...answers, { q: index, a: selected }];
          setAnswers(all);
          setSelected(null);
          setCorrect(null);
          setConfidence(undefined);
          if (index < QUESTIONS.length - 1) return setIndex(index + 1);
          const ok = all.filter((x) => x.a === 0).length;
          setResult({
            score: (ok / QUESTIONS.length) * 100,
            correctCount: ok,
            totalQuestions: QUESTIONS.length,
            passed: ok / QUESTIONS.length >= 0.7,
            answers: all.map((x) => ({
              questionId: QUESTIONS[x.q].id,
              userAnswer: x.a,
              correctAnswer: 0,
              isCorrect: x.a === 0,
              explanation: 'Explicação de exemplo vinda do servidor.',
            })),
          });
        }}
        onRetry={reset}
        onClose={reset}
      />
    </SafeAreaView>
  );
}
