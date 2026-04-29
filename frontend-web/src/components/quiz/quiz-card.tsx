'use client';

import { useState } from 'react';
import { Trophy, BarChart3, Target } from 'lucide-react';
import { Quiz, QuizStats, quizzesService } from '@/lib/api/quizzes.service';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AtlasAssessmentCTA, type AssessmentStat } from '@/components/atlas';
import { logger } from '@/lib/logger';

interface QuizCardProps {
  quiz?: Quiz;
  stats?: QuizStats;
  videoId: string;
  courseId: string;
}

/**
 * QuizCard para estudantes.
 * Cada clique em "Iniciar avaliação" gera um quiz novo via IA,
 * garantindo que as perguntas sejam diferentes a cada tentativa.
 * Apresentação delegada a AtlasAssessmentCTA.
 */
export function QuizCard({ quiz: _quiz, stats, videoId, courseId }: QuizCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartQuiz = async () => {
    try {
      setIsGenerating(true);
      const newQuiz = await quizzesService.generateQuiz(videoId, {
        questionCount: 5,
        passingScore: 70,
      });
      router.push(`/student/courses/${courseId}/quiz/${newQuiz.id}`);
    } catch (err: any) {
      logger.error('Erro ao preparar quiz:', err);
      const message =
        err?.response?.data?.message ||
        'Erro ao preparar o quiz. Verifique se o vídeo possui transcrição.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const totalAttempts = stats?.totalAttempts ?? 0;
  const hasAttempts = totalAttempts > 0;
  const passed = !!stats?.passed;

  const meta = [
    { text: '5 questões', mono: true },
    { text: '≥ 70% p/ aprovação', mono: true },
    { text: 'tentativas ilimitadas' },
  ];

  const statsRow: AssessmentStat[] | undefined = hasAttempts
    ? [
        {
          label: 'Melhor',
          value: `${stats!.bestScore}%`,
          icon: Trophy,
          tone: passed ? 'success' : 'warn',
        },
        {
          label: 'Tentativas',
          value: String(totalAttempts),
          icon: Target,
        },
        {
          label: 'Média',
          value: `${stats!.averageScore}%`,
          icon: BarChart3,
        },
      ]
    : undefined;

  const ctaLabel = hasAttempts ? 'Tentar novamente' : 'Iniciar avaliação';

  return (
    <AtlasAssessmentCTA
      label={passed ? 'Avaliação aprovada' : 'Avaliação da aula'}
      title={
        passed
          ? 'Você passou nesta avaliação'
          : 'Teste seu conhecimento'
      }
      meta={meta}
      stats={statsRow}
      ctaLabel={ctaLabel}
      busyLabel="Preparando quiz..."
      busy={isGenerating}
      onStart={handleStartQuiz}
      passed={passed}
      variant="card"
    />
  );
}
