'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Crown, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/gamification';
import { LevelBadge } from './LevelBadge';

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
  className?: string;
}

export function LeaderboardPodium({ entries, className }: LeaderboardPodiumProps) {
  if (entries.length < 3) return null;

  const top3 = entries.slice(0, 3);
  // Display order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]];

  const podiumConfig = [
    { height: 'h-24', delay: 0.3, bg: 'from-gray-300 to-gray-400', medal: '🥈', rank: 2 },
    { height: 'h-32', delay: 0.1, bg: 'from-amber-400 to-yellow-500', medal: '🥇', rank: 1 },
    { height: 'h-20', delay: 0.5, bg: 'from-amber-600 to-orange-700', medal: '🥉', rank: 3 },
  ];

  return (
    <div className={cn('flex items-end justify-center gap-2 sm:gap-4 py-4', className)}>
      {podiumOrder.map((entry, index) => {
        const config = podiumConfig[index];
        const isFirst = config.rank === 1;

        return (
          <motion.div
            key={entry.userId}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: config.delay, type: 'spring', stiffness: 150, damping: 15 }}
          >
            {/* Avatar + Name */}
            <motion.div
              className="flex flex-col items-center mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: config.delay + 0.2, type: 'spring' }}
            >
              {isFirst && (
                <motion.div
                  animate={{ y: [0, -3, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Crown className="h-6 w-6 text-amber-400 mb-1" />
                </motion.div>
              )}

              <div
                className={cn(
                  'flex items-center justify-center rounded-full bg-gradient-to-br text-white font-bold shadow-lg',
                  isFirst ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm'
                )}
                style={{
                  background: `linear-gradient(135deg, ${entry.levelColor}cc, ${entry.levelColor})`,
                  boxShadow: `0 4px 12px ${entry.levelColor}40`,
                }}
              >
                {entry.displayName.charAt(0).toUpperCase()}
              </div>

              <p className={cn(
                'font-semibold text-center mt-1 max-w-[80px] sm:max-w-[100px] truncate',
                isFirst ? 'text-sm' : 'text-xs'
              )}>
                {entry.displayName}
              </p>

              <LevelBadge
                level={entry.level}
                title={entry.levelTitle}
                color={entry.levelColor}
                size="sm"
                showTitle={false}
              />

              <p className={cn(
                'font-bold tabular-nums mt-0.5',
                isFirst ? 'text-base text-amber-600' : 'text-sm text-gray-500'
              )}>
                {entry.xpEarned.toLocaleString()} XP
              </p>
            </motion.div>

            {/* Podium block */}
            <motion.div
              className={cn(
                'w-20 sm:w-24 rounded-t-lg bg-gradient-to-b flex items-start justify-center pt-3',
                config.height
              )}
              style={{
                background:
                  config.rank === 1
                    ? 'linear-gradient(to bottom, #F59E0B, #D97706)'
                    : config.rank === 2
                    ? 'linear-gradient(to bottom, #9CA3AF, #6B7280)'
                    : 'linear-gradient(to bottom, #CD7F32, #A0522D)',
              }}
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              transition={{ delay: config.delay + 0.3, duration: 0.5, ease: 'easeOut' }}
            >
              <span className="text-2xl">{config.medal}</span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
