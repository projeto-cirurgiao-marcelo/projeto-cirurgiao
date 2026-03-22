'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService, getErrorMessage } from '@/lib/api';
import type { Course } from '@/lib/types/course.types';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  BookOpen,
  Users,
  Layers,
  MoreVertical,
  Loader2,
  Grid3X3,
  List,
  GripVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/shared/page-transition';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type ViewMode = 'grid' | 'list';

export default function CoursesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    setCourses(prev => {
      const items = Array.from(prev);
      const [removed] = items.splice(sourceIndex, 1);
      items.splice(destIndex, 0, removed);
      return items;
    });
  }, []);

  const filteredCourses = searchQuery
    ? courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : courses;

  const publishedCount = courses.filter(c => c.isPublished).length;
  const totalStudents = courses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0);

  // Drag & drop desabilitado quando há busca ativa (ordem filtrada não faz sentido reordenar)
  const isDragEnabled = !searchQuery;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Meus Cursos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie seus cursos e conteúdos</p>
        </div>
        <Button
          onClick={() => router.push('/admin/courses/new')}
          className="bg-blue-600 hover:bg-blue-700 font-semibold shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Curso
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{courses.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{publishedCount}</p>
            <p className="text-xs text-gray-500">Publicados</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{totalStudents}</p>
            <p className="text-xs text-gray-500">Alunos</p>
          </div>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Courses */}
      {filteredCourses.length === 0 && !searchQuery ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum curso encontrado</h3>
          <p className="text-sm text-gray-500 mb-5">Comece criando seu primeiro curso</p>
          <Button onClick={() => router.push('/admin/courses/new')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-1.5 h-4 w-4" />
            Criar Primeiro Curso
          </Button>
        </div>
      ) : filteredCourses.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum curso encontrado para &quot;{searchQuery}&quot;</p>
        </div>
      ) : viewMode === 'grid' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="courses-grid" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
              >
                {/* New Course Card (not draggable) */}
                <div
                  onClick={() => router.push('/admin/courses/new')}
                  className="group aspect-[9/16] border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 transition-all hover:shadow-md bg-gray-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-3 cursor-pointer w-full h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-500 group-hover:text-blue-600 font-semibold transition-colors">
                    Novo curso
                  </p>
                </div>

                {/* Draggable Course Cards */}
                {filteredCourses.map((course, index) => (
                  <Draggable
                    key={course.id}
                    draggableId={course.id}
                    index={index}
                    isDragDisabled={!isDragEnabled}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group aspect-[9/16] rounded-xl overflow-hidden relative shadow-sm hover:shadow-xl transition-all duration-300 ${
                          snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500 z-50' : ''
                        }`}
                      >
                        {/* Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="absolute top-2.5 left-2.5 z-20 p-1 rounded-md bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 cursor-grab active:cursor-grabbing transition-colors"
                          title="Arraste para reordenar"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{
                            backgroundImage: course.thumbnailVertical
                              ? `url(${course.thumbnailVertical})`
                              : 'linear-gradient(135deg, #0F766E 0%, #059669 50%, #0D9488 100%)',
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm ${
                            course.isPublished
                              ? 'bg-emerald-500 text-white'
                              : 'bg-amber-500 text-white'
                          }`}>
                            {course.isPublished ? 'Publicado' : 'Rascunho'}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="absolute inset-x-0 bottom-0 z-10 p-3 space-y-2">
                          <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight">
                            {course.title}
                          </h3>

                          {/* Stats */}
                          <div className="flex items-center gap-2 text-[10px] text-white/70">
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {course._count?.enrollments || 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Layers className="w-3 h-3" />
                              {course._count?.modules || 0}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/courses/${course.id}/edit`);
                              }}
                              className="flex-1 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20 h-8 text-xs font-semibold"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20 h-8 w-8 p-0"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/courses/${course.id}/edit`);
                                  }}
                                  className="cursor-pointer text-sm"
                                >
                                  <Edit className="mr-2 h-3.5 w-3.5" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(course.id);
                                  }}
                                  disabled={deleting === course.id}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-sm"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        /* List View with drag & drop */
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="courses-list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="divide-y divide-gray-100">
                  {filteredCourses.map((course, index) => (
                    <Draggable
                      key={course.id}
                      draggableId={course.id}
                      index={index}
                      isDragDisabled={!isDragEnabled}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                            snapshot.isDragging ? 'bg-blue-50 shadow-lg ring-1 ring-blue-200 rounded-lg' : ''
                          }`}
                        >
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          {/* Thumbnail */}
                          <div
                            className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0 border border-gray-200"
                            style={{
                              backgroundImage: course.thumbnailVertical
                                ? `url(${course.thumbnailVertical})`
                                : 'linear-gradient(135deg, #0F766E 0%, #059669 100%)',
                            }}
                          />
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">{course.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {course._count?.enrollments || 0} alunos
                              </span>
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {course._count?.modules || 0} módulos
                              </span>
                            </div>
                          </div>
                          {/* Status */}
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            course.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {course.isPublished ? 'Publicado' : 'Rascunho'}
                          </span>
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                              className="h-8 text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(course.id)}
                              disabled={deleting === course.id}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
    </PageTransition>
  );
}
