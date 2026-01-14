'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService, getErrorMessage } from '@/lib/api';
import type { Course } from '@/lib/types/course.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Página de listagem de cursos (Admin) - Layout de Vitrine
 */
export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'INSTRUCTOR')) {
      loadCourses();
    }
  }, [user]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = user?.role === 'ADMIN' 
        ? await coursesService.findAll({ page: 1, limit: 100 })
        : await coursesService.findMyCourses();
      
      const coursesData = Array.isArray(response) ? response : (response.data || []);
      setCourses(coursesData);
    } catch (error) {
      toast({
        title: 'Erro ao carregar cursos',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este curso?')) {
      return;
    }

    try {
      setDeleting(id);
      await coursesService.delete(id);
      setCourses((prev) => prev.filter((course) => course.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Curso deletado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro ao deletar curso',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-sm font-medium text-gray-600">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Meus Cursos</h1>
        <p className="text-gray-600 mt-1">Gerencie seus cursos e conteúdos</p>
      </div>

      {/* Grid de Cursos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {/* Card de Novo Curso */}
        <button
          onClick={() => router.push('/admin/courses/new')}
          className="group aspect-[9/16] border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 transition-all hover:shadow-lg bg-gray-50/50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-gray-200 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <p className="text-gray-600 group-hover:text-blue-600 font-medium transition-colors">
            Novo curso
          </p>
        </button>

        {/* Cards de Cursos */}
        {courses.map((course) => (
          <div
            key={course.id}
            className="group aspect-[9/16] rounded-2xl overflow-hidden relative shadow-md hover:shadow-2xl transition-all duration-300"
          >
            {/* Background com Thumbnail Vertical */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              style={{
                backgroundImage: course.thumbnailVertical 
                  ? `url(${course.thumbnailVertical})`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {/* Overlay escuro */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
              
              {/* Padrão quando não tem thumbnail */}
              {!course.thumbnailVertical && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/90 px-4">
                    <div className="text-6xl font-bold mb-2">📚</div>
                    <p className="text-sm font-medium">Adicione uma thumbnail</p>
                  </div>
                </div>
              )}
            </div>

            {/* Badge de Status */}
            {course.isPublished && (
              <div className="absolute top-3 right-3 z-10">
                <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg">
                  Publicado
                </Badge>
              </div>
            )}

            {/* Conteúdo do Card */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-4 space-y-3">
              {/* Título */}
              <h3 className="text-white font-bold text-lg line-clamp-2 leading-tight">
                {course.title}
              </h3>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/courses/${course.id}/edit`);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(course.id);
                  }}
                  disabled={deleting === course.id}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensagem quando não há cursos */}
      {courses.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum curso encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            Comece criando seu primeiro curso
          </p>
          <Button onClick={() => router.push('/admin/courses/new')} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro Curso
          </Button>
        </div>
      )}
    </div>
  );
}
