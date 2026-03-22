'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2, ArrowLeft, Save, Plus, GripVertical, Pencil, Trash2,
  Video as VideoIcon, ChevronDown, ChevronUp, Eye, EyeOff,
  FolderOpen, FolderClosed, FileVideo, MoveRight, ChevronRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { DropResult } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { coursesService, modulesService, videosService } from '@/lib/api';
import type { Course, Module, Video } from '@/lib/types/course.types';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';

const DragDropContext = dynamic(
  () => import('@hello-pangea/dnd').then((mod) => mod.DragDropContext),
  { ssr: false }
);
const Droppable = dynamic(
  () => import('@hello-pangea/dnd').then((mod) => mod.Droppable),
  { ssr: false }
);
const Draggable = dynamic(
  () => import('@hello-pangea/dnd').then((mod) => mod.Draggable),
  { ssr: false }
);

const courseFormSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  description: z.string().min(10, 'A descrição deve ter no mínimo 10 caracteres'),
  price: z.string().min(1, 'O preço é obrigatório'),
  thumbnailVertical: z.string().url('URL inválida').optional().or(z.literal('')),
  thumbnailHorizontal: z.string().url('URL inválida').optional().or(z.literal('')),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moveVideoDialog, setMoveVideoDialog] = useState<{ video: Video; currentModuleId: string } | null>(null);
  const [moveTargetModuleId, setMoveTargetModuleId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  const [isCourseInfoCollapsed, setIsCourseInfoCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('course-info-collapsed');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('course-info-collapsed', String(isCourseInfoCollapsed));
    }
  }, [isCourseInfoCollapsed]);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { title: '', description: '', price: '', thumbnailVertical: '', thumbnailHorizontal: '' },
  });

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setIsLoading(true);
        const data = await coursesService.getById(courseId);
        setCourse(data);
        form.reset({
          title: data.title,
          description: data.description || '',
          price: typeof data.price === 'number' ? data.price.toString() : data.price,
          thumbnailVertical: data.thumbnailVertical || '',
          thumbnailHorizontal: data.thumbnailHorizontal || data.thumbnail || '',
        });
        await loadModules();
      } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível carregar o curso.', variant: 'destructive' });
        router.push('/admin/courses');
      } finally {
        setIsLoading(false);
      }
    };
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadModules = async () => {
    try {
      setIsLoadingModules(true);
      const data = await modulesService.list(courseId);
      setModules(data);
      // Expandir todos os módulos por padrão
      setExpandedModules(new Set(data.map(m => m.id)));
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os módulos.', variant: 'destructive' });
    } finally {
      setIsLoadingModules(false);
    }
  };

  const onSubmit = async (values: CourseFormValues) => {
    try {
      setIsSaving(true);
      await coursesService.update(courseId, {
        title: values.title,
        description: values.description,
        price: parseFloat(values.price),
        thumbnailVertical: values.thumbnailVertical || undefined,
        thumbnailHorizontal: values.thumbnailHorizontal || undefined,
      });
      toast({ title: 'Sucesso', description: 'Curso atualizado com sucesso!' });
      const updatedCourse = await coursesService.getById(courseId);
      setCourse(updatedCourse);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o curso.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  // Drag & drop handler - suporta reordenar módulos E mover vídeos entre módulos
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'MODULE') {
      // Reordenar módulos
      if (source.index === destination.index) return;
      const items = Array.from(modules);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);
      setModules(items);

      try {
        const updates = items.map((module, index) => ({
          id: module.id,
          order: parseInt(String(index + 1), 10),
        }));
        await modulesService.reorder(courseId, { modules: updates });
        toast({ title: 'Sucesso', description: 'Ordem dos módulos atualizada!' });
      } catch (error: any) {
        toast({ title: 'Erro ao reordenar', description: 'Não foi possível reordenar os módulos.', variant: 'destructive' });
        await loadModules();
      }
    } else if (type === 'VIDEO') {
      const sourceModuleId = source.droppableId;
      const destModuleId = destination.droppableId;

      if (sourceModuleId === destModuleId) {
        // Reordenar vídeos dentro do mesmo módulo
        const moduleIndex = modules.findIndex(m => m.id === sourceModuleId);
        if (moduleIndex === -1) return;
        const videos = Array.from(modules[moduleIndex].videos || []);
        const [removed] = videos.splice(source.index, 1);
        videos.splice(destination.index, 0, removed);

        const updatedModules = [...modules];
        updatedModules[moduleIndex] = { ...updatedModules[moduleIndex], videos };
        setModules(updatedModules);

        try {
          const videoOrders = videos.map((v, i) => ({ id: v.id, order: i + 1 }));
          await videosService.reorder(sourceModuleId, { videoOrders });
        } catch {
          await loadModules();
        }
      } else {
        // Mover vídeo entre módulos
        const srcModIdx = modules.findIndex(m => m.id === sourceModuleId);
        const dstModIdx = modules.findIndex(m => m.id === destModuleId);
        if (srcModIdx === -1 || dstModIdx === -1) return;

        const srcVideos = Array.from(modules[srcModIdx].videos || []);
        const dstVideos = Array.from(modules[dstModIdx].videos || []);
        const [movedVideo] = srcVideos.splice(source.index, 1);
        dstVideos.splice(destination.index, 0, movedVideo);

        const updatedModules = [...modules];
        updatedModules[srcModIdx] = {
          ...updatedModules[srcModIdx],
          videos: srcVideos,
          _count: { videos: srcVideos.length },
        };
        updatedModules[dstModIdx] = {
          ...updatedModules[dstModIdx],
          videos: dstVideos,
          _count: { videos: dstVideos.length },
        };
        setModules(updatedModules);

        try {
          await videosService.moveToModule(movedVideo.id, destModuleId);
          toast({ title: 'Sucesso', description: `"${movedVideo.title}" movido para "${modules[dstModIdx].title}"` });
          // Reordenar no módulo destino (best-effort, não bloqueia o sucesso)
          try {
            const videoOrders = dstVideos.map((v, i) => ({ id: v.id, order: i + 1 }));
            await videosService.reorder(destModuleId, { videoOrders });
          } catch {
            // Reordenação falhou mas o move foi bem sucedido
          }
          await loadModules(); // Recarregar para sincronizar estado
        } catch {
          toast({ title: 'Erro', description: 'Não foi possível mover o vídeo.', variant: 'destructive' });
          await loadModules();
        }
      }
    }
  }, [modules, courseId, toast]);

  // Mover vídeo via dialog
  const handleMoveVideo = async () => {
    if (!moveVideoDialog || !moveTargetModuleId) return;
    try {
      setIsMoving(true);
      await videosService.moveToModule(moveVideoDialog.video.id, moveTargetModuleId);
      const targetModule = modules.find(m => m.id === moveTargetModuleId);
      toast({ title: 'Sucesso', description: `"${moveVideoDialog.video.title}" movido para "${targetModule?.title}"` });
      setMoveVideoDialog(null);
      setMoveTargetModuleId('');
      await loadModules();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível mover o vídeo.', variant: 'destructive' });
    } finally {
      setIsMoving(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      setIsTogglingPublish(true);
      const updatedCourse = await coursesService.togglePublish(courseId);
      setCourse(updatedCourse);
      toast({ title: 'Sucesso', description: updatedCourse.isPublished ? 'Curso publicado!' : 'Curso despublicado!' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível alterar o status de publicação.', variant: 'destructive' });
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja deletar este módulo? Esta ação não pode ser desfeita.')) return;
    try {
      await modulesService.delete(moduleId);
      toast({ title: 'Sucesso', description: 'Módulo deletado com sucesso!' });
      await loadModules();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível deletar o módulo.', variant: 'destructive' });
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Tem certeza que deseja deletar este vídeo?')) return;
    try {
      await videosService.delete(videoId);
      toast({ title: 'Sucesso', description: 'Vídeo deletado com sucesso!' });
      await loadModules();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível deletar o vídeo.', variant: 'destructive' });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/courses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Editar Curso</h1>
            <p className="text-gray-600 mt-2">Atualize as informações do curso e gerencie seus módulos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={course.isPublished ? 'default' : 'secondary'}>
            {course.isPublished ? 'Publicado' : 'Rascunho'}
          </Badge>
          <Button onClick={handleTogglePublish} disabled={isTogglingPublish} variant={course.isPublished ? 'outline' : 'default'}>
            {isTogglingPublish ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : course.isPublished ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {isTogglingPublish ? 'Processando...' : course.isPublished ? 'Despublicar' : 'Publicar Curso'}
          </Button>
        </div>
      </div>

      {/* Formulário de Edição */}
      <Card className="mb-8">
        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsCourseInfoCollapsed(!isCourseInfoCollapsed)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Informações do Curso</CardTitle>
              <CardDescription>Atualize os dados básicos do curso</CardDescription>
            </div>
            <Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); setIsCourseInfoCollapsed(!isCourseInfoCollapsed); }}>
              {isCourseInfoCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCourseInfoCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título do Curso</FormLabel><FormControl><Input placeholder="Ex: Curso Completo de React" {...field} /></FormControl><FormDescription>O título principal do seu curso</FormDescription><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva o conteúdo do curso..." className="min-h-[120px]" {...field} /></FormControl><FormDescription>Uma descrição detalhada do que os alunos aprenderão</FormDescription><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Preço (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="99.90" {...field} /></FormControl><FormDescription>Valor do curso em reais</FormDescription><FormMessage /></FormItem>
                )} />
                <Separator className="my-6" />
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Thumbnails do Curso</h3>
                    <p className="text-sm text-muted-foreground mb-6">Faça upload das imagens de capa do curso.</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <FormField control={form.control} name="thumbnailHorizontal" render={({ field }) => (
                      <FormItem><FormLabel>Thumbnail Horizontal (16:9)</FormLabel><FormControl><ThumbnailUpload value={field.value} onChange={field.onChange} aspectRatio="horizontal" label="Thumbnail horizontal" /></FormControl><FormDescription>Imagem para exibição em desktop e tablet</FormDescription><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="thumbnailVertical" render={({ field }) => (
                      <FormItem><FormLabel>Thumbnail Vertical (9:16) - Opcional</FormLabel><FormControl><ThumbnailUpload value={field.value} onChange={field.onChange} aspectRatio="vertical" label="Thumbnail vertical" /></FormControl><FormDescription>Imagem para exibição em dispositivos móveis</FormDescription><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar Alterações</>}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </div>
      </Card>

      <Separator className="my-8" />

      {/* Gestão de Módulos - Estilo Drive/Pastas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estrutura do Curso</CardTitle>
              <CardDescription>
                Arraste módulos para reordenar. Arraste vídeos entre módulos para reorganizar.
              </CardDescription>
            </div>
            <Button onClick={() => router.push(`/admin/courses/${courseId}/modules/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Módulo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingModules ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Nenhum módulo criado ainda</p>
              <Button variant="outline" onClick={() => router.push(`/admin/courses/${courseId}/modules/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Módulo
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="modules" type="MODULE">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {modules.map((module, moduleIndex) => {
                      const isExpanded = expandedModules.has(module.id);
                      const videos = module.videos || [];
                      return (
                        <Draggable key={module.id} draggableId={module.id} index={moduleIndex}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border rounded-lg overflow-hidden transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-400' : 'shadow-sm'}`}
                            >
                              {/* Module Header (Pasta) */}
                              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <button onClick={() => toggleModule(module.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                  {isExpanded
                                    ? <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    : <FolderClosed className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                                  <span className="font-semibold text-sm truncate">{module.title}</span>
                                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                    {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                                  </Badge>
                                  <ChevronRight className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/admin/modules/${module.id}/videos`)} title="Gerenciar vídeos">
                                    <VideoIcon className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/admin/courses/${courseId}/modules/${module.id}/edit`)} title="Editar módulo">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteModule(module.id)} title="Deletar módulo">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </div>

                              {/* Videos inside module (Arquivos dentro da pasta) */}
                              {isExpanded && (
                                <Droppable droppableId={module.id} type="VIDEO">
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`min-h-[40px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-white'}`}
                                    >
                                      {videos.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                          <FileVideo className="h-6 w-6 mx-auto mb-1.5 text-gray-300" />
                                          Arraste vídeos para cá ou adicione via "Gerenciar vídeos"
                                        </div>
                                      ) : (
                                        videos.map((video, videoIndex) => (
                                          <Draggable key={video.id} draggableId={video.id} index={videoIndex}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`flex items-center gap-2.5 px-4 py-2 border-b last:border-b-0 text-sm transition-colors ${
                                                  snapshot.isDragging ? 'bg-blue-100 shadow-md rounded' : 'hover:bg-gray-50'
                                                }`}
                                              >
                                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                                                  <GripVertical className="h-3.5 w-3.5" />
                                                </div>
                                                <FileVideo className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                <span className="flex-1 truncate text-gray-700">{video.title}</span>
                                                {video.duration ? (
                                                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDuration(video.duration)}</span>
                                                ) : null}
                                                <Badge variant={video.uploadStatus === 'READY' ? 'default' : 'secondary'} className="text-[10px] h-5 flex-shrink-0">
                                                  {video.uploadStatus === 'READY' ? 'Pronto' : video.uploadStatus || 'Pendente'}
                                                </Badge>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                                      <Pencil className="h-3 w-3" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem onClick={() => router.push(`/admin/courses/${courseId}/modules/${module.id}/edit`)} className="text-xs cursor-pointer">
                                                      <Pencil className="mr-2 h-3 w-3" />
                                                      Editar vídeo
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                      onClick={() => {
                                                        setMoveVideoDialog({ video, currentModuleId: module.id });
                                                        setMoveTargetModuleId('');
                                                      }}
                                                      className="text-xs cursor-pointer"
                                                    >
                                                      <MoveRight className="mr-2 h-3 w-3" />
                                                      Mover para...
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteVideo(video.id)} className="text-xs cursor-pointer text-red-600 focus:text-red-600">
                                                      <Trash2 className="mr-2 h-3 w-3" />
                                                      Deletar
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))
                                      )}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Dialog "Mover para..." */}
      <Dialog open={!!moveVideoDialog} onOpenChange={(open) => !open && setMoveVideoDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover Vídeo</DialogTitle>
            <DialogDescription>
              Mover &quot;{moveVideoDialog?.video.title}&quot; para outro módulo
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={moveTargetModuleId} onValueChange={setMoveTargetModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o módulo destino" />
              </SelectTrigger>
              <SelectContent>
                {modules
                  .filter(m => m.id !== moveVideoDialog?.currentModuleId)
                  .map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <FolderClosed className="h-3.5 w-3.5" />
                        {m.title}
                        <span className="text-muted-foreground text-xs">({(m.videos || []).length} vídeos)</span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveVideoDialog(null)}>Cancelar</Button>
            <Button onClick={handleMoveVideo} disabled={!moveTargetModuleId || isMoving}>
              {isMoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MoveRight className="mr-2 h-4 w-4" />}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
