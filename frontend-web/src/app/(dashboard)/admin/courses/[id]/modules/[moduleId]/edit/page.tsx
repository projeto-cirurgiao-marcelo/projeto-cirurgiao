'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowLeft, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { modulesService } from '@/lib/api';
import type { Module } from '@/lib/types/course.types';

const moduleFormSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

export default function EditModulePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [module, setModule] = useState<Module | null>(null);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // Carregar dados do módulo
  useEffect(() => {
    const loadModule = async () => {
      try {
        setIsLoading(true);
        const data = await modulesService.findOne(moduleId);
        setModule(data);

        // Preencher formulário
        form.reset({
          title: data.title,
          description: data.description || '',
        });
      } catch (error) {
        console.error('Erro ao carregar módulo:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o módulo.',
          variant: 'destructive',
        });
        router.push(`/admin/courses/${courseId}/edit`);
      } finally {
        setIsLoading(false);
      }
    };

    loadModule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, courseId]);

  const onSubmit = async (values: ModuleFormValues) => {
    try {
      setIsSubmitting(true);

      await modulesService.update(moduleId, {
        title: values.title,
        description: values.description || undefined,
      });

      toast({
        title: 'Sucesso',
        description: 'Módulo atualizado com sucesso!',
      });

      // Redirecionar para página de edição do curso
      router.push(`/admin/courses/${courseId}/edit`);
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o módulo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!module) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Módulo</h1>
          <p className="text-muted-foreground">
            Atualize as informações do módulo
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Módulo</CardTitle>
          <CardDescription>
            Atualize os dados do módulo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Módulo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Introdução ao React" {...field} />
                    </FormControl>
                    <FormDescription>
                      O título principal do módulo
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
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o conteúdo do módulo..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uma breve descrição do que será abordado neste módulo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
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
      </Card>
    </div>
  );
}
