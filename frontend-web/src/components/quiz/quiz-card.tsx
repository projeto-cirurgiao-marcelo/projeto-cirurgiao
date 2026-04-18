'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Trophy, Clock, Target, Loader2, Sparkles } from 'lucide-react';
import { Quiz, QuizStats, quizzesService } from '@/lib/api/quizzes.service';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
interface QuizCardProps {
  quiz?: Quiz;
  stats?: QuizStats;
  videoId: string;
  courseId: string;
}

/**
 * QuizCard para estudantes.
 * Cada clique em "Fazer Quiz" gera um quiz novo via IA,
 * garantindo que as perguntas sejam diferentes a cada tentativa.
 * O estudante não sabe que está gerando — para ele é só "Fazer Quiz".
 */
export function QuizCard({ quiz, stats, videoId, courseId }: QuizCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartQuiz = async () => {
    try {
      setIsGenerating(true);
      // Gera um quiz novo via IA a cada tentativa
      const newQuiz = await quizzesService.generateQuiz(videoId, {
        questionCount: 5,
        passingScore: 70,
      });
      // Navega para a página do quiz gerado
      router.push(`/student/courses/${courseId}/quiz/${newQuiz.id}`);
    } catch (err: any) {
      logger.error('Erro ao preparar quiz:', err);
      const message = err?.response?.data?.message || 'Erro ao preparar o quiz. Verifique se o vídeo possui transcrição.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const totalAttempts = stats?.totalAttempts || 0;

  return (
    <Card className="w-full">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
              Teste Seu Conhecimento
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cada tentativa gera perguntas diferentes com base no conteúdo da aula
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
        {/* Estatísticas do Usuário */}
        {stats && totalAttempts > 0 && (
          <div className="rounded-md sm:rounded-lg border bg-muted/50 p-2.5 sm:p-4 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Melhor resultado:</span>
              <span className="font-semibold flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                {stats.bestScore}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Tentativas:</span>
              <span className="font-semibold">{totalAttempts}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Média:</span>
              <span className="font-semibold">{stats.averageScore}%</span>
            </div>
            {stats.passed && (
              <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-200 text-[10px] sm:text-xs py-0.5 sm:py-1">
                Aprovado
              </Badge>
            )}
          </div>
        )}

        {/* Botão de Ação */}
        <Button
          onClick={handleStartQuiz}
          disabled={isGenerating}
          className="w-full h-10 sm:h-11 text-sm font-semibold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparando quiz...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {totalAttempts > 0 ? 'Fazer Novo Quiz' : 'Fazer Quiz'}
            </>
          )}
        </Button>

        {/* Info */}
        <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
          5 questões · Mínimo 70% para aprovação
        </p>
      </CardContent>
    </Card>
  );
}
