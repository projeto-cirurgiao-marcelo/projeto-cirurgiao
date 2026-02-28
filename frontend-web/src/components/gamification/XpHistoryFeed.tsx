'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import type { XpHistoryEntry } from '@/lib/gamification';
import { XP_ACTION_LABELS } from '@/lib/gamification';

interface XpHistoryFeedProps {
  entries: XpHistoryEntry[];
  maxItems?: number;
  className?: string;
}

export function XpHistoryFeed({
  entries,
  maxItems = 10,
  className,
}: XpHistoryFeedProps) {
  const displayEntries = entries.slice(0, maxItems);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (displayEntries.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhuma atividade recente.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {displayEntries.map((entry, index) => {
        const actionLabel =
          XP_ACTION_LABELS[entry.action] || entry.action;

        return (
          <motion.div
            key={`${entry.timestamp}-${index}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            {/* XP badge */}
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full tabular-nums shrink-0 min-w-[50px] text-center">
              +{entry.xp} XP
            </span>

            {/* Description */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{entry.description}</p>
              <p className="text-[11px] text-gray-500">{actionLabel}</p>
            </div>

            {/* Time */}
            <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
              {formatTime(entry.timestamp)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
