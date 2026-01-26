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
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function NewTopicPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;
  const { toast } = useToast();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  const loadCategory = async () => {
    try {
      setLoading(true);
      const data = await forumCategoriesService.getById(categoryId);
      setCategory(data);
    } catch (err) {
      console.error('Erro ao carregar categoria:', err);
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
        categoryId,
      });

      toast({
        title: 'Sucesso',
        description: 'Tópico criado com sucesso',
      });

      router.push(`/student/forum/topic/${newTopic.id}`);
    } catch (err) {
      console.error('Erro ao criar tópico:', err);
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header Premium */}
      <div className="mb-8">
        <Link
          href={`/student/forum/${categoryId}`}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Voltar para {category.name}
        </Link>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Novo Tópico
          </h1>
          <p className="text-lg text-gray-600">
            Crie um novo tópico em <span className="font-semibold text-gray-900">{category.name}</span>
          </p>
        </div>
      </div>

      {/* Form Premium */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Premium com borda superior */}
        <div className="relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
          {/* Borda superior colorida */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600"></div>

          <div className="p-8 space-y-8">
            {/* Title Premium */}
            <div className="space-y-3">
              <Label htmlFor="title" className="text-base font-semibold text-gray-900">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Digite um título claro e descritivo"
                disabled={submitting}
                maxLength={200}
                className="h-12 text-base border-gray-300 focus:border-primary-500 focus:ring-primary-500/20"
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Um bom título ajuda outros estudantes a encontrar sua discussão
                </p>
                <p className="text-xs font-medium text-gray-400">
                  {formData.title.length}/200
                </p>
              </div>
            </div>

            {/* Content Premium */}
            <div className="space-y-3">
              <Label htmlFor="content" className="text-base font-semibold text-gray-900">
                Conteúdo <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Descreva sua dúvida ou discussão em detalhes...&#10;&#10;• Explique o contexto&#10;• Inclua exemplos se relevante&#10;• Seja específico sobre o que precisa"
                className="min-h-[240px] text-base border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 resize-none"
                disabled={submitting}
              />
              <p className="text-sm text-gray-500">
                Quanto mais detalhes você fornecer, melhores serão as respostas
              </p>
            </div>

            {/* Guidelines Premium */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="relative">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base mb-1">
                      Dicas para um tópico de qualidade
                    </h3>
                    <p className="text-sm text-gray-600">
                      Siga estas orientações para obter as melhores respostas
                    </p>
                  </div>
                </div>
                
                <ul className="space-y-2.5 ml-11">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><strong className="font-semibold">Seja específico:</strong> Use um título claro que descreva exatamente sua dúvida</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><strong className="font-semibold">Forneça contexto:</strong> Explique a situação e o que você já tentou</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><strong className="font-semibold">Use exemplos:</strong> Inclua casos práticos quando relevante</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><strong className="font-semibold">Seja respeitoso:</strong> Mantenha um tom profissional e cordial</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><strong className="font-semibold">Pesquise antes:</strong> Verifique se sua dúvida já foi respondida</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Premium */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={submitting}
            className="font-medium"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || !formData.title.trim() || !formData.content.trim()}
            className="min-w-[160px] h-11 font-semibold shadow-sm hover:shadow-md transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Criar Tópico
              </>
            )}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
