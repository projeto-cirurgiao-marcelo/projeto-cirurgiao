'use client';

import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  title: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  className?: string;
}

export function LevelBadge({
  level,
  title,
  color,
  size = 'md',
  showTitle = true,
  className,
}: LevelBadgeProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-lg',
  };

  const titleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const isMaxLevel = level >= 10;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full font-bold text-white shadow-md transition-transform hover:scale-105',
          sizeClasses[size],
          isMaxLevel && 'animate-pulse'
        )}
        style={{
          background: isMaxLevel
            ? `linear-gradient(135deg, ${color}, #F59E0B, ${color})`
            : color,
          boxShadow: `0 0 ${size === 'lg' ? '12px' : '8px'} ${color}40`,
        }}
      >
        {level}
        {isMaxLevel && (
          <div
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: `linear-gradient(135deg, transparent, rgba(255,255,255,0.5), transparent)`,
              animation: 'shimmer 2s infinite',
            }}
          />
        )}
      </div>
      {showTitle && (
        <span
          className={cn(
            'font-semibold truncate',
            titleSizeClasses[size]
          )}
          style={{ color }}
        >
          {title}
        </span>
      )}
    </div>
  );
}
