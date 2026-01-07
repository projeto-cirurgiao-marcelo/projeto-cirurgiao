'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressEnhancedProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
}

export function ProgressEnhanced({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  variant = 'default',
  animated = true,
  className,
  ...props
}: ProgressEnhancedProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const getVariantColor = () => {
    if (variant === 'success') return 'bg-[rgb(var(--accent-500))]';
    if (variant === 'warning') return 'bg-[rgb(var(--warning))]';
    if (variant === 'error') return 'bg-[rgb(var(--error))]';

    // Default: cor baseada na porcentagem
    if (percentage >= 67) return 'bg-[rgb(var(--progress-complete))]';
    if (percentage >= 34) return 'bg-[rgb(var(--progress-partial))]';
    return 'bg-[rgb(var(--secondary-500))]';
  };

  const getSizeClasses = () => {
    if (size === 'sm') return 'h-1.5';
    if (size === 'lg') return 'h-3';
    return 'h-2'; // md
  };

  return (
    <div className={cn('w-full space-y-2', className)} {...props}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-semibold text-foreground">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-[rgb(var(--progress-empty))]',
          getSizeClasses()
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            getVariantColor(),
            animated && 'animate-in slide-in-from-left'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
