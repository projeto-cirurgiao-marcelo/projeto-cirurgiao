import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import type { ForumCategory } from '@/lib/types/forum.types';

interface CategoryCardProps {
  category: ForumCategory;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const topicCount = category._count?.topics || 0;

  return (
    <Link href={`/student/forum/${category.id}`} className="group">
      <div className="relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 h-full">
        {/* Borda superior colorida */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <MessageSquare className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary-600 transition-colors">
                  {category.name}
                </h3>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>

          {/* Description */}
          {category.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
              {category.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="font-medium text-gray-700">
                {topicCount}
              </span>
              <span className="text-gray-500">
                {topicCount === 1 ? 'tópico' : 'tópicos'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
