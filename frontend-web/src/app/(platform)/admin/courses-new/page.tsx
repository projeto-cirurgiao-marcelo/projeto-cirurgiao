'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Loader2, BookOpen, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService } from '@/lib/api/courses.service';
import type { Course } from '@/lib/types/course.types';

/**
 * Página de Cursos do Admin (Novo Layout Coursera)
 */
export default function AdminCoursesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Verificar se é admin
    if (user && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      router.push('/student/my-courses');
      return;
    }

    loadCourses();
  }, [user, router]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await coursesService.findAll({ page: 1, limit: 100 });
      const coursesArray = Array.isArray(data) ? data : data.data || [];
      setCourses(coursesArray);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalModules = (course: Course) => {
    return course.modules?.length || 0;
  };

  const getTotalVideos = (course: Course) => {
    return course.modules?.reduce((sum, m) => sum + (m.videos?.length || 0), 0) || 0;
  };

  return (
    <div className="space-y-8">
      {/* Header da Página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Cursos</h1>
          <p className="text-gray-600 mt-1">
            Crie e gerencie os cursos da plataforma
          </p>
        </div>
        <Button
          onClick={() => router.push('/admin/courses/new')}
          className="bg-[rgb(var(--primary-500))] hover:bg-[rgb(var(--primary-600))]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Curso
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-[rgb(var(--primary-500))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">cursos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Módulos</CardTitle>
            <BookOpen className="h-4 w-4 text-[rgb(var(--accent-500))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((sum, c) => sum + getTotalModules(c), 0)}
            </div>
            <p className="text-xs text-muted-foreground">módulos criados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vídeos</CardTitle>
            <Video className="h-4 w-4 text-[rgb(var(--secondary-500))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((sum, c) => sum + getTotalVideos(c), 0)}
            </div>
            <p className="text-xs text-muted-foreground">vídeos publicados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar cursos por título ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Cursos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-[rgb(var(--primary-500))]" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Nenhum curso encontrado' : 'Nenhum curso criado'}
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              {searchQuery
                ? 'Tente ajustar os termos de busca'
                : 'Comece criando seu primeiro curso para aparecer aqui'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => router.push('/admin/courses/new')}
                className="bg-[rgb(var(--primary-500))] hover:bg-[rgb(var(--primary-600))]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Curso
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                    {course.isPublished ? 'Publicado' : 'Rascunho'}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {course.description || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{getTotalModules(course)} módulos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Video className="h-4 w-4" />
                    <span>{getTotalVideos(course)} vídeos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
