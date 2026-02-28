'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService } from '@/lib/api/progress.service';
import { CourseCard } from '@/components/student/course-card';
import { HeroBanner } from '@/components/student/hero-banner';
import { Loader2, Library, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Course } from '@/lib/types/course.types';

/**
 * Página de Catálogo de Cursos
 * Mostra todos os cursos disponíveis com busca e filtros
 */
export default function CoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const { isStudentView } = useViewModeStore();
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

    loadCourses();
  }, [isAuthenticated, user, hasHydrated, isStudentView]);

  useEffect(() => {
    // Filtrar cursos quando o termo de busca mudar
    if (searchTerm.trim() === '') {
      setFilteredCourses(allCourses);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allCourses.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.description?.toLowerCase().includes(term)
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, allCourses]);

  const loadCourses = async () => {
    try {
      // Carregar cursos matriculados e todos os cursos em paralelo
      const [enrolledData, allCoursesData] = await Promise.all([
        progressService.getEnrolledCourses().catch(() => []),
        coursesService.findAll({ page: 1, limit: 100 }),
      ]);

      const allCoursesArray = Array.isArray(allCoursesData) ? allCoursesData : allCoursesData.data || [];
      const enrolledIdsSet = new Set(enrolledData.map((c: any) => c.id));
      setEnrolledIds(enrolledIdsSet);

      // Mapear todos os cursos com informação de matrícula
      const coursesWithEnrollment = allCoursesArray.map((course: Course) => {
        const isEnrolled = enrolledIdsSet.has(course.id);
        const enrolledCourse = enrolledData.find((c: any) => c.id === course.id);

        const totalVideos = course.modules?.reduce((sum: number, m: any) =>
          sum + (m.videos?.length || 0), 0
        ) || 0;

        return {
          ...course,
          enrollment: isEnrolled && enrolledCourse ? {
            id: enrolledCourse.enrollment.id,
            enrolledAt: enrolledCourse.enrollment.enrolledAt,
            lastAccessedAt: enrolledCourse.enrollment.lastAccessAt,
            completedAt: enrolledCourse.enrollment.completedAt,
            progress: enrolledCourse.progress.percentage,
          } : null,
          progress: isEnrolled && enrolledCourse ? {
            totalVideos: enrolledCourse.progress.totalVideos,
            watchedVideos: enrolledCourse.progress.watchedVideos,
            percentage: enrolledCourse.progress.percentage,
          } : {
            totalVideos,
            watchedVideos: 0,
            percentage: 0,
          },
        };
      });

      setAllCourses(coursesWithEnrollment);
      setFilteredCourses(coursesWithEnrollment);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
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
      {/* Hero Banner */}
      <HeroBanner />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
          <Library className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Catálogo de Cursos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Explore todos os cursos disponíveis
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {/* Filtros futuros */}
        {/* <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button> */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Library className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{allCourses.length}</p>
              <p className="text-xs text-gray-600">Cursos disponíveis</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Library className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{enrolledIds.size}</p>
              <p className="text-xs text-gray-600">Cursos matriculados</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Library className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {allCourses.length - enrolledIds.size}
              </p>
              <p className="text-xs text-gray-600">Novos cursos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      {searchTerm && (
        <div className="text-sm text-gray-600">
          {filteredCourses.length === 0 ? (
            <span>Nenhum curso encontrado para "{searchTerm}"</span>
          ) : (
            <span>
              {filteredCourses.length} {filteredCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
              {searchTerm && ` para "${searchTerm}"`}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-20">
          <div className="p-6 bg-gray-100 rounded-2xl inline-block mb-6">
            {searchTerm ? (
              <Search className="h-24 w-24 mx-auto text-gray-400" />
            ) : (
              <Library className="h-24 w-24 mx-auto text-gray-400" />
            )}
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">
            {searchTerm ? 'Nenhum curso encontrado' : 'Nenhum curso disponível'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Tente buscar com outros termos'
              : 'Novos cursos serão adicionados em breve'}
          </p>
          {searchTerm && (
            <Button
              onClick={() => setSearchTerm('')}
              variant="outline"
            >
              Limpar busca
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
