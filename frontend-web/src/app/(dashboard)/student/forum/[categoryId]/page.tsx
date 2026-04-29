'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumTopic, ForumCategory } from '@/lib/types/forum.types';
import { TopicCard } from '@/components/forum/topic-card';
import { Plus, ArrowLeft, MessageSquare, Search, AlertCircle } from 'lucide-react';
import {
  AtlasButton,
  AtlasEmptyState,
  AtlasFiltersRow,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasSectionTabs,
  AtlasSkeletonCard,
  AtlasStatsInline,
  type SectionTab,
} from '@/components/atlas';
import { logger } from '@/lib/logger';

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
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      logger.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar tópicos da categoria');
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = topics
    .filter(
      (t) =>
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      switch (sortBy) {
        case 'popular':
          return (
            b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
          );
        case 'unanswered':
          return (a._count?.replies || 0) - (b._count?.replies || 0);
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

  const totalReplies = topics.reduce(
    (sum, t) => sum + (t._count?.replies || 0),
    0,
  );
  const unanswered = topics.filter((t) => (t._count?.replies || 0) === 0).length;

  const sortTabs: SectionTab[] = [
    { id: 'recent', label: 'Recentes' },
    { id: 'popular', label: 'Populares' },
    { id: 'unanswered', label: 'Sem resposta', count: unanswered },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-7">
        <AtlasLoadingBar className="mb-[18px]" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AtlasSkeletonCard key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (error || !category) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-10">
        <div className="max-w-3xl mx-auto">
          <AtlasButton
            variant="ghost"
            size="sm"
            onClick={() => router.push('/student/forum')}
            className="mb-5"
          >
            <ArrowLeft strokeWidth={1.75} />
            Voltar ao fórum
          </AtlasButton>
          <div className="bg-atlas-surface border border-dashed border-atlas-line rounded-md px-7 pt-14 pb-16 text-center">
            <div className="size-12 mx-auto mb-[18px] text-atlas-accent flex items-center justify-center">
              <AlertCircle className="size-12" strokeWidth={1.25} />
            </div>
            <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-1.5">
              {error ?? 'Categoria não encontrada'}
            </h2>
            <AtlasButton
              variant="primary"
              size="md"
              onClick={() => router.push('/student/forum')}
            >
              Voltar ao fórum
            </AtlasButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <AtlasPageHeader
        metaLabel={`Comunidade · Fórum`}
        title={category.name}
        actions={
          <AtlasButton
            variant="primary"
            size="md"
            onClick={() => router.push(`/student/forum/${categoryId}/new`)}
          >
            <Plus strokeWidth={1.75} />
            Novo tópico
          </AtlasButton>
        }
      >
        <button
          type="button"
          onClick={() => router.push('/student/forum')}
          className="inline-flex items-center gap-1.5 text-xs text-atlas-muted hover:text-atlas-ink transition-colors mt-1 mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Voltar ao fórum
        </button>

        {category.description && (
          <p className="text-[13.5px] text-atlas-muted leading-[1.55] max-w-[640px] mt-2">
            {category.description}
          </p>
        )}

        <AtlasStatsInline
          className="mt-4"
          stats={[
            { value: String(topics.length), label: 'Tópicos' },
            { value: String(totalReplies), label: 'Respostas' },
            { value: String(unanswered), label: 'Sem resposta' },
          ]}
        />
      </AtlasPageHeader>

      <main className="px-5 sm:px-7 py-5 sm:py-6">
        {topics.length > 0 && (
          <>
            <AtlasFiltersRow
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Buscar tópicos por título ou conteúdo..."
              chips={[]}
              onChipClick={() => {}}
            />
            <AtlasSectionTabs
              tabs={sortTabs}
              activeId={sortBy}
              onChange={(id) => setSortBy(id as SortOption)}
            />
          </>
        )}

        {filteredTopics.length === 0 && !searchQuery ? (
          <AtlasEmptyState
            icon={MessageSquare}
            title="Nenhum tópico ainda"
            description="Seja o primeiro a iniciar uma discussão nesta categoria."
            action={
              <AtlasButton
                variant="primary"
                size="md"
                onClick={() =>
                  router.push(`/student/forum/${categoryId}/new`)
                }
              >
                <Plus strokeWidth={1.75} />
                Criar primeiro tópico
              </AtlasButton>
            }
          />
        ) : filteredTopics.length === 0 && searchQuery ? (
          <AtlasEmptyState
            icon={Search}
            title="Nenhum tópico encontrado"
            description={`Nenhum resultado para "${searchQuery}".`}
            action={
              <AtlasButton
                variant="outline"
                size="md"
                onClick={() => setSearchQuery('')}
              >
                Limpar busca
              </AtlasButton>
            }
          />
        ) : (
          <ul className="space-y-3">
            {filteredTopics.map((topic) => (
              <li key={topic.id}>
                <TopicCard topic={topic} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
