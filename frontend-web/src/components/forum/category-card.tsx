import Link from 'next/link';
import {
  ArrowRight,
  Bone,
  BookOpen,
  Hash,
  HeartPulse,
  MessageSquare,
  Moon,
  Pill,
  Siren,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ForumCategory } from '@/lib/types/forum.types';

interface CategoryCardProps {
  category: ForumCategory;
}

const CATEGORY_ICONS: Array<{ keys: string[]; icon: LucideIcon }> = [
  { keys: ['cirurg'], icon: Stethoscope },
  { keys: ['anatomi'], icon: Bone },
  { keys: ['farma'], icon: Pill },
  { keys: ['clinic'], icon: HeartPulse },
  { keys: ['anestes'], icon: Moon },
  { keys: ['emerg'], icon: Siren },
  { keys: ['geral'], icon: BookOpen },
];

function getCategoryIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const entry of CATEGORY_ICONS) {
    if (entry.keys.some((k) => lower.includes(k))) return entry.icon;
  }
  return MessageSquare;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const topicCount = category._count?.topics || 0;
  const Icon = getCategoryIcon(category.name);

  return (
    <Link
      href={`/student/forum/${category.id}`}
      className={cn(
        'group block bg-atlas-surface border border-atlas-line rounded-md',
        'transition-colors duration-150',
        'hover:bg-atlas-surface-2',
      )}
    >
      <div className="p-5 flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'shrink-0 size-11 rounded-md flex items-center justify-center',
            'bg-atlas-primary-soft border border-atlas-primary/30',
          )}
        >
          <Icon
            className="size-5 text-atlas-primary"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink leading-[1.3]">
              {category.name}
            </h3>
            <ArrowRight
              className="size-3.5 text-atlas-muted-2 group-hover:text-atlas-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
              strokeWidth={1.75}
            />
          </div>

          {category.description && (
            <p className="text-[13px] text-atlas-muted mt-1.5 leading-[1.55] line-clamp-2">
              {category.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-atlas-line">
            <div className="flex items-center gap-1.5 text-xs text-atlas-muted">
              <Hash
                className="size-3 text-atlas-muted-2"
                strokeWidth={1.75}
              />
              <span className="atlas-mono atlas-num text-atlas-ink font-medium">
                {topicCount}
              </span>
              {topicCount === 1 ? 'tópico' : 'tópicos'}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
