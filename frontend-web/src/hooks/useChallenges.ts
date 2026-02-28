'use client';

import { useEffect } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';

/**
 * Hook para carregar e gerenciar desafios de gamificacao.
 */
export function useChallenges() {
  const challenges = useGamificationStore((s) => s.challenges);
  const isLoading = useGamificationStore((s) => s.isLoadingChallenges);
  const fetchChallenges = useGamificationStore((s) => s.fetchChallenges);
  const claimChallenge = useGamificationStore((s) => s.claimChallenge);

  useEffect(() => {
    if (!challenges && !isLoading) {
      fetchChallenges();
    }
  }, [challenges, isLoading, fetchChallenges]);

  return {
    challenges,
    isLoading,
    claimChallenge,
    refetch: fetchChallenges,
  };
}
