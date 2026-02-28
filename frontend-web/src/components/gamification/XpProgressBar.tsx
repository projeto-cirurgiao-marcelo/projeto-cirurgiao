'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface XpProgressBarProps {
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  level: number;
  levelColor: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function XpProgressBar({
  currentXp,
  xpForCurrentLevel,
  xpForNextLevel,
  progressPercent,
  level,
  levelColor,
  showLabels = true,
  size = 'md',
  className,
}: XpProgressBarProps) {
  const isMaxLevel = level >= 10;
  const xpInLevel = currentXp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" style={{ color: levelColor }} />
            <span className="font-semibold text-gray-900">{currentXp.toLocaleString()} XP</span>
          </span>
          {!isMaxLevel ? (
            <span>
              {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} para Nv. {level + 1}
            </span>
          ) : (
            <span className="font-semibold" style={{ color: levelColor }}>
              Nível Máximo!
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-gray-100',
          sizeClasses[size]
        )}
      >
        <motion.div
          className={cn('h-full rounded-full', sizeClasses[size])}
          style={{
            background: isMaxLevel
              ? `linear-gradient(90deg, ${levelColor}, #F59E0B, ${levelColor})`
              : levelColor,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Shimmer effect */}
        {progressPercent > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              width: '30%',
            }}
            animate={{ x: ['0%', '400%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
          />
        )}
      </div>
    </div>
  );
}
