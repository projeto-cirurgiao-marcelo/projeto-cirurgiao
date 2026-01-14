'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowLeft, Save, Plus, GripVertical, Pencil, Trash2, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { coursesService, modulesService } from '@/lib/api';
import type { Course, Module } from '@/lib/types/course.types';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';

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
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  
  // Estado colapsável persistente
  const [isCourseInfoCollapsed, setIsCourseInfoCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('course-info-collapsed');
      return saved === 'true';
    }
    return false;
  });

  // Salvar estado no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('course-info-collapsed', String(isCourseInfoCollapsed));
    }
  }, [isCourseInfoCollapsed]);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: '',
      thumbnailVertical: '',
      thumbnailHorizontal: '',
    },
  });

  // Carregar dados do curso
  useEffect(() => {
    const loadCourse = async () => {
      try {
        setIsLoading(true);
        const data = await coursesService.getById(courseId);
        setCourse(data);
        
        // Preencher formulário
        form.reset({
          title: data.title,
          description: data.description || '',
          price: typeof data.price === 'number' ? data.price.toString() : data.price,
          thumbnailVertical: data.thumbnailVertical || '',
          thumbnailHorizontal: data.thumbnailHorizontal || data.thumbnail || '',
        });

        // Carregar módulos
        await loadModules();
      } catch (error) {
        console.error('Erro ao carregar curso:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o curso.',
          variant: 'destructive',
        });
        router.push('/admin/courses');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Carregar módulos do curso
  const loadModules = async () => {
    try {
      setIsLoadingModules(true);
      const data = await modulesService.list(courseId);
      setModules(data);
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os módulos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Atualizar curso
  const onSubmit = async (values: CourseFormValues) => {
    try {
      setIsSaving(true);
      
      const updateData = {
        title: values.title,
        description: values.description,
        price: parseFloat(values.price),
        thumbnailVertical: values.thumbnailVertical || undefined,
        thumbnailHorizontal: values.thumbnailHorizontal || undefined,
      };

      await coursesService.update(courseId, updateData);

      toast({
        title: 'Sucesso',
        description: 'Curso atualizado com sucesso!',
      });

      // Recarregar dados
      const updatedCourse = await coursesService.getById(courseId);
      setCourse(updatedCourse);
    } catch (error) {
      console.error('Erro ao atualizar curso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o curso.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reordenar módulos (drag and drop)
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualizar UI imediatamente
    setModules(items);

    try {
      // Enviar nova ordem para API
      // Garantir que order seja um inteiro (parseInt para evitar problemas de validação)
      const updates = items.map((module, index) => ({
        id: module.id,
        order: parseInt(String(index + 1), 10),
      }));

      const payload = { modules: updates };
      console.log('=== INÍCIO DEBUG REORDENAÇÃO ===');
      console.log('CourseId:', courseId);
      console.log('Payload completo:', JSON.stringify(payload, null, 2));
      console.log('Tipo de cada order:', updates.map(u => `${u.id}: ${typeof u.order} (${u.order})`));
      console.log('=== FIM DEBUG ===');

      await modulesService.reorder(courseId, payload);

      toast({
        title: 'Sucesso',
        description: 'Ordem dos módulos atualizada!',
      });
    } catch (error: any) {
      console.error('Erro completo ao reordenar módulos:', error);
      console.error('Response:', error.response);
      console.error('Data:', error.response?.data);
      
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Não foi possível reordenar os módulos.';
      
      toast({
        title: 'Erro ao reordenar',
        description: errorMessage,
        variant: 'destructive',
      });
      // Reverter mudança
      await loadModules();
    }
  };

  // Deletar módulo
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja deletar este módulo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await modulesService.delete(moduleId);
      toast({
        title: 'Sucesso',
        description: 'Módulo deletado com sucesso!',
      });
      await loadModules();
    } catch (error) {
      console.error('Erro ao deletar módulo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o módulo.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/courses')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Curso</h1>
            <p className="text-muted-foreground">
              Atualize as informações do curso e gerencie seus módulos
            </p>
          </div>
        </div>
        <Badge variant={course.isPublished ? 'default' : 'secondary'}>
          {course.isPublished ? 'Publicado' : 'Rascunho'}
        </Badge>
      </div>

      {/* Formulário de Edição */}
      <Card className="mb-8">
        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsCourseInfoCollapsed(!isCourseInfoCollapsed)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Informações do Curso</CardTitle>
              <CardDescription>
                Atualize os dados básicos do curso
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCourseInfoCollapsed(!isCourseInfoCollapsed);
              }}
            >
              {isCourseInfoCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isCourseInfoCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
          }`}
        >
          <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Curso</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Curso Completo de React" {...field} />
                    </FormControl>
                    <FormDescription>
                      O título principal do seu curso
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o conteúdo do curso..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uma descrição detalhada do que os alunos aprenderão
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="99.90"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor do curso em reais
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="my-6" />

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Thumbnails do Curso</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Faça upload das imagens de capa do curso. Forneça as duas versões para melhor experiência em diferentes dispositivos.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="thumbnailHorizontal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thumbnail Horizontal (16:9)</FormLabel>
                        <FormControl>
                          <ThumbnailUpload
                            value={field.value}
                            onChange={field.onChange}
                            aspectRatio="horizontal"
                            label="Thumbnail horizontal"
                          />
                        </FormControl>
                        <FormDescription>
                          Imagem para exibição em desktop e tablet
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="thumbnailVertical"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thumbnail Vertical (9:16) - Opcional</FormLabel>
                        <FormControl>
                          <ThumbnailUpload
                            value={field.value}
                            onChange={field.onChange}
                            aspectRatio="vertical"
                            label="Thumbnail vertical"
                          />
                        </FormControl>
                        <FormDescription>
                          Imagem para exibição em dispositivos móveis
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
          </CardContent>
        </div>
      </Card>

      <Separator className="my-8" />

      {/* Gestão de Módulos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Módulos do Curso</CardTitle>
              <CardDescription>
                Organize o conteúdo em módulos e adicione vídeos
              </CardDescription>
            </div>
            <Button
              onClick={() => router.push(`/admin/courses/${courseId}/modules/new`)}
            >
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
              <p className="text-muted-foreground mb-4">
                Nenhum módulo criado ainda
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/courses/${courseId}/modules/new`)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Módulo
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="modules">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {modules.map((module, index) => (
                      <Draggable
                        key={module.id}
                        draggableId={module.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              flex items-center gap-4 p-4 border rounded-lg bg-card
                              ${snapshot.isDragging ? 'shadow-lg' : ''}
                            `}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Módulo {index + 1}
                                </span>
                                <Badge variant="outline">
                                  {module._count?.videos || 0} vídeos
                                </Badge>
                              </div>
                              <h3 className="font-semibold">{module.title}</h3>
                              {module.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {module.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/admin/modules/${module.id}/videos`)}
                                title="Gerenciar vídeos"
                              >
                                <Video className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/admin/courses/${courseId}/modules/${module.id}/edit`)}
                                title="Editar módulo"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteModule(module.id)}
                                title="Deletar módulo"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
