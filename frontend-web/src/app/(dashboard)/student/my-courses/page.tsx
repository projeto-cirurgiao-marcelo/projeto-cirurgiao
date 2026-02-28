'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService, EnrolledCourseWithProgress } from '@/lib/api/progress.service';
import { CourseCard } from '@/components/student/course-card';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { EnrolledCourse } from '@/lib/types/student.types';
import { Course } from '@/lib/types/course.types';

/**
 * Dashboard do Aluno - Catálogo de Cursos (Dark Mode)
 */
export default function MyCoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore();
  const { isStudentView } = useViewModeStore();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aguardar hidratação do Zustand antes de verificar autenticação
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN' && !isStudentView) {
      router.push('/admin/courses');
      return;
    }

    loadCourses();
  }, [isAuthenticated, user, hasHydrated, isStudentView]);

  const loadCourses = async () => {
    try {
      // Carregar cursos matriculados e todos os cursos em paralelo
      const [enrolledData, allCoursesData] = await Promise.all([
        progressService.getEnrolledCourses().catch(() => []),
        coursesService.findAll({ page: 1, limit: 100 }),
      ]);

      const allCoursesArray = Array.isArray(allCoursesData) ? allCoursesData : allCoursesData.data || [];
      const enrolledIds = new Set(enrolledData.map((c: EnrolledCourseWithProgress) => c.id));

      // Converter cursos matriculados para o formato esperado
      const enrolled: any[] = enrolledData.map((course: EnrolledCourseWithProgress) => ({
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
      }));

      // Filtrar cursos disponíveis (não matriculados)
      const available: any[] = allCoursesArray
        .filter((course: Course) => !enrolledIds.has(course.id))
        .map((course: Course) => {
          const totalVideos = course.modules?.reduce((sum: number, m: any) =>
            sum + (m.videos?.length || 0), 0
          ) || 0;

          return {
            ...course,
            enrollment: {
              id: '',
              enrolledAt: '',
              lastAccessedAt: null,
              completedAt: null,
              progress: 0,
            },
            progress: {
              totalVideos,
              watchedVideos: 0,
              percentage: 0,
            },
          };
        });

      setEnrolledCourses(enrolled);
      setAvailableCourses(available);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Separar cursos em progresso (iniciados mas não concluídos)
  const inProgressCourses = enrolledCourses.filter(c => c.progress.percentage > 0 && c.progress.percentage < 100);

  const scrollContainer = (direction: 'left' | 'right', containerId: string) => {
    const container = document.getElementById(containerId);
    if (container) {
      const scrollAmount = 400;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Mostrar loading enquanto aguarda hidratação ou carregamento do usuário
  if (!hasHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      ) : enrolledCourses.length === 0 && availableCourses.length === 0 ? (
        <div className="container mx-auto px-6 py-20 text-center">
          <div className="p-6 bg-gray-100 rounded-2xl inline-block mb-6">
            <BookOpen className="h-24 w-24 mx-auto text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">Nenhum curso disponível</h3>
          <p className="text-gray-600">
            Novos cursos serão adicionados em breve
          </p>
        </div>
      ) : (
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 md:space-y-12">
          {/* Continue Assistindo */}
          {inProgressCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Continue Assistindo</h2>
                <div className="flex gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('left', 'continue-scroll')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('right', 'continue-scroll')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div
                id="continue-scroll"
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {inProgressCourses.map((course) => (
                  <div key={course.id} className="flex-shrink-0 w-[calc(50%-6px)] min-w-[160px] max-w-[200px] sm:w-[200px] md:w-[280px] md:max-w-none">
                    <CourseCard course={course} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Meus Cursos */}
          {enrolledCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Meus Cursos</h2>
                <div className="flex gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('left', 'enrolled-scroll')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('right', 'enrolled-scroll')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div
                id="enrolled-scroll"
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="flex-shrink-0 w-[calc(50%-6px)] min-w-[160px] max-w-[200px] sm:w-[200px] md:w-[280px] md:max-w-none">
                    <CourseCard course={course} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cursos Disponíveis - Linha 1 */}
          {availableCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Cursos Disponíveis</h2>
                <div className="flex gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('left', 'available-scroll-1')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('right', 'available-scroll-1')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div
                id="available-scroll-1"
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {availableCourses.slice(0, 9).map((course) => (
                  <div key={course.id} className="flex-shrink-0 w-[calc(50%-6px)] min-w-[160px] max-w-[200px] sm:w-[200px] md:w-[280px] md:max-w-none">
                    <CourseCard course={course} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cursos Disponíveis - Linha 2 */}
          {availableCourses.length > 9 && (
            <section>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Mais Cursos</h2>
                <div className="flex gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('left', 'available-scroll-2')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('right', 'available-scroll-2')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div
                id="available-scroll-2"
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {availableCourses.slice(9, 18).map((course) => (
                  <div key={course.id} className="flex-shrink-0 w-[calc(50%-6px)] min-w-[160px] max-w-[200px] sm:w-[200px] md:w-[280px] md:max-w-none">
                    <CourseCard course={course} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Todos os Cursos - Linha 3 */}
          {availableCourses.length > 18 && (
            <section>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Explore Mais</h2>
                <div className="flex gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('left', 'available-scroll-3')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollContainer('right', 'available-scroll-3')}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div
                id="available-scroll-3"
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {availableCourses.slice(18).map((course) => (
                  <div key={course.id} className="flex-shrink-0 w-[calc(50%-6px)] min-w-[160px] max-w-[200px] sm:w-[200px] md:w-[280px] md:max-w-none">
                    <CourseCard course={course} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
