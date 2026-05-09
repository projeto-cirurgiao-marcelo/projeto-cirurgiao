'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2, ArrowLeft, Save, Plus, GripVertical, Pencil, Trash2,
  Video as VideoIcon, ChevronDown, ChevronUp, Eye, EyeOff,
  FolderOpen, FolderClosed, FileVideo, MoveRight, ChevronRight,
  Sparkles, Wand2,
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
import { aiTextService } from '@/lib/api/ai-text.service';
import type { Course, Module, Video } from '@/lib/types/course.types';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';
import { MoveToModal } from '@/components/tree/move-to-modal';
import type { TreeNodeData } from '@/components/tree/types';
import { logger } from '@/lib/logger';

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
  // Modal generico pra mover Module entre raiz/submodulo.
  const [moveModuleDialog, setMoveModuleDialog] = useState<{
    module: Module;
  } | null>(null);
  const [aiBusy, setAiBusy] = useState<'idle' | 'title' | 'description' | 'thumbnail-h' | 'thumbnail-v'>('idle');

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
      // Modulos comecam fechados — admin abre conforme precisa.
      // Sem persistencia entre navegacoes (estado in-memory).
      setExpandedModules(new Set());
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

  // Hierarquia: separa modulos raiz (parentModuleId IS NULL) dos filhos
  // agrupados por parentId. Backend ja entrega ordenado por
  // (parentModuleId ASC, order ASC), preservamos a ordem.
  const { rootModules, childrenByParent } = useMemo(() => {
    const roots: Module[] = [];
    const map = new Map<string, Module[]>();
    for (const m of modules) {
      if (m.parentModuleId) {
        const arr = map.get(m.parentModuleId) ?? [];
        arr.push(m);
        map.set(m.parentModuleId, arr);
      } else {
        roots.push(m);
      }
    }
    return { rootModules: roots, childrenByParent: map };
  }, [modules]);

  // Tree pro MoveToModal: nodes representam ESCOPOS validos pra Module
  // virar filho. Cada raiz vira node, com hint mostrando count de filhos.
  const moduleTreeNodes = useMemo<TreeNodeData[]>(() => {
    return modules
      .filter((m) => !m.parentModuleId)
      .map((m) => {
        const childCount = childrenByParent.get(m.id)?.length ?? 0;
        return {
          id: m.id,
          parentId: null,
          label: m.title,
          position: m.order,
          hint: childCount > 0 ? `${childCount} submódulos` : undefined,
        };
      });
  }, [modules, childrenByParent]);

  const handleMoveModuleConfirm = useCallback(async (targetParentId: string | null) => {
    if (!moveModuleDialog) return;
    try {
      await modulesService.update(moveModuleDialog.module.id, {
        parentModuleId: targetParentId,
      } as any);
      toast({
        title: 'Sucesso',
        description: targetParentId
          ? 'Módulo movido para submódulo'
          : 'Módulo promovido para raiz',
      });
      await loadModules();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Não foi possível mover o módulo';
      toast({ title: 'Erro ao mover', description: msg, variant: 'destructive' });
      throw error;
    }
  }, [moveModuleDialog, toast]);

  const handleAddSubmodule = useCallback(async (parentModuleId: string) => {
    const title = prompt('Nome do novo submódulo:');
    if (!title || !title.trim()) return;
    try {
      // Backend resolve ordem automaticamente via getNextOrderInScope quando
      // a chamada vem de outro lugar; mas createDto exige order. Usamos length atual.
      const existingChildren = childrenByParent.get(parentModuleId)?.length ?? 0;
      await modulesService.create(courseId, {
        title: title.trim(),
        order: existingChildren + 1,
        parentModuleId,
      } as any);
      toast({ title: 'Submódulo criado', description: title.trim() });
      await loadModules();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Erro ao criar submódulo';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    }
  }, [courseId, childrenByParent, toast]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  // Drag & drop handler — scopes:
  //  - MODULE_ROOT: reorder modulos raiz (parentModuleId IS NULL).
  //  - MODULE_CHILD_<parentId>: reorder submodulos do mesmo pai.
  //  - VIDEO: reorder/move videos entre modulos.
  // Cross-parent de Module e via "Mover para..." dropdown — drag-drop nao
  // gerencia mudancas de parentModuleId (UX mais previsivel).
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'MODULE_ROOT') {
      if (source.index === destination.index) return;
      const items = Array.from(rootModules);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);
      // Reflete no estado: substitui apenas os raizes, mantendo filhos.
      const otherModules = modules.filter((m) => m.parentModuleId);
      setModules([...items.map((m, i) => ({ ...m, order: i + 1 })), ...otherModules]);

      try {
        const updates = items.map((module, index) => ({
          id: module.id,
          order: index + 1,
        }));
        await modulesService.reorder(courseId, { modules: updates, parentModuleId: null } as any);
        toast({ title: 'Sucesso', description: 'Ordem dos módulos atualizada!' });
      } catch (error: any) {
        const msg = error?.response?.data?.message || 'Não foi possível reordenar os módulos.';
        toast({ title: 'Erro ao reordenar', description: msg, variant: 'destructive' });
        await loadModules();
      }
      return;
    }

    if (typeof type === 'string' && type.startsWith('MODULE_CHILD_')) {
      const parentId = type.slice('MODULE_CHILD_'.length);
      if (source.index === destination.index && source.droppableId === destination.droppableId) return;
      const children = childrenByParent.get(parentId) ?? [];
      const items = Array.from(children);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);
      const newChildIds = new Set(items.map((m) => m.id));
      setModules((prev) =>
        prev.map((m) => {
          if (!newChildIds.has(m.id)) return m;
          const idx = items.findIndex((x) => x.id === m.id);
          return { ...m, order: idx + 1 };
        }),
      );

      try {
        const updates = items.map((m, i) => ({ id: m.id, order: i + 1 }));
        await modulesService.reorder(courseId, { modules: updates, parentModuleId: parentId } as any);
        toast({ title: 'Sucesso', description: 'Ordem dos submódulos atualizada!' });
      } catch (error: any) {
        const msg = error?.response?.data?.message || 'Não foi possível reordenar os submódulos.';
        toast({ title: 'Erro', description: msg, variant: 'destructive' });
        await loadModules();
      }
      return;
    }

    if (type === 'VIDEO') {
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
          await videosService.reorder(sourceModuleId, { videos: videoOrders });
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
            await videosService.reorder(destModuleId, { videos: videoOrders });
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
  }, [modules, rootModules, childrenByParent, courseId, toast]);

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
    <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/courses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="atlas-caps text-atlas-muted mb-1.5">ADMIN · CURSOS</div>
            <h1 className="font-serif text-[22px] sm:text-[26px] font-medium tracking-[-0.015em] leading-[1.15] text-atlas-ink">
              Editar Curso
            </h1>
            <p className="text-[13px] text-atlas-muted mt-1">Atualize as informações do curso e gerencie seus módulos</p>
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
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Título do Curso</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
                        disabled={!field.value?.trim() || isSaving || aiBusy !== 'idle'}
                        onClick={async () => {
                          const current = field.value?.trim();
                          if (!current) return;
                          try {
                            setAiBusy('title');
                            toast({ title: 'IA', description: 'Melhorando título...' });
                            const improved = await aiTextService.improveText(current, 'title');
                            form.setValue('title', improved, { shouldDirty: true, shouldValidate: true });
                            toast({ title: 'Pronto', description: 'Título melhorado pela IA' });
                          } catch (err) {
                            logger.error('[IA course title]', err);
                            toast({ title: 'Erro', description: 'Não foi possível melhorar o título', variant: 'destructive' });
                          } finally {
                            setAiBusy('idle');
                          }
                        }}
                      >
                        {aiBusy === 'title' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Melhorar com IA
                      </Button>
                    </div>
                    <FormControl><Input placeholder="Ex: Curso Completo de React" {...field} /></FormControl>
                    <FormDescription>O título principal do seu curso</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => {
                  const titleValue = form.watch('title')?.trim() ?? '';
                  const descriptionValue = field.value?.trim() ?? '';
                  return (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Descrição</FormLabel>
                        <div className="flex gap-1">
                          {!descriptionValue && titleValue && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-atlas-primary hover:text-atlas-primary-2 hover:bg-atlas-primary-soft gap-1"
                              disabled={isSaving || aiBusy !== 'idle'}
                              onClick={async () => {
                                if (!titleValue) return;
                                try {
                                  setAiBusy('description');
                                  toast({ title: 'IA', description: 'Gerando descrição...' });
                                  const desc = await aiTextService.generateDescription(titleValue);
                                  form.setValue('description', desc, { shouldDirty: true, shouldValidate: true });
                                  toast({ title: 'Pronto', description: 'Descrição gerada pela IA' });
                                } catch (err) {
                                  logger.error('[IA course description gen]', err);
                                  toast({ title: 'Erro', description: 'Não foi possível gerar a descrição', variant: 'destructive' });
                                } finally {
                                  setAiBusy('idle');
                                }
                              }}
                            >
                              {aiBusy === 'description' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                              Gerar com IA
                            </Button>
                          )}
                          {descriptionValue && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
                              disabled={isSaving || aiBusy !== 'idle'}
                              onClick={async () => {
                                if (!descriptionValue) return;
                                try {
                                  setAiBusy('description');
                                  toast({ title: 'IA', description: 'Melhorando descrição...' });
                                  const improved = await aiTextService.improveText(descriptionValue, 'description', titleValue);
                                  form.setValue('description', improved, { shouldDirty: true, shouldValidate: true });
                                  toast({ title: 'Pronto', description: 'Descrição melhorada pela IA' });
                                } catch (err) {
                                  logger.error('[IA course description improve]', err);
                                  toast({ title: 'Erro', description: 'Não foi possível melhorar a descrição', variant: 'destructive' });
                                } finally {
                                  setAiBusy('idle');
                                }
                              }}
                            >
                              {aiBusy === 'description' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              Melhorar com IA
                            </Button>
                          )}
                        </div>
                      </div>
                      <FormControl><Textarea placeholder="Descreva o conteúdo do curso..." className="min-h-[120px]" {...field} /></FormControl>
                      <FormDescription>Uma descrição detalhada do que os alunos aprenderão</FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }} />
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
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Thumbnail Horizontal (16:9)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                            disabled={!form.watch('title')?.trim() || isSaving || aiBusy !== 'idle'}
                            onClick={async () => {
                              const title = form.watch('title')?.trim();
                              if (!title) return;
                              try {
                                setAiBusy('thumbnail-h');
                                toast({ title: 'IA', description: 'Gerando thumbnail horizontal... Isso pode levar alguns segundos.' });
                                const url = await aiTextService.generateThumbnail(title, { overlayText: title, style: 'medical' });
                                form.setValue('thumbnailHorizontal', url, { shouldDirty: true, shouldValidate: true });
                                toast({ title: 'Pronto', description: 'Thumbnail horizontal gerada e enviada ao R2' });
                              } catch (err) {
                                logger.error('[IA course thumbnail-h]', err);
                                toast({ title: 'Erro', description: 'Não foi possível gerar a thumbnail horizontal', variant: 'destructive' });
                              } finally {
                                setAiBusy('idle');
                              }
                            }}
                          >
                            {aiBusy === 'thumbnail-h' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Gerar com IA
                          </Button>
                        </div>
                        <FormControl><ThumbnailUpload value={field.value} onChange={field.onChange} aspectRatio="horizontal" label="Thumbnail horizontal" /></FormControl>
                        <FormDescription>Imagem para exibição em desktop e tablet</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="thumbnailVertical" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Thumbnail Vertical (9:16) - Opcional</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                            disabled={!form.watch('title')?.trim() || isSaving || aiBusy !== 'idle'}
                            onClick={async () => {
                              const title = form.watch('title')?.trim();
                              if (!title) return;
                              try {
                                setAiBusy('thumbnail-v');
                                toast({ title: 'IA', description: 'Gerando thumbnail vertical... Isso pode levar alguns segundos.' });
                                const url = await aiTextService.generateThumbnail(title, { overlayText: title, style: 'medical', aspectRatio: 'vertical' });
                                form.setValue('thumbnailVertical', url, { shouldDirty: true, shouldValidate: true });
                                toast({ title: 'Pronto', description: 'Thumbnail vertical gerada e enviada ao R2' });
                              } catch (err) {
                                logger.error('[IA course thumbnail-v]', err);
                                toast({ title: 'Erro', description: 'Não foi possível gerar a thumbnail vertical', variant: 'destructive' });
                              } finally {
                                setAiBusy('idle');
                              }
                            }}
                          >
                            {aiBusy === 'thumbnail-v' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Gerar com IA
                          </Button>
                        </div>
                        <FormControl><ThumbnailUpload value={field.value} onChange={field.onChange} aspectRatio="vertical" label="Thumbnail vertical" /></FormControl>
                        <FormDescription>Imagem para exibição em dispositivos móveis</FormDescription>
                        <FormMessage />
                      </FormItem>
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
              {(() => {
                /**
                 * Helper inline pra renderizar Module (raiz ou filho).
                 * Closures capturam: courseId, expandedModules, toggleModule,
                 * router, handleDeleteModule, handleDeleteVideo, setMoveVideoDialog,
                 * setMoveModuleDialog, handleAddSubmodule, childrenByParent.
                 */
                const renderVideosDroppable = (module: Module) => {
                  const videos = module.videos || [];
                  return (
                    <Droppable droppableId={module.id} type="VIDEO">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[40px] transition-colors ${snapshot.isDraggingOver ? 'bg-atlas-primary-soft' : 'bg-white'}`}
                        >
                          {videos.length === 0 ? (
                            <div className="px-4 py-3 text-center text-xs text-muted-foreground">
                              <FileVideo className="h-5 w-5 mx-auto mb-1 text-atlas-muted-2" />
                              Arraste vídeos para cá ou adicione via &quot;Gerenciar vídeos&quot;
                            </div>
                          ) : (
                            videos.map((video, videoIndex) => (
                              <Draggable key={video.id} draggableId={video.id} index={videoIndex}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`flex items-center gap-2.5 px-4 py-2 border-b last:border-b-0 text-sm transition-colors ${
                                      snapshot.isDragging ? 'bg-atlas-primary-soft shadow-md rounded' : 'hover:bg-atlas-surface-2'
                                    }`}
                                  >
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-atlas-muted-2 hover:text-atlas-muted">
                                      <GripVertical className="h-3.5 w-3.5" />
                                    </div>
                                    <FileVideo className="h-3.5 w-3.5 text-atlas-muted-2 flex-shrink-0" />
                                    <span className="flex-1 truncate text-atlas-ink-2">{video.title}</span>
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
                  );
                };

                const renderModuleHeader = (
                  module: Module,
                  dragHandleProps: any,
                  opts: { isChild: boolean; childCount?: number },
                ) => {
                  const isExpanded = expandedModules.has(module.id);
                  const videos = module.videos || [];
                  return (
                    <div className={`flex items-center gap-2 px-3 py-2.5 ${opts.isChild ? 'bg-atlas-surface' : 'bg-atlas-surface-2'} border-b`}>
                      <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-atlas-muted-2 hover:text-atlas-ink-2">
                        <GripVertical className={opts.isChild ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                      </div>
                      <button onClick={() => toggleModule(module.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        {isExpanded
                          ? <FolderOpen className={`${opts.isChild ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-blue-500 flex-shrink-0`} />
                          : <FolderClosed className={`${opts.isChild ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-blue-500 flex-shrink-0`} />}
                        <span className={`${opts.isChild ? 'text-xs font-medium' : 'text-sm font-semibold'} truncate`}>{module.title}</span>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                        </Badge>
                        {!opts.isChild && opts.childCount !== undefined && opts.childCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                            {opts.childCount} sub{opts.childCount === 1 ? '' : 's'}
                          </Badge>
                        )}
                        <ChevronRight className={`h-3.5 w-3.5 text-atlas-muted-2 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/admin/modules/${module.id}/videos`)} title="Gerenciar vídeos">
                          <VideoIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/admin/courses/${courseId}/modules/${module.id}/edit`)} title="Editar módulo">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Mais ações">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {!opts.isChild && (
                              <DropdownMenuItem onClick={() => handleAddSubmodule(module.id)} className="text-xs cursor-pointer">
                                <Plus className="mr-2 h-3 w-3" />
                                Adicionar submódulo
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setMoveModuleDialog({ module })} className="text-xs cursor-pointer">
                              <MoveRight className="mr-2 h-3 w-3" />
                              Mover para...
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteModule(module.id)} className="text-xs cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-3 w-3" />
                              Deletar módulo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                };

                return (
                  <Droppable droppableId="root-modules" type="MODULE_ROOT">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {rootModules.map((module, moduleIndex) => {
                          const isExpanded = expandedModules.has(module.id);
                          const children = childrenByParent.get(module.id) ?? [];
                          return (
                            <Draggable key={module.id} draggableId={module.id} index={moduleIndex}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border rounded-lg overflow-hidden transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-400' : 'shadow-sm'}`}
                                >
                                  {renderModuleHeader(module, provided.dragHandleProps, { isChild: false, childCount: children.length })}
                                  {isExpanded && (
                                    <>
                                      {/* Vídeos diretos do módulo raiz */}
                                      {renderVideosDroppable(module)}

                                      {/* Submódulos (filhos) */}
                                      <Droppable droppableId={`children-${module.id}`} type={`MODULE_CHILD_${module.id}`}>
                                        {(childProvided, childSnap) => (
                                          <div
                                            ref={childProvided.innerRef}
                                            {...childProvided.droppableProps}
                                            className={`pl-6 space-y-1.5 py-2 transition-colors ${childSnap.isDraggingOver ? 'bg-atlas-primary-soft' : ''}`}
                                          >
                                            {children.length === 0 ? (
                                              <div className="text-[11px] text-muted-foreground italic py-1">
                                                Sem submódulos.
                                              </div>
                                            ) : (
                                              children.map((child, childIndex) => (
                                                <Draggable key={child.id} draggableId={child.id} index={childIndex}>
                                                  {(prov2, snap2) => (
                                                    <div
                                                      ref={prov2.innerRef}
                                                      {...prov2.draggableProps}
                                                      className={`border rounded-md overflow-hidden ${snap2.isDragging ? 'shadow-md ring-1 ring-blue-300' : ''}`}
                                                    >
                                                      {renderModuleHeader(child, prov2.dragHandleProps, { isChild: true })}
                                                      {expandedModules.has(child.id) && renderVideosDroppable(child)}
                                                    </div>
                                                  )}
                                                </Draggable>
                                              ))
                                            )}
                                            {childProvided.placeholder}
                                          </div>
                                        )}
                                      </Droppable>
                                    </>
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
                );
              })()}
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
      {/* Modal generico pra mover Module entre raiz/submodulo. */}
      {moveModuleDialog && (
        <MoveToModal
          open={!!moveModuleDialog}
          onClose={() => setMoveModuleDialog(null)}
          nodes={moduleTreeNodes}
          currentParentId={moveModuleDialog.module.parentModuleId ?? null}
          movingNodeId={moveModuleDialog.module.id}
          itemLabel={moveModuleDialog.module.title}
          rootLabel="Módulo raiz (sem pai)"
          description="Escolha o módulo pai. Selecione 'Módulo raiz' pra promover este módulo ao nível superior."
          onConfirm={handleMoveModuleConfirm}
        />
      )}
    </div>
  );
}
