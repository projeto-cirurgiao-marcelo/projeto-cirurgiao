'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Loader2,
  Mail,
  TrendingUp,
  Trophy,
  User as UserIcon,
  Activity,
  FileQuestion,
  Play,
  Layers,
} from 'lucide-react';
import { usersService } from '@/lib/api/users.service';
import { getErrorMessage } from '@/lib/api/client';
import type { StudentDetailResponse } from '@/lib/types/user.types';

/**
 * Pagina de detalhes de um aluno individual
 * Exibe informacoes pessoais, matriculas com progresso e resultados de quizzes
 */
export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const { user } = useAuthStore();

  const [student, setStudent] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await usersService.getStudentDetail(studentId);
      setStudent(data);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Erro ao carregar detalhes do aluno:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  // Formatacao de data relativa
  const formatRelativeDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Nunca';
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min atras`;
    if (diffHour < 24) return `${diffHour}h atras`;
    if (diffDay < 7) return `${diffDay}d atras`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}sem atras`;
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Formatacao de data completa
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Iniciais do nome
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Cor do progresso
  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return 'rgb(var(--accent-500))';
    if (progress >= 50) return 'rgb(var(--secondary-500))';
    if (progress >= 20) return 'rgb(var(--primary-500))';
    return '#9ca3af';
  };

  // Cor do score de quiz
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--primary-500))]" />
      </div>
    );
  }

  // Error State
  if (error || !student) {
    return (
      <div className="text-center py-24">
        <UserIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {error || 'Aluno nao encontrado'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Nao foi possivel carregar os detalhes do aluno.
        </p>
        <button
          onClick={() => router.push('/admin/students')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Alunos
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header com botao Voltar */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/students')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Alunos
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Detalhes do Aluno
        </h1>
      </div>

      {/* Card de Informacoes do Aluno */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-full bg-[rgb(var(--primary-500))] flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-white">
                {getInitials(student.name)}
              </span>
            </div>

            {/* Info Principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {student.name}
                </h2>
                <Badge variant={student.isActive ? 'success' : 'destructive'}>
                  {student.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {student.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Cadastrado em {formatDate(student.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Ultimo acesso: {formatRelativeDate(student.lastAccessAt)}
                </span>
              </div>
            </div>
          </div>

          {/* KPIs do Aluno */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.enrollmentCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Cursos Matriculados
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-950/30">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.averageProgress}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Progresso Medio
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30">
              <Trophy className="h-6 w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.quizAverageScore !== null
                  ? `${student.quizAverageScore}%`
                  : '-'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Media nos Quizzes
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30">
              <Activity className="h-6 w-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.totalQuizAttempts}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Quizzes Realizados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Matriculas + Quizzes */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cursos Matriculados (2/3) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[rgb(var(--primary-500))]" />
              Cursos Matriculados
            </CardTitle>
            <CardDescription>
              {student.enrollmentCount === 0
                ? 'Este aluno ainda nao esta matriculado em nenhum curso'
                : `${student.enrollmentCount} curso${student.enrollmentCount > 1 ? 's' : ''} matriculado${student.enrollmentCount > 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student.enrollments.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Nenhuma matricula encontrada
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  O aluno ainda nao se matriculou em nenhum curso.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {student.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {enrollment.courseTitle}
                        </h4>
                        {enrollment.courseDescription && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {enrollment.courseDescription}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          enrollment.progress >= 100
                            ? 'success'
                            : enrollment.progress >= 50
                              ? 'secondary'
                              : 'outline'
                        }
                        className="shrink-0"
                      >
                        {enrollment.progress >= 100
                          ? 'Concluido'
                          : enrollment.progress >= 50
                            ? 'Em Progresso'
                            : 'Iniciado'}
                      </Badge>
                    </div>

                    {/* Barra de progresso */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, enrollment.progress)}%`,
                            backgroundColor: getProgressColor(
                              enrollment.progress
                            ),
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-12 text-right">
                        {Math.round(enrollment.progress)}%
                      </span>
                    </div>

                    {/* Metadados */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {enrollment.courseModules} modulo{enrollment.courseModules !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="h-3.5 w-3.5" />
                        {enrollment.courseVideos} video{enrollment.courseVideos !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Matriculado em{' '}
                        {new Date(enrollment.enrolledAt).toLocaleDateString(
                          'pt-BR',
                          { day: '2-digit', month: 'short', year: 'numeric' }
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Ultimo acesso:{' '}
                        {formatRelativeDate(enrollment.lastAccessAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quizzes Recentes (1/3) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-purple-500" />
              Quizzes Recentes
            </CardTitle>
            <CardDescription>
              {student.totalQuizAttempts === 0
                ? 'Nenhum quiz realizado'
                : `Ultimos ${Math.min(10, student.totalQuizAttempts)} de ${student.totalQuizAttempts} quizzes`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student.recentQuizzes.length === 0 ? (
              <div className="text-center py-12">
                <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Nenhum quiz realizado
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  O aluno ainda nao respondeu nenhum quiz.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {student.recentQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {quiz.quizTitle}
                        </p>
                        {quiz.videoTitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {quiz.moduleTitle
                              ? `${quiz.moduleTitle} > ${quiz.videoTitle}`
                              : quiz.videoTitle}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-lg font-bold shrink-0 ${getScoreColor(quiz.percentage)}`}
                      >
                        {quiz.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>
                        {quiz.correctCount}/{quiz.totalQuestions} acertos
                      </span>
                      <span>
                        {new Date(quiz.attemptedAt).toLocaleDateString(
                          'pt-BR',
                          { day: '2-digit', month: 'short' }
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
