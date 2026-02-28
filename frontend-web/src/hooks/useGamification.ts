'use client';

import { useEffect } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';

/**
 * Hook principal para acessar o perfil de gamificacao.
 * Carrega automaticamente na primeira renderizacao.
 */
export function useGamification() {
  const profile = useGamificationStore((s) => s.profile);
  const isLoading = useGamificationStore((s) => s.isLoadingProfile);
  const error = useGamificationStore((s) => s.profileError);
  const fetchProfile = useGamificationStore((s) => s.fetchProfile);

  // Modal triggers (for external use)
  const triggerLevelUp = useGamificationStore((s) => s.triggerLevelUp);
  const triggerBadgeUnlock = useGamificationStore((s) => s.triggerBadgeUnlock);
  const showXpPopup = useGamificationStore((s) => s.showXpPopup);

  useEffect(() => {
    if (!profile && !isLoading && !error) {
      fetchProfile();
    }
  }, [profile, isLoading, error, fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
    // Utilities
    triggerLevelUp,
    triggerBadgeUnlock,
    showXpPopup,
  };
}
