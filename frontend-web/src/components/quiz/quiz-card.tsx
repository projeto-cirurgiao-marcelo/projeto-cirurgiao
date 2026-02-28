'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Trophy, Clock, Target } from 'lucide-react';
import { Quiz, QuizStats } from '@/lib/api/quizzes.service';
import { useRouter } from 'next/navigation';

interface QuizCardProps {
  quiz: Quiz;
  stats?: QuizStats;
  videoId: string;
  courseId: string;
}

export function QuizCard({ quiz, stats, videoId, courseId }: QuizCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartQuiz = () => {
    setIsLoading(true);
    router.push(`/student/courses/${courseId}/quiz/${quiz.id}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'HARD':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'Fácil';
      case 'MEDIUM':
        return 'Médio';
      case 'HARD':
        return 'Difícil';
      default:
        return difficulty;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base sm:text-xl">🎯 Teste Seu Conhecimento</CardTitle>
            <CardDescription className="text-xs sm:text-sm truncate">{quiz.title}</CardDescription>
          </div>
          <Badge className={`${getDifficultyColor(quiz.difficulty)} text-[10px] sm:text-xs flex-shrink-0`}>
            {getDifficultyLabel(quiz.difficulty)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
        {/* Informações do Quiz */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <span>{quiz.questions.length} questões</span>
          </div>
          {quiz.timeLimit && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <span>~{Math.round(quiz.timeLimit / 60)} min</span>
            </div>
          )}
        </div>

        {/* Estatísticas do Usuário */}
        {stats && stats.totalAttempts > 0 && (
          <div className="rounded-md sm:rounded-lg border bg-muted/50 p-2.5 sm:p-4 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Melhor:</span>
              <span className="font-semibold flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                {stats.bestScore}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Tentativas:</span>
              <span className="font-semibold">{stats.totalAttempts}</span>
            </div>
            {stats.passed && (
              <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-200 text-[10px] sm:text-xs py-0.5 sm:py-1">
                ✅ Aprovado
              </Badge>
            )}
          </div>
        )}

        {/* Descrição */}
        {quiz.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleStartQuiz}
            disabled={isLoading}
            className="flex-1 h-9 sm:h-10 text-sm"
          >
            <PlayCircle className="mr-1.5 sm:mr-2 h-4 w-4" />
            {stats && stats.totalAttempts > 0 ? 'Tentar Novamente' : 'Iniciar Quiz'}
          </Button>
          {stats && stats.totalAttempts > 0 && (
            <Button
              variant="outline"
              onClick={() => router.push(`/student/courses/${courseId}/quiz/${quiz.id}/history`)}
              className="h-9 sm:h-10 text-sm"
            >
              📊 <span className="hidden xs:inline ml-1">Histórico</span>
            </Button>
          )}
        </div>

        {/* Nota sobre pontuação mínima */}
        <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
          Mínimo para aprovação: {quiz.passingScore}%
        </p>
      </CardContent>
    </Card>
  );
}
