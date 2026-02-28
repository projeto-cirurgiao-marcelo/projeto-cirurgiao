'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';
import type { LeaderboardEntry, LeaderboardCurrentUser } from '@/lib/gamification';
import { LevelBadge } from './LevelBadge';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUser?: LeaderboardCurrentUser | null;
  className?: string;
}

export function LeaderboardTable({
  entries,
  currentUser,
  className,
}: LeaderboardTableProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Current user highlight */}
      {currentUser && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-3 flex items-center gap-3">
          <span className="text-lg font-bold text-amber-600 tabular-nums w-8 text-center">
            #{currentUser.rank}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">Sua posição</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <LevelBadge
                level={currentUser.level}
                title={currentUser.levelTitle}
                color=""
                size="sm"
                showTitle={false}
              />
              <span>{currentUser.levelTitle}</span>
            </div>
          </div>
          <p className="text-base font-bold text-amber-600 tabular-nums">
            {currentUser.xpEarned.toLocaleString()} XP
          </p>
        </div>
      )}

      {/* Table rows */}
      {entries.map((entry, index) => {
        const isCurrentUser = entry.userId === 'current-user';
        const isTop3 = entry.rank <= 3;

        return (
          <motion.div
            key={entry.userId}
            className={cn(
              'flex items-center gap-3 rounded-lg p-2.5 transition-colors',
              isCurrentUser
                ? 'bg-amber-50 border border-amber-200'
                : 'hover:bg-gray-50',
              isTop3 && !isCurrentUser && 'bg-gray-50/50'
            )}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            {/* Rank */}
            <span
              className={cn(
                'w-8 text-center font-bold tabular-nums text-sm',
                entry.rank === 1 && 'text-amber-500',
                entry.rank === 2 && 'text-gray-400',
                entry.rank === 3 && 'text-amber-700',
                entry.rank > 3 && 'text-gray-500'
              )}
            >
              {entry.rank <= 3
                ? ['🥇', '🥈', '🥉'][entry.rank - 1]
                : `#${entry.rank}`}
            </span>

            {/* Avatar */}
            <div
              className="flex items-center justify-center h-9 w-9 rounded-full text-white text-sm font-bold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${entry.levelColor}cc, ${entry.levelColor})`,
              }}
            >
              {entry.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-semibold truncate',
                  isCurrentUser && 'text-amber-700'
                )}
              >
                {entry.displayName}
                {isCurrentUser && (
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    (você)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <LevelBadge
                  level={entry.level}
                  title={entry.levelTitle}
                  color={entry.levelColor}
                  size="sm"
                  showTitle
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
              <span className="hidden sm:flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-400" />
                {entry.currentStreak}
              </span>
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  isCurrentUser ? 'text-amber-600' : 'text-gray-900'
                )}
              >
                {entry.xpEarned.toLocaleString()} XP
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
