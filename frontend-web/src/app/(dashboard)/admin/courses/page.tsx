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
        <p>Carregando cursos...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Cursos</h1>
          <p className="text-muted-foreground">
            Gerencie seus cursos e conteúdos
          </p>
        </div>
        <Button onClick={() => router.push('/admin/courses/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Curso
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum curso encontrado</CardTitle>
            <CardDescription>
              Comece criando seu primeiro curso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin/courses/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Curso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Módulos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{course.title}</p>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      R$ {typeof course.price === 'number' ? course.price.toFixed(2) : parseFloat(course.price).toFixed(2)}
                    </TableCell>
                    <TableCell>
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
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTogglePublish(course.id)}
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(course.id)}
                          disabled={deleting === course.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
