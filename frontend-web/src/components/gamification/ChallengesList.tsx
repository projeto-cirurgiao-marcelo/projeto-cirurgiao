'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChallengeCard } from './ChallengeCard';
import { useGamificationStore } from '@/lib/stores/gamification-store';
import type { ChallengesResponse } from '@/lib/gamification';
import { CalendarDays, CalendarRange, Sparkles, Target } from 'lucide-react';

interface ChallengesListProps {
  challenges: ChallengesResponse;
  className?: string;
}

export function ChallengesList({ challenges, className }: ChallengesListProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const claimChallenge = useGamificationStore((s) => s.claimChallenge);

  const handleClaim = async (challengeId: string) => {
    setClaimingId(challengeId);
    try {
      await claimChallenge(challengeId);
    } finally {
      setClaimingId(null);
    }
  };

  const sections = [
    {
      key: 'daily',
      title: 'Desafios Diários',
      icon: CalendarDays,
      items: challenges.daily,
      color: '#3B82F6',
    },
    {
      key: 'weekly',
      title: 'Desafios Semanais',
      icon: CalendarRange,
      items: challenges.weekly,
      color: '#8B5CF6',
    },
    {
      key: 'special',
      title: 'Desafios Especiais',
      icon: Sparkles,
      items: challenges.special,
      color: '#F59E0B',
    },
  ].filter((s) => s.items.length > 0);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <Target className="h-4 w-4" />
          <span>
            <strong className="text-gray-900">{challenges.completedToday}</strong>{' '}
            completados hoje
          </span>
        </span>
        <span>
          <strong className="text-gray-900">{challenges.totalCompleted}</strong>{' '}
          no total
        </span>
      </div>

      {/* Challenge sections */}
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4" style={{ color: section.color }} />
              <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
              <span className="text-xs text-gray-500">
                ({section.items.length})
              </span>
            </div>

            <div className="space-y-2">
              {section.items.map((challenge, index) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ChallengeCard
                    challenge={challenge}
                    onClaim={handleClaim}
                    isClaiming={claimingId === challenge.id}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {sections.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum desafio disponível no momento.</p>
          <p className="text-xs mt-1">Volte mais tarde para novos desafios!</p>
        </div>
      )}
    </div>
  );
}
