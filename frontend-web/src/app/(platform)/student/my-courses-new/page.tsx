'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, ChevronLeft, ChevronRight, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService, EnrolledCourseWithProgress } from '@/lib/api/progress.service';
import type { Course } from '@/lib/types/course.types';

/**
 * Dashboard do Aluno - Meus Cursos (Novo Layout Coursera)
 */
export default function MyCoursesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se é estudante
    if (user && user.role === 'ADMIN') {
      router.push('/admin/courses');
      return;
    }

    loadCourses();
  }, [user, router]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const [enrolledData, allCoursesData] = await Promise.all([
        progressService.getEnrolledCourses().catch(() => []),
        coursesService.findAll({ page: 1, limit: 100 }),
      ]);

      const allCoursesArray = Array.isArray(allCoursesData) ? allCoursesData : allCoursesData.data || [];
      const enrolledIds = new Set(enrolledData.map((c: EnrolledCourseWithProgress) => c.id));

      const enrolled: any[] = enrolledData.map((course: EnrolledCourseWithProgress) => ({
        ...course,
        progress: course.progress.percentage,
      }));

      const available: any[] = allCoursesArray
        .filter((course: Course) => !enrolledIds.has(course.id))
        .map((course: Course) => ({
          ...course,
          progress: 0,
        }));

      setEnrolledCourses(enrolled);
      setAvailableCourses(available);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollContainer = (direction: 'left' | 'right', containerId: string) => {
    const container = document.getElementById(containerId);
    if (container) {
      const scrollAmount = 400;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const inProgressCourses = enrolledCourses.filter(
    (c) => c.progress > 0 && c.progress < 100
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-[rgb(var(--primary-500))]" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Olá, {user?.name?.split(' ')[0] || 'Aluno'}! 👋
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Continue sua jornada de aprendizado em cirurgia
          </p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[rgb(var(--primary-500))]" />
              <span className="text-sm font-medium text-gray-700">
                {enrolledCourses.length} cursos ativos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[rgb(var(--accent-500))]" />
              <span className="text-sm font-medium text-gray-700">
                {inProgressCourses.length} em progresso
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Assistindo */}
      {inProgressCourses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Continue Aprendendo</h2>
              <p className="text-gray-600 text-sm mt-1">
                Retome de onde você parou
              </p>
            </div>
            {inProgressCourses.length > 3 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollContainer('left', 'continue-scroll')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollContainer('right', 'continue-scroll')}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          <div
            id="continue-scroll"
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {inProgressCourses.map((course) => (
              <Card
                key={course.id}
                className="flex-shrink-0 w-[320px] hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/student/courses/${course.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Em andamento
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 group-hover:text-[rgb(var(--primary-600))] transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description || 'Continue assistindo'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-semibold text-[rgb(var(--primary-600))]">
                          {Math.round(course.progress)}%
                        </span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                    <Button className="w-full bg-[rgb(var(--primary-500))] hover:bg-[rgb(var(--primary-600))]">
                      Continuar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Meus Cursos */}
      {enrolledCourses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Meus Cursos</h2>
              <p className="text-gray-600 text-sm mt-1">
                Todos os seus cursos matriculados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <Card
                key={course.id}
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/student/courses/${course.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <Badge
                      variant={course.progress === 100 ? 'default' : 'secondary'}
                      className={
                        course.progress === 100
                          ? 'bg-green-500'
                          : course.progress > 0
                          ? 'bg-blue-100 text-blue-700'
                          : ''
                      }
                    >
                      {course.progress === 100
                        ? 'Concluído'
                        : course.progress > 0
                        ? 'Em andamento'
                        : 'Não iniciado'}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 group-hover:text-[rgb(var(--primary-600))] transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description || 'Clique para acessar'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {course.progress > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-semibold text-[rgb(var(--primary-600))]">
                          {Math.round(course.progress)}%
                        </span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Cursos Disponíveis */}
      {availableCourses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Explore Novos Cursos</h2>
              <p className="text-gray-600 text-sm mt-1">
                Expanda seu conhecimento em cirurgia
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.slice(0, 6).map((course) => (
              <Card
                key={course.id}
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/student/courses/${course.id}`)}
              >
                <CardHeader>
                  <Badge variant="outline" className="w-fit mb-2">
                    Novo
                  </Badge>
                  <CardTitle className="line-clamp-2 group-hover:text-[rgb(var(--primary-600))] transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {course.description || 'Descubra este curso'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-[rgb(var(--primary-500))] group-hover:text-white group-hover:border-[rgb(var(--primary-500))] transition-colors"
                  >
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {enrolledCourses.length === 0 && availableCourses.length === 0 && (
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <BookOpen className="h-20 w-20 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum curso disponível
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Novos cursos serão adicionados em breve. Fique atento!
            </p>
          </CardContent>
        </Card>
      )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
