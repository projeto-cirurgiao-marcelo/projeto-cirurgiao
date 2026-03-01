import Link from 'next/link';
import { MessageSquare, ArrowRight, Users, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ForumCategory } from '@/lib/types/forum.types';

interface CategoryCardProps {
  category: ForumCategory;
}

const categoryIcons: Record<string, string> = {
  'cirurgia': '🔬',
  'anatomia': '🦴',
  'farmacologia': '💊',
  'clinica': '🩺',
  'anestesia': '😴',
  'emergencia': '🚨',
  'geral': '📚',
};

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(categoryIcons)) {
    if (lower.includes(key)) return emoji;
  }
  return '💬';
}

export function CategoryCard({ category }: CategoryCardProps) {
  const topicCount = category._count?.topics || 0;
  const emoji = getCategoryEmoji(category.name);

  return (
    <Link href={`/student/forum/${category.id}`} className="group block">
      <div className="relative bg-white rounded-xl border border-gray-200 p-5 h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200">
        {/* Top accent bar */}
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-b opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center text-2xl transition-colors">
            {emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors leading-tight">
                {category.name}
              </h3>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
            </div>

            {category.description && (
              <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                {category.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-700">{topicCount}</span>
                {topicCount === 1 ? 'tópico' : 'tópicos'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
