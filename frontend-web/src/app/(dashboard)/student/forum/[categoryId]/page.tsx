'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumTopic, ForumCategory } from '@/lib/types/forum.types';
import { TopicCard } from '@/components/forum/topic-card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CategoryTopicsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar categoria e tópicos em paralelo
      const [categoryData, topicsResponse] = await Promise.all([
        forumCategoriesService.getById(categoryId),
        forumService.getTopics({ categoryId }),
      ]);

      setCategory(categoryData);
      setTopics(topicsResponse.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar tópicos da categoria');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error || 'Categoria não encontrada'}</p>
        <Button onClick={() => router.push('/student/forum')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Fórum
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Premium */}
      <div className="mb-8">
        <Link
          href="/student/forum"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Voltar ao Fórum
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3 flex-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-lg text-gray-600 max-w-3xl">
                {category.description}
              </p>
            )}
          </div>

          <Button 
            onClick={() => router.push(`/student/forum/${categoryId}/new`)}
            className="h-11 font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Tópico
          </Button>
        </div>
      </div>

      {/* Topics List Premium */}
      {topics.length === 0 ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-12">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Plus className="h-8 w-8 text-primary-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">
                Nenhum tópico nesta categoria ainda
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Seja o primeiro a iniciar uma discussão! Compartilhe suas dúvidas ou conhecimentos com a comunidade.
              </p>
            </div>
            <Button 
              onClick={() => router.push(`/student/forum/${categoryId}/new`)}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Tópico
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
