'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumTopic, ForumCategory } from '@/lib/types/forum.types';
import { TopicCard } from '@/components/forum/topic-card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowLeft, MessageSquare, Search, SlidersHorizontal } from 'lucide-react';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/shared/page-transition';
import Link from 'next/link';

type SortOption = 'recent' | 'popular' | 'unanswered';

export default function CategoryTopicsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

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

  const filteredTopics = topics
    .filter(t =>
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      switch (sortBy) {
        case 'popular':
          return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
        case 'unanswered':
          return (a._count?.replies || 0) - (b._count?.replies || 0);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando tópicos...</p>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600 font-medium">{error || 'Categoria não encontrada'}</p>
        <Button onClick={() => router.push('/student/forum')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Fórum
        </Button>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/student/forum"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
          Fórum
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-gray-500 mt-1 text-sm max-w-2xl">
                {category.description}
              </p>
            )}
          </div>

          <Button
            onClick={() => router.push(`/student/forum/${categoryId}/new`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Tópico
          </Button>
        </div>

        {/* Search & Sort Bar */}
        {topics.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tópicos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {([
                { key: 'recent', label: 'Recentes' },
                { key: 'popular', label: 'Populares' },
                { key: 'unanswered', label: 'Sem resposta' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sortBy === opt.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Topics List */}
        {filteredTopics.length === 0 && !searchQuery ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-blue-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Nenhum tópico ainda
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
              Seja o primeiro a iniciar uma discussão nesta categoria
            </p>
            <Button
              onClick={() => router.push(`/student/forum/${categoryId}/new`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Criar Primeiro Tópico
            </Button>
          </div>
        ) : filteredTopics.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum tópico encontrado para "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <StaggerContainer className="space-y-3">
            {filteredTopics.map((topic) => (
              <StaggerItem key={topic.id}>
                <TopicCard topic={topic} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
