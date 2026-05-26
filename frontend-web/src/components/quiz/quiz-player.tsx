'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { quizzesService, Quiz, QuizAnswer, type ConfidenceLevel } from '@/lib/api/quizzes.service';
import { nextCombo, estimateXp, comboTier } from '@/lib/quiz-gamification';
import { GelpiCelebrateModal } from './gelpi/GelpiCelebrateModal';
import { logger } from '@/lib/logger';

interface QuizPlayerProps {
  quiz: Quiz;
  onSubmit: (answers: QuizAnswer[], totalTime: number) => void;
  onCancel?: () => void;
}

type PlayStep = 'answering' | 'awaitingConfidence';

export function QuizPlayer({ quiz, onSubmit, onCancel }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playStep, setPlayStep] = useState<PlayStep>('answering');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | undefined>(undefined);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [lastXp, setLastXp] = useState(0);
  const [gelpiKey, setGelpiKey] = useState(0);

  const answersRef = useRef<Map<string, number>>(new Map());
  const confidencesRef = useRef<Map<string, ConfidenceLevel>>(new Map());
  const questionTimesRef = useRef<Map<string, number>>(new Map());
  const totalStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const isCheckingRef = useRef(false);

  const question = quiz.questions[currentIndex];
  const total = quiz.questions.length;
  const isLast = currentIndex === total - 1;
  const accuracyPct = answeredCount === 0 ? 0 : (correctCount / answeredCount) * 100;
  // Barra do header = progresso de questões (casa com "Pergunta X de Y").
  // A gamificação de XP fica no modal (+XP por acerto) e na pílula de combo.
  const progressPct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  const handleSelectOption = async (optionIndex: number) => {
    if (isCheckingRef.current || playStep !== 'answering') return;
    isCheckingRef.current = true;
    setSelectedOption(optionIndex);

    const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);
    questionTimesRef.current.set(question.id, timeSpent);

    let isCorrect = false;
    try {
      const resp = await quizzesService.checkAnswer(quiz.id, question.id, optionIndex);
      isCorrect = resp.isCorrect;
    } catch (err) {
      logger.error('[QuizPlayer] checkAnswer falhou; assumindo correto (otimista)', err);
      isCorrect = true;
    } finally {
      isCheckingRef.current = false;
    }

    const newCombo = nextCombo(combo, isCorrect);
    setCombo(newCombo);
    setAnsweredCount((n) => n + 1);
    if (isCorrect) setCorrectCount((n) => n + 1);
    setLastCorrect(isCorrect);
    setLastXp(isCorrect ? estimateXp(newCombo) : 0);
    setGelpiKey((k) => k + 1);
    setPlayStep('awaitingConfidence');
  };

  const handleConfidenceTap = (level: ConfidenceLevel) => {
    setSelectedConfidence(level);
  };

  const handleContinue = useCallback(() => {
    if (selectedOption === null || !selectedConfidence) return;
    answersRef.current.set(question.id, selectedOption);
    confidencesRef.current.set(question.id, selectedConfidence);

    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setSelectedConfidence(undefined);
      setLastCorrect(null);
      setPlayStep('answering');
      questionStartRef.current = Date.now();
    } else {
      const answersDto: QuizAnswer[] = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answersRef.current.get(q.id) ?? 0,
        timeSpent: questionTimesRef.current.get(q.id),
        confidence: confidencesRef.current.get(q.id),
      }));
      const totalTime = Math.floor((Date.now() - totalStartRef.current) / 1000);
      onSubmit(answersDto, totalTime);
    }
  }, [selectedOption, selectedConfidence, isLast, question, quiz.questions, onSubmit]);

  const awaiting = playStep === 'awaitingConfidence';
  const tier = comboTier(combo);

  return (
    <div className="relative space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="atlas-caps text-atlas-muted mb-1.5">
            Pergunta {currentIndex + 1} de {total}
          </div>
          <div className="h-2.5 rounded-full bg-atlas-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#1E6FD9,#4FA8E8)' }}
            />
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white text-[13px] font-bold"
          style={{ background: tier ? tier.color : 'linear-gradient(90deg,#FF8B3D,#FFB020)' }}
        >
          <span>🔥</span><span>{combo}</span>
        </div>
      </div>

      <div className="rounded-xl border border-atlas-line bg-atlas-surface p-5">
        <div className="text-atlas-ink font-serif font-medium text-[16px] leading-relaxed mb-4">
          {question.question}
        </div>
        <div className="space-y-2.5">
          {question.options.map((option, index) => {
            const isSel = selectedOption === index;
            return (
              <motion.button
                key={index}
                onClick={() => handleSelectOption(index)}
                disabled={awaiting}
                whileTap={{ scale: awaiting ? 1 : 0.99 }}
                className={`w-full text-left rounded-lg border p-3.5 text-[14px] transition-colors ${
                  isSel
                    ? 'border-atlas-primary bg-atlas-primary/10 text-atlas-ink'
                    : 'border-atlas-line text-atlas-ink-2 hover:border-atlas-primary/50'
                } ${awaiting ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {option}
              </motion.button>
            );
          })}
        </div>
        {!awaiting && (
          <p className="text-center text-atlas-muted text-[13px] mt-4">
            Toque em uma alternativa para responder{isLast ? ' (última questão)' : ''}
          </p>
        )}
      </div>

      {onCancel && (
        <div className="text-center">
          <button onClick={onCancel} className="text-atlas-muted text-[13px] hover:text-atlas-ink">
            Sair do quiz
          </button>
        </div>
      )}

      <GelpiCelebrateModal
        key={gelpiKey}
        visible={awaiting && lastCorrect !== null}
        state={lastCorrect ? 'celebrate' : 'wrong'}
        title={lastCorrect ? 'Excelente, doutor!' : 'Quase lá, doutor!'}
        subtitle={lastCorrect ? 'Resposta correta.' : 'Vamos revisar no fim.'}
        xpGained={lastXp}
        comboValue={combo}
        accuracyPct={accuracyPct}
        selectedConfidence={selectedConfidence}
        onSelectConfidence={handleConfidenceTap}
        onContinue={handleContinue}
      />
    </div>
  );
}
