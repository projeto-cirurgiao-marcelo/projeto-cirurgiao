'use client';

import { useState } from 'react';
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

const moduleFormSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

export default function NewModulePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = async (values: ModuleFormValues) => {
    try {
      setIsSubmitting(true);

      // Obter próxima ordem disponível
      const { nextOrder } = await modulesService.getNextOrder(courseId);

      // Criar módulo
      await modulesService.create(courseId, {
        title: values.title,
        description: values.description || undefined,
        order: nextOrder,
      });

      toast({
        title: 'Sucesso',
        description: 'Módulo criado com sucesso!',
      });

      // Redirecionar para página de edição do curso
      router.push(`/admin/courses/${courseId}/edit`);
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o módulo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-3xl font-bold">Novo Módulo</h1>
          <p className="text-muted-foreground">
            Adicione um novo módulo ao curso
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Módulo</CardTitle>
          <CardDescription>
            Preencha os dados do novo módulo
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
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Criar Módulo
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
