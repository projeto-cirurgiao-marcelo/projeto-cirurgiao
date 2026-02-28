'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { progressService, EnrolledCourseWithProgress } from '@/lib/api/progress.service';
import { CourseCard } from '@/components/student/course-card';
import { Loader2, PlayCircle, TrendingUp } from 'lucide-react';

/**
 * Página de Cursos em Progresso
 * Mostra apenas cursos que o aluno começou mas não terminou (0% < progresso < 100%)
 */
export default function InProgressPage() {
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

    loadInProgressCourses();
  }, [isAuthenticated, user, hasHydrated, isStudentView]);

  const loadInProgressCourses = async () => {
    try {
      const enrolledData = await progressService.getEnrolledCourses();

      // Filtrar apenas cursos em progresso (0% < progresso < 100%)
      const inProgress = enrolledData
        .filter((course: EnrolledCourseWithProgress) => 
          course.progress.percentage > 0 && course.progress.percentage < 100
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
        // Ordenar por último acesso (mais recente primeiro)
        .sort((a, b) => {
          const dateA = new Date(a.enrollment.lastAccessedAt || a.enrollment.enrolledAt).getTime();
          const dateB = new Date(b.enrollment.lastAccessedAt || b.enrollment.enrolledAt).getTime();
          return dateB - dateA;
        });

      setCourses(inProgress);
    } catch (error) {
      console.error('Erro ao carregar cursos em progresso:', error);
    } finally {
      setLoading(false);
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
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
          <PlayCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Cursos em Progresso
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Continue de onde parou e complete seus cursos
          </p>
        </div>
      </div>

      {/* Stats */}
      {courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                <p className="text-xs text-gray-600">Cursos em andamento</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    courses.reduce((sum, c) => sum + c.progress.percentage, 0) / courses.length
                  )}%
                </p>
                <p className="text-xs text-gray-600">Progresso médio</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <PlayCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {courses.reduce((sum, c) => sum + c.progress.watchedVideos, 0)}
                </p>
                <p className="text-xs text-gray-600">Aulas assistidas</p>
              </div>
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
            <PlayCircle className="h-24 w-24 mx-auto text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">
            Nenhum curso em progresso
          </h3>
          <p className="text-gray-600 mb-6">
            Comece um curso para vê-lo aqui
          </p>
          <button
            onClick={() => router.push('/student/my-courses')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Explorar Cursos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
