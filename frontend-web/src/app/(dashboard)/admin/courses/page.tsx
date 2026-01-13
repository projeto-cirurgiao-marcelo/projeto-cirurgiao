'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService, getErrorMessage } from '@/lib/api';
import type { Course } from '@/lib/types/course.types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Página de listagem de cursos (Admin)
 */
export default function CoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    // Apenas carrega os cursos quando tiver usuário autenticado
    if (user && (user.role === 'ADMIN' || user.role === 'INSTRUCTOR')) {
      loadCourses();
    }
  }, [user]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      // ADMIN vê todos os cursos, INSTRUCTOR vê apenas os seus
      const response = user?.role === 'ADMIN' 
        ? await coursesService.findAll({ page: 1, limit: 100 })
        : await coursesService.findMyCourses();
      
      // A resposta pode ser um array direto ou um objeto com data
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

  const handleTogglePublish = async (id: string) => {
    try {
      const updatedCourse = await coursesService.togglePublish(id);
      setCourses((prev) =>
        prev.map((course) => (course.id === id ? updatedCourse : course))
      );
      toast({
        title: 'Sucesso',
        description: `Curso ${updatedCourse.isPublished ? 'publicado' : 'despublicado'} com sucesso`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar curso',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
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
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Meus Cursos</h1>
          <p className="text-gray-600 mt-1">
            Gerencie seus cursos e conteúdos
          </p>
        </div>
        <Button onClick={() => router.push('/admin/courses/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Curso
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-4 bg-gray-100 rounded-2xl inline-block">
              <Plus className="h-12 w-12 text-gray-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Nenhum curso encontrado</CardTitle>
            <CardDescription className="text-gray-600">
              Comece criando seu primeiro curso
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <Button onClick={() => router.push('/admin/courses/new')} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Curso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200 hover:bg-gray-50">
                    <TableHead className="font-bold text-gray-900">Título</TableHead>
                    <TableHead className="font-bold text-gray-900">Preço</TableHead>
                    <TableHead className="font-bold text-gray-900">Módulos</TableHead>
                    <TableHead className="font-bold text-gray-900">Status</TableHead>
                    <TableHead className="text-right font-bold text-gray-900">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow 
                      key={course.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{course.title}</p>
                          {course.description && (
                            <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        R$ {typeof course.price === 'number' ? course.price.toFixed(2) : parseFloat(course.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {course._count?.modules || 0} módulos
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={course.isPublished ? 'default' : 'secondary'}
                        >
                          {course.isPublished ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTogglePublish(course.id)}
                            className="h-8 w-8 p-0"
                            title={course.isPublished ? 'Despublicar' : 'Publicar'}
                          >
                            {course.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/admin/courses/${course.id}/edit`)
                            }
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(course.id)}
                            disabled={deleting === course.id}
                            className="h-8 w-8 p-0 hover:text-red-600"
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
