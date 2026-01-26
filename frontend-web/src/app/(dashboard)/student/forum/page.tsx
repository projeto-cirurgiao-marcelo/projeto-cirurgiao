'use client';

import { useEffect, useState } from 'react';
import { forumCategoriesService } from '@/lib/api/forum-categories.service';
import { ForumCategory } from '@/lib/types/forum.types';
import { CategoryCard } from '@/components/forum/category-card';
import { Loader2 } from 'lucide-react';

export default function ForumPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Erro ao carregar categorias:', err);
      setError('Erro ao carregar categorias do fórum');
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={loadCategories}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground text-lg">
          Nenhuma categoria disponível no momento
        </p>
        <p className="text-sm text-muted-foreground">
          As categorias do fórum serão criadas em breve
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Premium */}
      <div className="mb-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Fórum de Discussão
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Participe das discussões, tire dúvidas e compartilhe conhecimento com outros estudantes de medicina veterinária
          </p>
        </div>
      </div>

      {/* Categories Grid Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
      </div>
    </div>
  );
}
