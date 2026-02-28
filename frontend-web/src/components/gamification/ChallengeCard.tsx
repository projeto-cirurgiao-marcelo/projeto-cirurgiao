'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, Check, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Challenge } from '@/lib/gamification';

function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  const Icon = icons[name] || LucideIcons.Target;
  return <Icon className={className} style={style} />;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onClaim?: (id: string) => void;
  isClaiming?: boolean;
  className?: string;
}

export function ChallengeCard({
  challenge,
  onClaim,
  isClaiming = false,
  className,
}: ChallengeCardProps) {
  const isCompleted = challenge.status === 'completed';
  const isExpired = challenge.status === 'expired';
  const canClaim = isCompleted && challenge.completedAt && !challenge.claimedAt;

  const difficultyConfig = {
    easy: { label: 'Fácil', color: '#22C55E', bg: '#F0FDF4' },
    medium: { label: 'Médio', color: '#F59E0B', bg: '#FFFBEB' },
    hard: { label: 'Difícil', color: '#EF4444', bg: '#FEF2F2' },
  };

  const diff = difficultyConfig[challenge.difficulty];

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(challenge.expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expirado';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <motion.div
      className={cn(
        'relative rounded-xl bg-white border border-gray-200 shadow-sm p-4 transition-all duration-300',
        isCompleted && 'border-green-200 bg-green-50/50',
        isExpired && 'opacity-50',
        !isCompleted && !isExpired && 'hover:shadow-md hover:border-blue-200',
        className
      )}
      whileHover={!isCompleted && !isExpired ? { scale: 1.01 } : {}}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            isCompleted ? 'bg-green-50' : 'bg-gray-50'
          )}
        >
          {isCompleted ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <DynamicIcon
              name={challenge.icon}
              className="h-5 w-5 text-gray-500"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className={cn(
                'text-sm font-semibold text-gray-900 truncate',
                isCompleted && 'line-through text-gray-500'
              )}
            >
              {challenge.title}
            </h3>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: diff.bg, color: diff.color }}
            >
              {diff.label}
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-2">
            {challenge.description}
          </p>

          {/* Progress bar */}
          {!isCompleted && !isExpired && (
            <div className="space-y-1">
              <div className="h-1.5 md:h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ backgroundColor: diff.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${challenge.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>
                  {challenge.current}/{challenge.target}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getTimeRemaining()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* XP Reward */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            +{challenge.xpReward} XP
          </span>

          {canClaim && onClaim && (
            <Button
              size="sm"
              className="h-7 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm"
              onClick={() => onClaim(challenge.id)}
              disabled={isClaiming}
            >
              {isClaiming ? 'Coletando...' : 'Coletar!'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
