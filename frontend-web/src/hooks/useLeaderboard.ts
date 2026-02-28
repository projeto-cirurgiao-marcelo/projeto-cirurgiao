'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';
import type { LeaderboardPeriod } from '@/lib/gamification';

/**
 * Hook para carregar e gerenciar o leaderboard.
 */
export function useLeaderboard(initialPeriod: LeaderboardPeriod = 'weekly') {
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const leaderboard = useGamificationStore((s) => s.leaderboard);
  const isLoading = useGamificationStore((s) => s.isLoadingLeaderboard);
  const fetchLeaderboard = useGamificationStore((s) => s.fetchLeaderboard);

  const changePeriod = useCallback(
    (newPeriod: LeaderboardPeriod) => {
      setPeriod(newPeriod);
      fetchLeaderboard(newPeriod);
    },
    [fetchLeaderboard]
  );

  useEffect(() => {
    fetchLeaderboard(period);
  }, []);

  return {
    leaderboard,
    period,
    isLoading,
    changePeriod,
    refetch: () => fetchLeaderboard(period),
  };
}
