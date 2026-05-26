'use client';

import { useEffect, useState } from 'react';
import { AtlasButton } from '@/components/atlas/primitives/AtlasButton';
import {
  AtlasCard,
  AtlasCardContent,
  AtlasCardHeader,
  AtlasCardTitle,
} from '@/components/atlas/primitives/AtlasCard';
import { CheckCircle2, XCircle, Trophy, Target, RotateCcw, BookOpen } from 'lucide-react';
import { QuizResult } from '@/lib/api/quizzes.service';
import { Confetti } from './gelpi/ConfettiSVG';
import gelpiStyles from './gelpi/gelpi.module.css';

interface QuizResultsProps {
  result: QuizResult;
  quizTitle: string;
  onRetry?: () => void;
  onReviewContent?: () => void;
  onClose?: () => void;
}

export function QuizResults({
  result,
  quizTitle,
  onRetry,
  onReviewContent,
  onClose,
}: QuizResultsProps) {
  const percentage = result.score;
  const isPassed = result.passed;

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isPassed) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPassed]);

  // Determinar cor baseada na pontuação
  const getScoreColor = () => {
    if (percentage >= 90) return 'text-emerald-500';
    if (percentage >= 70) return 'text-atlas-primary';
    if (percentage >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  // Determinar mensagem baseada na pontuação
  const getMessage = () => {
    if (percentage >= 90) return '🎉 Excelente! Você domina o conteúdo!';
    if (percentage >= 70) return '✅ Parabéns! Você foi aprovado!';
    if (percentage >= 50) return '📚 Bom trabalho! Continue estudando.';
    return '💪 Não desista! Revise o conteúdo e tente novamente.';
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      {/* Confetti overlay (only on pass) */}
      {showConfetti && (
        <div
          className={gelpiStyles.gelpiScope}
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}
        >
          <Confetti active={showConfetti} count={result.score === 100 ? 120 : 60} />
        </div>
      )}

      {/* Card de Resultado Principal */}
      <AtlasCard
        className={
          isPassed
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }
      >
        <AtlasCardHeader className="flex-col items-center text-center p-4 sm:p-6 border-b border-atlas-line">
          <div className="mx-auto mb-3 sm:mb-4">
            {isPassed ? (
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-amber-400" />
            ) : (
              <Target className="h-12 w-12 sm:h-16 sm:w-16 text-amber-500" />
            )}
          </div>
          <AtlasCardTitle className="text-xl sm:text-2xl font-bold">
            {isPassed ? 'Quiz Concluído!' : 'Quiz Finalizado'}
          </AtlasCardTitle>
          <p className="text-sm sm:text-base text-atlas-muted truncate mt-1">{quizTitle}</p>
        </AtlasCardHeader>

        <AtlasCardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Pontuação */}
          <div className="text-center">
            <div className={`text-5xl sm:text-6xl font-bold ${getScoreColor()}`}>
              {percentage}%
            </div>
            <p className="mt-1.5 sm:mt-2 text-sm sm:text-lg text-atlas-muted">{getMessage()}</p>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="rounded-md border border-atlas-line bg-atlas-surface-2 p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-emerald-500">
                {result.correctCount}
              </div>
              <div className="text-xs sm:text-sm text-atlas-muted">Acertos</div>
            </div>
            <div className="rounded-md border border-atlas-line bg-atlas-surface-2 p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-500">
                {result.totalQuestions - result.correctCount}
              </div>
              <div className="text-xs sm:text-sm text-atlas-muted">Erros</div>
            </div>
          </div>

          {/* Badge de Status */}
          <div className="flex justify-center">
            {isPassed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base font-medium">
                ✅ Aprovado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base font-medium">
                📚 Continue Estudando
              </span>
            )}
          </div>
        </AtlasCardContent>
      </AtlasCard>

      {/* Detalhes das Respostas */}
      <AtlasCard>
        <AtlasCardHeader className="p-3 sm:p-6 border-b border-atlas-line">
          <AtlasCardTitle className="text-base sm:text-lg">📊 Detalhes por Questão</AtlasCardTitle>
        </AtlasCardHeader>
        <AtlasCardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          {result.answers.map((answer, index) => (
            <div
              key={answer.questionId}
              className={`rounded-md border p-3 sm:p-4 ${
                answer.isCorrect
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="text-sm sm:text-base font-medium text-atlas-ink">
                    Questão {index + 1}
                    {answer.isCorrect ? (
                      <span className="ml-1.5 sm:ml-2 text-emerald-500 text-xs sm:text-sm">✓ Correta</span>
                    ) : (
                      <span className="ml-1.5 sm:ml-2 text-red-500 text-xs sm:text-sm">✗ Incorreta</span>
                    )}
                  </div>

                  {!answer.isCorrect && (
                    <div className="text-xs sm:text-sm space-y-0.5 sm:space-y-1">
                      <div className="text-red-600">
                        <span className="font-medium">Sua:</span> Opção {answer.userAnswer + 1}
                      </div>
                      <div className="text-emerald-600">
                        <span className="font-medium">Correta:</span> Opção {answer.correctAnswer + 1}
                      </div>
                    </div>
                  )}

                  {answer.explanation && (
                    <div className="rounded-md bg-atlas-surface-2 border border-atlas-line p-2 sm:p-3 text-xs sm:text-sm">
                      <div className="font-medium mb-0.5 sm:mb-1 text-atlas-ink-2">💡 Explicação:</div>
                      <div className="text-atlas-muted">{answer.explanation}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </AtlasCardContent>
      </AtlasCard>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {onRetry && (
          <AtlasButton
            onClick={onRetry}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <RotateCcw className="mr-1.5 sm:mr-2 h-4 w-4" />
            Tentar Novamente
          </AtlasButton>
        )}
        {onReviewContent && (
          <AtlasButton
            onClick={onReviewContent}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <BookOpen className="mr-1.5 sm:mr-2 h-4 w-4" />
            Revisar Conteúdo
          </AtlasButton>
        )}
        {onClose && (
          <AtlasButton
            onClick={onClose}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            Concluir
          </AtlasButton>
        )}
      </div>
    </div>
  );
}
