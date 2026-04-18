'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumCategory } from '@/lib/types/forum.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  PenLine,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/page-transition';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export default function NewTopicPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;
  const { toast } = useToast();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [allCategories, setAllCategories] = useState<ForumCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoryData, categoriesData] = await Promise.all([
        forumCategoriesService.getById(categoryId),
        forumCategoriesService.getAll(),
      ]);
      setCategory(categoryData);
      setAllCategories(categoriesData);
      setSelectedCategoryId(categoryId);
    } catch (err) {
      logger.error('Erro ao carregar categoria:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar categoria',
        variant: 'destructive',
      });
      router.push('/student/forum');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const newTopic = await forumService.createTopic({
        title: formData.title,
        content: formData.content,
        categoryId: selectedCategoryId,
      });

      toast({
        title: 'Sucesso',
        description: 'Tópico criado com sucesso',
      });

      router.push(`/student/forum/topic/${newTopic.id}`);
    } catch (err) {
      logger.error('Erro ao criar tópico:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao criar tópico',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return null;
  }

  const titleLength = formData.title.length;
  const isValid = formData.title.trim().length >= 5 && formData.content.trim().length >= 10;

  return (
    <PageTransition>
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href={`/student/forum/${categoryId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
          Voltar para {category.name}
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <PenLine className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Novo Tópico
              </h1>
              <p className="text-sm text-gray-500">
                em <span className="font-medium text-gray-700">
                  {allCategories.find(c => c.id === selectedCategoryId)?.name || category.name}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Categoria */}
              {allCategories.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">
                    Categoria
                  </Label>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={setSelectedCategoryId}
                    disabled={submitting}
                  >
                    <SelectTrigger className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-500/20 rounded-xl">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-gray-900">
                  Título
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Escreva um título claro e descritivo"
                  disabled={submitting}
                  maxLength={200}
                  className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-500/20 rounded-xl"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Mínimo 5 caracteres
                  </p>
                  <p className={`text-xs font-medium ${titleLength > 180 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {titleLength}/200
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-semibold text-gray-900">
                  Conteúdo
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={"Descreva sua dúvida ou discussão em detalhes...\n\nExplique o contexto e seja específico sobre o que precisa"}
                  className="min-h-[200px] border-gray-200 focus:border-blue-400 focus:ring-blue-500/20 resize-none rounded-xl"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-400">
                  Mínimo 10 caracteres. Quanto mais detalhes, melhores serão as respostas.
                </p>
              </div>
            </div>

            {/* Guidelines */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Dicas para um bom tópico</p>
                  <ul className="space-y-1.5">
                    {[
                      'Use um título claro que descreva exatamente sua dúvida',
                      'Forneça contexto e explique o que você já tentou',
                      'Inclua exemplos práticos quando relevante',
                      'Verifique se sua dúvida já foi respondida antes',
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={submitting}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !isValid}
              className="bg-blue-600 hover:bg-blue-700 font-semibold min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Tópico'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </PageTransition>
  );
}
