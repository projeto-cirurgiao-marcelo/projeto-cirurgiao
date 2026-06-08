'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { coursesService, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';
import { aiTextService } from '@/lib/api/ai-text.service';

import { logger } from '@/lib/logger';

const courseSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  price: z.number().min(0, 'O preço deve ser maior ou igual a 0'),
  thumbnailHorizontal: z.string().url('URL inválida').optional().or(z.literal('')),
  thumbnailVertical: z.string().url('URL inválida').optional().or(z.literal('')),
});

type CourseFormData = z.infer<typeof courseSchema>;

/**
 * Página de criação de novo curso
 */
export default function NewCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      thumbnailHorizontal: '',
      thumbnailVertical: '',
    },
  });

  const onSubmit = async (data: CourseFormData) => {
    try {
      setIsSubmitting(true);
      
      const courseData = {
        title: data.title,
        description: data.description || undefined,
        price: data.price,
        thumbnailHorizontal: data.thumbnailHorizontal || undefined,
        thumbnailVertical: data.thumbnailVertical || undefined,
      };

      await coursesService.create(courseData);
      
      toast({
        title: 'Sucesso',
        description: 'Curso criado com sucesso',
      });

      router.push('/admin/courses');
    } catch (error) {
      toast({
        title: 'Erro ao criar curso',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/courses')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="atlas-caps text-atlas-muted mb-1.5">ADMIN · CURSOS</div>
        <h1 className="font-serif text-[22px] sm:text-[26px] font-medium tracking-[-0.015em] leading-[1.15] text-atlas-ink">Criar Novo Curso</h1>
        <p className="text-atlas-ink-2 mt-2">
          Preencha as informações básicas do curso
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informações do Curso</CardTitle>
          <CardDescription>
            Você poderá adicionar módulos e vídeos após criar o curso
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
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Curso de Cirurgia Básica"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      O título do curso será usado para gerar o slug (URL)
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
                        placeholder="Descreva o conteúdo e objetivos do curso..."
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uma breve descrição sobre o que os alunos aprenderão
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
                    <FormLabel>Preço (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor do curso em reais (use 0 para curso gratuito)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="thumbnailHorizontal"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Thumbnail Horizontal (16:9)</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                          disabled={!form.getValues('title')?.trim()}
                          onClick={async () => {
                            const title = form.getValues('title');
                            if (!title?.trim()) return;
                            try {
                              toast({ title: 'IA', description: 'Gerando thumbnail horizontal...' });
                              const url = await aiTextService.generateThumbnail(title, { overlayText: title, style: 'medical' });
                              field.onChange(url);
                              toast({ title: 'Pronto', description: 'Thumbnail horizontal gerada com IA' });
                            } catch (err) {
                              logger.error(err);
                              toast({ title: 'Erro', description: 'Não foi possível gerar a thumbnail horizontal', variant: 'destructive' });
                            }
                          }}
                        >
                          <Sparkles className="h-3 w-3" />
                          Gerar com IA
                        </Button>
                      </div>
                      <FormControl>
                        <ThumbnailUpload
                          value={field.value || ''}
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
                      <div className="flex items-center justify-between">
                        <FormLabel>Thumbnail Vertical (9:16)</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                          disabled={!form.getValues('title')?.trim()}
                          onClick={async () => {
                            const title = form.getValues('title');
                            if (!title?.trim()) return;
                            try {
                              toast({ title: 'IA', description: 'Gerando thumbnail vertical...' });
                              const url = await aiTextService.generateThumbnail(title, { overlayText: title, style: 'medical', aspectRatio: 'vertical' });
                              field.onChange(url);
                              toast({ title: 'Pronto', description: 'Thumbnail vertical gerada com IA' });
                            } catch (err) {
                              logger.error(err);
                              toast({ title: 'Erro', description: 'Não foi possível gerar a thumbnail vertical', variant: 'destructive' });
                            }
                          }}
                        >
                          <Sparkles className="h-3 w-3" />
                          Gerar com IA
                        </Button>
                      </div>
                      <FormControl>
                        <ThumbnailUpload
                          value={field.value || ''}
                          onChange={field.onChange}
                          aspectRatio="vertical"
                          label="Thumbnail vertical"
                        />
                      </FormControl>
                      <FormDescription>
                        Imagem usada nos cards verticais do admin
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/courses')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Criar Curso
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
