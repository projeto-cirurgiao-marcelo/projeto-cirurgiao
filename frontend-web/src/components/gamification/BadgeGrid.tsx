'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BadgeCard } from './BadgeCard';
import { CATEGORY_LABELS, RARITY_LABELS, RARITY_COLORS } from '@/lib/gamification';
import type { Badge, BadgeCategory, BadgeRarity, BadgesSummary } from '@/lib/gamification';
import { Button } from '@/components/ui/button';
import { Filter, Trophy } from 'lucide-react';

interface BadgeGridProps {
  badges: Badge[];
  summary?: BadgesSummary | null;
  className?: string;
}

type FilterCategory = BadgeCategory | 'all';
type FilterStatus = 'all' | 'unlocked' | 'locked';

export function BadgeGrid({ badges, summary, className }: BadgeGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const filteredBadges = useMemo(() => {
    let filtered = [...badges];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((b) => b.category === categoryFilter);
    }

    if (statusFilter === 'unlocked') {
      filtered = filtered.filter((b) => b.unlockedAt !== null);
    } else if (statusFilter === 'locked') {
      filtered = filtered.filter((b) => b.unlockedAt === null);
    }

    // Sort: unlocked first, then by rarity (legendary > epic > rare > common)
    const rarityOrder: Record<BadgeRarity, number> = {
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1,
    };

    filtered.sort((a, b) => {
      const aUnlocked = a.unlockedAt ? 1 : 0;
      const bUnlocked = b.unlockedAt ? 1 : 0;
      if (aUnlocked !== bUnlocked) return bUnlocked - aUnlocked;
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });

    return filtered;
  }, [badges, categoryFilter, statusFilter]);

  const categories: { key: FilterCategory; label: string }[] = [
    { key: 'all', label: 'Todas' },
    ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      key: key as BadgeCategory,
      label,
    })),
  ];

  const statuses: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'unlocked', label: 'Desbloqueadas' },
    { key: 'locked', label: 'Bloqueadas' },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      {summary && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="font-semibold">
              {summary.unlocked}/{summary.total}
            </span>
            <span className="text-gray-600">conquistadas</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(summary.byRarity).map(([rarity, data]) => {
              const colors = RARITY_COLORS[rarity as BadgeRarity];
              return (
                <span
                  key={rarity}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                  }}
                >
                  {RARITY_LABELS[rarity as BadgeRarity]}: {data.unlocked}/
                  {data.total}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400" />
          {categories.map((cat) => (
            <Button
              key={cat.key}
              variant={categoryFilter === cat.key ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCategoryFilter(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap pl-6">
          {statuses.map((st) => (
            <Button
              key={st.key}
              variant={statusFilter === st.key ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter(st.key)}
            >
              {st.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredBadges.map((badge, index) => (
          <motion.div
            key={badge.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <BadgeCard badge={badge} />
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filteredBadges.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma conquista encontrada com esses filtros.</p>
        </div>
      )}
    </div>
  );
}
