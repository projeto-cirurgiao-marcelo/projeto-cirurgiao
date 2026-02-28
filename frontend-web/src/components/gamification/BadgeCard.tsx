'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { RARITY_COLORS, RARITY_LABELS, CATEGORY_LABELS } from '@/lib/gamification';
import type { Badge } from '@/lib/gamification';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  const Icon = icons[name] || LucideIcons.Award;
  return <Icon className={className} style={style} />;
}

interface BadgeCardProps {
  badge: Badge;
  className?: string;
}

export function BadgeCard({ badge, className }: BadgeCardProps) {
  const isUnlocked = badge.unlockedAt !== null;
  const colors = RARITY_COLORS[badge.rarity];
  const rarityLabel = RARITY_LABELS[badge.rarity];
  const isLegendary = badge.rarity === 'legendary';
  const isEpic = badge.rarity === 'epic';
  const progress = badge.progress;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={cn(
              'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-default',
              isUnlocked
                ? 'bg-white shadow-sm hover:shadow-lg'
                : 'bg-gray-50 opacity-60 hover:opacity-80',
              className
            )}
            style={{
              borderColor: isUnlocked ? colors.border : '#e5e7eb',
              boxShadow: isUnlocked ? `0 0 12px ${colors.glow}` : undefined,
            }}
            whileHover={{ scale: isUnlocked ? 1.03 : 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Rarity indicator */}
            <div
              className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            >
              {rarityLabel}
            </div>

            {/* Icon container */}
            <div
              className={cn(
                'relative flex items-center justify-center h-14 w-14 rounded-full transition-all',
                !isUnlocked && 'grayscale'
              )}
              style={{
                background: isUnlocked
                  ? `linear-gradient(135deg, ${colors.bg}, white)`
                  : '#f3f4f6',
                border: `2px solid ${isUnlocked ? colors.border : '#d1d5db'}`,
              }}
            >
              {isUnlocked ? (
                <DynamicIcon
                  name={badge.icon}
                  className="h-7 w-7"
                  style={{ color: colors.text }}
                />
              ) : (
                <Lock className="h-5 w-5 text-gray-400" />
              )}

              {/* Shimmer for epic/legendary */}
              {isUnlocked && (isEpic || isLegendary) && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, transparent, ${colors.border}30, transparent)`,
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </div>

            {/* Name */}
            <p className="text-xs font-bold text-gray-900 text-center leading-tight min-h-[2rem] flex items-center">
              {badge.name}
            </p>

            {/* Progress bar for locked badges */}
            {!isUnlocked && progress && progress.target > 0 && (
              <div className="w-full">
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress.percent}%`,
                      backgroundColor: colors.border,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  {progress.current}/{progress.target}
                </p>
              </div>
            )}

            {/* Check for unlocked */}
            {isUnlocked && (
              <motion.div
                className="absolute -top-1 -left-1 flex items-center justify-center h-5 w-5 rounded-full bg-green-500 text-white text-[10px] shadow-sm"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              >
                ✓
              </motion.div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center bg-gray-900 text-white border border-gray-700 shadow-lg">
          <p className="font-semibold text-sm text-white">{badge.name}</p>
          <p className="text-xs text-gray-300 mt-0.5">
            {badge.description}
          </p>
          <p
            className="text-[10px] font-semibold mt-1"
            style={{ color: colors.text }}
          >
            {CATEGORY_LABELS[badge.category]} &middot; {rarityLabel}
          </p>
          {isUnlocked && badge.unlockedAt && (
            <p className="text-[10px] text-gray-400 mt-1">
              Desbloqueado em{' '}
              {new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
