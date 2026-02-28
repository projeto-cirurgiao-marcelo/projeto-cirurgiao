'use client';

import { useEffect } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';

/**
 * Hook para carregar e gerenciar badges de gamificacao.
 * Carrega automaticamente na primeira renderizacao.
 */
export function useBadges() {
  const badges = useGamificationStore((s) => s.badges);
  const summary = useGamificationStore((s) => s.badgesSummary);
  const isLoading = useGamificationStore((s) => s.isLoadingBadges);
  const fetchBadges = useGamificationStore((s) => s.fetchBadges);

  useEffect(() => {
    if (badges.length === 0 && !isLoading) {
      fetchBadges();
    }
  }, [badges.length, isLoading, fetchBadges]);

  return {
    badges,
    summary,
    isLoading,
    refetch: fetchBadges,
  };
}
