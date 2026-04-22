'use client';

import { useEffect, useState } from 'react';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumCategory } from '@/lib/types/forum.types';
import { CategoryCard } from '@/components/forum/category-card';
import { Loader2, MessageSquare, Search, TrendingUp, Users } from 'lucide-react';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/shared/page-transition';

import { logger } from '@/lib/logger';
export default function ForumPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
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
    ? categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  const totalTopics = categories.reduce((acc, c) => acc + (c._count?.topics || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando fórum...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={loadCategories}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-gray-300" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Nenhuma categoria disponível</p>
          <p className="text-sm text-gray-500 mt-1">As categorias do fórum serão criadas em breve</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Fórum de Discussão
              </h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base max-w-2xl">
                Tire dúvidas e compartilhe conhecimento com outros estudantes de medicina veterinária
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-700">{totalTopics}</span>
                tópicos
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-700">{categories.length}</span>
                categorias
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-5 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <StaggerItem key={category.id}>
              <CategoryCard category={category} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {searchQuery && filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma categoria encontrada para "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              Limpar busca
            </button>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
