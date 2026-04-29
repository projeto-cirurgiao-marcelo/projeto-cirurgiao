'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumCategory } from '@/lib/types/forum.types';
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
} from 'lucide-react';
import {
  AtlasButton,
  AtlasLoadingBar,
  AtlasPageHeader,
  atlasToast,
} from '@/components/atlas';

import { logger } from '@/lib/logger';
export default function NewTopicPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;

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
      atlasToast.error('Falha ao carregar categoria');
      router.push('/student/forum');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      atlasToast.warning('Preencha título e conteúdo');
      return;
    }

    try {
      setSubmitting(true);
      const newTopic = await forumService.createTopic({
        title: formData.title,
        content: formData.content,
        categoryId: selectedCategoryId,
      });

      // Sem toast — redirect pra rota do tópico (feedback contextual)
      router.push(`/student/forum/topic/${newTopic.id}`);
    } catch (err) {
      logger.error('Erro ao criar tópico:', err);
      atlasToast.error('Falha ao criar tópico');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-7">
        <AtlasLoadingBar />
      </main>
    );
  }

  if (!category) {
    return null;
  }

  const titleLength = formData.title.length;
  const isValid = formData.title.trim().length >= 5 && formData.content.trim().length >= 10;

  return (
    <>
      <AtlasPageHeader
        metaLabel={`Comunidade · Fórum · ${category.name}`}
        title="Novo tópico"
      >
        <button
          type="button"
          onClick={() => router.push(`/student/forum/${categoryId}`)}
          className="inline-flex items-center gap-1.5 text-xs text-atlas-muted hover:text-atlas-ink transition-colors mt-1 mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Voltar para {category.name}
        </button>
      </AtlasPageHeader>

      <main className="px-5 sm:px-7 py-5 sm:py-6 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-atlas-surface border border-atlas-line rounded-md overflow-hidden">
            <div className="p-5 sm:p-6 space-y-5">
              {/* Categoria */}
              {allCategories.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-atlas-ink-2">
                    Categoria
                  </Label>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={setSelectedCategoryId}
                    disabled={submitting}
                  >
                    <SelectTrigger className="h-10 border-atlas-line focus:border-atlas-ink-2 focus:ring-0 rounded-md">
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
              <div className="space-y-1.5">
                <Label
                  htmlFor="title"
                  className="text-[12px] font-medium text-atlas-ink-2"
                >
                  Título
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Escreva um título claro e descritivo"
                  disabled={submitting}
                  maxLength={200}
                  className="h-10 border-atlas-line focus-visible:border-atlas-ink-2 rounded-md"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-atlas-muted-2">
                    Mínimo 5 caracteres
                  </p>
                  <p
                    className={`atlas-mono text-[10.5px] atlas-num ${titleLength > 180 ? 'text-atlas-warn-deep' : 'text-atlas-muted-2'}`}
                  >
                    {titleLength} / 200
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="content"
                  className="text-[12px] font-medium text-atlas-ink-2"
                >
                  Conteúdo
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder={
                    'Descreva sua dúvida ou discussão em detalhes…\n\nExplique o contexto e seja específico sobre o que precisa.'
                  }
                  className="min-h-[180px] border-atlas-line focus-visible:border-atlas-ink-2 resize-none rounded-md"
                  disabled={submitting}
                />
                <p className="text-[11px] text-atlas-muted-2">
                  Mínimo 10 caracteres. Quanto mais detalhes, melhores serão as
                  respostas.
                </p>
              </div>
            </div>

            {/* Guidelines */}
            <div className="px-5 sm:px-6 py-4 bg-atlas-surface-2 border-t border-atlas-line">
              <div className="flex items-start gap-3">
                <Lightbulb
                  className="size-4 text-atlas-warn-deep shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="atlas-caps text-atlas-muted mb-2">
                    Dicas para um bom tópico
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      'Use um título claro que descreva exatamente sua dúvida',
                      'Forneça contexto e explique o que você já tentou',
                      'Inclua exemplos práticos quando relevante',
                      'Verifique se sua dúvida já foi respondida antes',
                    ].map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[12px] text-atlas-muted leading-[1.55]"
                      >
                        <CheckCircle2
                          className="size-3 text-atlas-success shrink-0 mt-0.5"
                          strokeWidth={1.75}
                        />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <AtlasButton
              type="button"
              variant="ghost"
              size="md"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancelar
            </AtlasButton>
            <AtlasButton
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || !isValid}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Criando…
                </>
              ) : (
                'Criar tópico'
              )}
            </AtlasButton>
          </div>
        </form>
      </main>
    </>
  );
}
