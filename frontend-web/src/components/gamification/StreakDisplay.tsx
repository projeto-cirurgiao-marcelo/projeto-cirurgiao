'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Flame, Snowflake } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StreakDisplayProps {
  current: number;
  longest: number;
  todayCompleted: boolean;
  freezesAvailable: number;
  variant?: 'compact' | 'full';
  className?: string;
}

export function StreakDisplay({
  current,
  longest,
  todayCompleted,
  freezesAvailable,
  variant = 'compact',
  className,
}: StreakDisplayProps) {
  const getFlameColor = () => {
    if (current >= 30) return 'text-red-500';
    if (current >= 7) return 'text-orange-500';
    if (current >= 3) return 'text-amber-500';
    return 'text-gray-400';
  };

  const getFlameGlow = () => {
    if (current >= 30) return 'drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]';
    if (current >= 7) return 'drop-shadow-[0_0_4px_rgba(249,115,22,0.4)]';
    return '';
  };

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 cursor-default',
                className
              )}
            >
              <motion.div
                animate={
                  current > 0
                    ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Flame
                  className={cn(
                    'h-5 w-5 transition-all',
                    getFlameColor(),
                    getFlameGlow()
                  )}
                />
              </motion.div>
              <span className="text-sm font-bold tabular-nums">{current}</span>
              {todayCompleted && (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-center">
            <p className="font-semibold">
              {current} {current === 1 ? 'dia' : 'dias'} consecutivos
            </p>
            <p className="text-xs text-gray-500">
              Recorde: {longest} dias
            </p>
            {freezesAvailable > 0 && (
              <p className="text-xs text-blue-400 flex items-center gap-1 justify-center mt-1">
                <Snowflake className="h-3 w-3" />
                {freezesAvailable} freeze{freezesAvailable > 1 ? 's' : ''}{' '}
                disponível
              </p>
            )}
            {todayCompleted ? (
              <p className="text-xs text-green-500 mt-1">Hoje completo!</p>
            ) : (
              <p className="text-xs text-amber-500 mt-1">
                Estude hoje para manter!
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full variant
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl bg-white border border-gray-200 shadow-sm p-4',
        className
      )}
    >
      <motion.div
        className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-orange-100 to-amber-50"
        animate={
          current > 0
            ? { scale: [1, 1.08, 1] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Flame
          className={cn(
            'h-8 w-8',
            getFlameColor(),
            getFlameGlow()
          )}
        />
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{current}</span>
          <span className="text-sm text-gray-600">
            {current === 1 ? 'dia' : 'dias'} consecutivos
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>Recorde: {longest}</span>
          {freezesAvailable > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <Snowflake className="h-3 w-3" />
              {freezesAvailable} freeze{freezesAvailable > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {todayCompleted ? (
        <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Completo
        </div>
      ) : (
        <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Pendente
        </div>
      )}
    </div>
  );
}
