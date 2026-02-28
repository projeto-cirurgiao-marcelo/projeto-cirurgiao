'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { progressService, EnrolledCourseWithProgress } from '@/lib/api/progress.service';
import { CourseCard } from '@/components/student/course-card';
import { Loader2, Award, Trophy, Calendar } from 'lucide-react';

/**
 * Página de Cursos Concluídos
 * Mostra apenas cursos 100% completos
 */
export default function CompletedPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const { isStudentView } = useViewModeStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN' && !isStudentView) {
      router.push('/admin/courses');
      return;
    }

    loadCompletedCourses();
  }, [isAuthenticated, user, hasHydrated, isStudentView]);

  const loadCompletedCourses = async () => {
    try {
      const enrolledData = await progressService.getEnrolledCourses();

      // Filtrar apenas cursos concluídos (progresso = 100%)
      const completed = enrolledData
        .filter((course: EnrolledCourseWithProgress) => 
          course.progress.percentage === 100
        )
        .map((course: EnrolledCourseWithProgress) => ({
          ...course,
          enrollment: {
            id: course.enrollment.id,
            enrolledAt: course.enrollment.enrolledAt,
            lastAccessedAt: course.enrollment.lastAccessAt,
            completedAt: course.enrollment.completedAt,
            progress: course.progress.percentage,
          },
          progress: {
            totalVideos: course.progress.totalVideos,
            watchedVideos: course.progress.watchedVideos,
            percentage: course.progress.percentage,
          },
        }))
        // Ordenar por data de conclusão (mais recente primeiro)
        .sort((a, b) => {
          const dateA = new Date(a.enrollment.completedAt || a.enrollment.lastAccessedAt || a.enrollment.enrolledAt).getTime();
          const dateB = new Date(b.enrollment.completedAt || b.enrollment.lastAccessedAt || b.enrollment.enrolledAt).getTime();
          return dateB - dateA;
        });

      setCourses(completed);
    } catch (error) {
      console.error('Erro ao carregar cursos concluídos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCompletionDate = (date: string | null) => {
    if (!date) return 'Data não disponível';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return 'Data inválida';
    }
  };

  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
          <Award className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Cursos Concluídos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Parabéns por completar estes cursos!
          </p>
        </div>
      </div>

      {/* Stats */}
      {courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                <p className="text-xs text-gray-600">Cursos concluídos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {courses.reduce((sum, c) => sum + c.progress.totalVideos, 0)}
                </p>
                <p className="text-xs text-gray-600">Aulas assistidas</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">100%</p>
                <p className="text-xs text-gray-600">Taxa de conclusão</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Congratulations Banner */}
      {courses.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Parabéns pelo seu progresso!
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Você completou {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}. Continue assim!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <div className="p-6 bg-gray-100 rounded-2xl inline-block mb-6">
            <Award className="h-24 w-24 mx-auto text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">
            Nenhum curso concluído ainda
          </h3>
          <p className="text-gray-600 mb-6">
            Complete um curso para vê-lo aqui e ganhar seu certificado
          </p>
          <button
            onClick={() => router.push('/student/my-courses')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Ver Meus Cursos
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lista de cursos concluídos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {courses.map((course) => (
              <div key={course.id} className="relative">
                <CourseCard course={course} />
                {/* Badge de conclusão */}
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Concluído
                </div>
                {/* Data de conclusão */}
                {course.enrollment.completedAt && (
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Concluído em {formatCompletionDate(course.enrollment.completedAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
