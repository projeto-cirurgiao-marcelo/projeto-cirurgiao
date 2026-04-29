'use client';

import { useEffect, useState } from 'react';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumCategory } from '@/lib/types/forum.types';
import { CategoryCard } from '@/components/forum/category-card';
import { MessageSquare, Search, AlertCircle } from 'lucide-react';
import {
  AtlasButton,
  AtlasEmptyState,
  AtlasFiltersRow,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasSkeletonCard,
  AtlasStatsInline,
} from '@/components/atlas';
import { logger } from '@/lib/logger';

export default function ForumPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await forumCategoriesService.getAll();
      setCategories(data);
    } catch (err) {
      logger.error('Erro ao carregar categorias:', err);
      setError('Erro ao carregar categorias do fórum');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = searchQuery
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : categories;

  const totalTopics = categories.reduce(
    (acc, c) => acc + (c._count?.topics || 0),
    0,
  );

  if (loading) {
    return (
      <>
        <AtlasPageHeader
          metaLabel="Comunidade · Fórum"
          title="Fórum de discussão"
        >
          <AtlasStatsInline
            stats={[
              { value: '—', label: 'Categorias' },
              { value: '—', label: 'Tópicos abertos' },
            ]}
          />
        </AtlasPageHeader>
        <main className="px-5 sm:px-7 py-5 sm:py-6">
          <AtlasLoadingBar className="mb-[18px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px] sm:gap-[18px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <AtlasSkeletonCard key={i} />
            ))}
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-atlas-surface border border-dashed border-atlas-line rounded-md px-7 pt-14 pb-16 text-center">
            <div className="size-12 mx-auto mb-[18px] text-atlas-accent flex items-center justify-center">
              <AlertCircle className="size-12" strokeWidth={1.25} />
            </div>
            <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-1.5">
              {error}
            </h2>
            <p className="text-atlas-muted text-[13px] max-w-[420px] mx-auto mb-[18px] leading-[1.55]">
              Verifique sua conexão e tente novamente.
            </p>
            <AtlasButton
              variant="primary"
              size="md"
              onClick={loadCategories}
            >
              Tentar novamente
            </AtlasButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <AtlasPageHeader
        metaLabel="Comunidade · Fórum"
        title="Fórum de"
        titleEm="discussão clínica"
      >
        <AtlasStatsInline
          stats={[
            { value: String(categories.length), label: 'Categorias' },
            { value: String(totalTopics), label: 'Tópicos abertos' },
          ]}
        />
      </AtlasPageHeader>

      <main className="px-5 sm:px-7 py-5 sm:py-6">
        <AtlasFiltersRow
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar categorias por nome ou descrição..."
          chips={[]}
          onChipClick={() => {}}
        />

        {categories.length === 0 ? (
          <AtlasEmptyState
            icon={MessageSquare}
            title="Nenhuma categoria disponível"
            description="As categorias do fórum serão criadas em breve."
          />
        ) : filteredCategories.length === 0 ? (
          <AtlasEmptyState
            icon={Search}
            title="Nenhuma categoria encontrada"
            description={`Nenhum resultado para "${searchQuery}". Tente outros termos.`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px] sm:gap-[18px]">
            {filteredCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
