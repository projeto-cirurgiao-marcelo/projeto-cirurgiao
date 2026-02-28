'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuizPlayer } from '@/components/quiz/quiz-player';
import { QuizResults } from '@/components/quiz/quiz-results';
import { QuizIntro } from '@/components/quiz/quiz-intro';
import { quizzesService, Quiz, QuizResult, QuizAnswer, QuizStats } from '@/lib/api/quizzes.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const courseId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar quiz
  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [data, stats] = await Promise.all([
        quizzesService.getQuiz(quizId),
        quizzesService.getQuizStats(quizId).catch(() => null)
      ]);
      setQuiz(data);
      setQuizStats(stats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar quiz');
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar o quiz (sair da tela de intro)
  const handleStartQuiz = () => {
    setShowIntro(false);
  };

  // Pular o quiz e voltar para o vídeo
  const handleSkipQuiz = () => {
    handleBack();
  };

  // Submeter respostas
  const handleSubmit = async (answers: QuizAnswer[], totalTime: number) => {
    try {
      setIsSubmitting(true);
      const quizResult = await quizzesService.submitQuiz(quizId, answers, totalTime);
      setResult(quizResult);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao submeter quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tentar novamente
  const handleRetry = () => {
    setResult(null);
    setShowIntro(true);
    loadQuiz();
  };

  // Voltar para o vídeo
  const handleBack = () => {
    if (quiz?.videoId) {
      router.push(`/student/courses/${courseId}/watch/${quiz.videoId}`);
    } else {
      router.push(`/student/courses/${courseId}`);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando quiz...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error
  if (error || !quiz) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-red-600">{error || 'Quiz não encontrado'}</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitting
  if (isSubmitting) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Corrigindo quiz...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">{quiz.title}</h1>
        {quiz.description && (
          <p className="text-muted-foreground mt-2">{quiz.description}</p>
        )}
      </div>

      {/* Conteúdo */}
      {result ? (
        <QuizResults
          result={result}
          quizTitle={quiz.title}
          onRetry={handleRetry}
          onReviewContent={handleBack}
          onClose={handleBack}
        />
      ) : showIntro ? (
        <QuizIntro
          quiz={quiz}
          stats={quizStats || undefined}
          onStart={handleStartQuiz}
          onSkip={handleSkipQuiz}
        />
      ) : (
        <QuizPlayer
          quiz={quiz}
          onSubmit={handleSubmit}
          onCancel={handleBack}
        />
      )}
    </div>
  );
}