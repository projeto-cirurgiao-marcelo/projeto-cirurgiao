'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Trophy, Clock, Target, RotateCcw, BookOpen } from 'lucide-react';
import { QuizResult } from '@/lib/api/quizzes.service';

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

  // Determinar cor baseada na pontuação
  const getScoreColor = () => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
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
      {/* Card de Resultado Principal */}
      <Card className={isPassed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardHeader className="text-center p-4 sm:p-6">
          <div className="mx-auto mb-3 sm:mb-4">
            {isPassed ? (
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-500" />
            ) : (
              <Target className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-600" />
            )}
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {isPassed ? 'Quiz Concluído!' : 'Quiz Finalizado'}
          </CardTitle>
          <p className="text-sm sm:text-base text-muted-foreground truncate">{quizTitle}</p>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Pontuação */}
          <div className="text-center">
            <div className={`text-5xl sm:text-6xl font-bold ${getScoreColor()}`}>
              {percentage}%
            </div>
            <p className="mt-1.5 sm:mt-2 text-sm sm:text-lg text-muted-foreground">{getMessage()}</p>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="rounded-lg border bg-background p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {result.correctCount}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Acertos</div>
            </div>
            <div className="rounded-lg border bg-background p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {result.totalQuestions - result.correctCount}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Erros</div>
            </div>
          </div>

          {/* Badge de Status */}
          <div className="flex justify-center">
            {isPassed ? (
              <Badge className="bg-green-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base">
                ✅ Aprovado
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-600 text-yellow-700 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base">
                📚 Continue Estudando
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes das Respostas */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">📊 Detalhes por Questão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
          {result.answers.map((answer, index) => (
            <div
              key={answer.questionId}
              className={`rounded-lg border p-3 sm:p-4 ${
                answer.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="text-sm sm:text-base font-medium">
                    Questão {index + 1}
                    {answer.isCorrect ? (
                      <span className="ml-1.5 sm:ml-2 text-green-600 text-xs sm:text-sm">✓ Correta</span>
                    ) : (
                      <span className="ml-1.5 sm:ml-2 text-red-600 text-xs sm:text-sm">✗ Incorreta</span>
                    )}
                  </div>

                  {!answer.isCorrect && (
                    <div className="text-xs sm:text-sm space-y-0.5 sm:space-y-1">
                      <div className="text-red-700">
                        <span className="font-medium">Sua:</span> Opção {answer.userAnswer + 1}
                      </div>
                      <div className="text-green-700">
                        <span className="font-medium">Correta:</span> Opção {answer.correctAnswer + 1}
                      </div>
                    </div>
                  )}

                  {answer.explanation && (
                    <div className="rounded bg-background/50 p-2 sm:p-3 text-xs sm:text-sm">
                      <div className="font-medium mb-0.5 sm:mb-1">💡 Explicação:</div>
                      <div className="text-muted-foreground">{answer.explanation}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="flex-1 h-10 sm:h-11 text-sm sm:text-base">
            <RotateCcw className="mr-1.5 sm:mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        )}
        {onReviewContent && (
          <Button onClick={onReviewContent} variant="outline" className="flex-1 h-10 sm:h-11 text-sm sm:text-base">
            <BookOpen className="mr-1.5 sm:mr-2 h-4 w-4" />
            Revisar Conteúdo
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} className="flex-1 h-10 sm:h-11 text-sm sm:text-base">
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}
