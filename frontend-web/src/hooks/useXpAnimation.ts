'use client';

import { useCallback } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';

/**
 * Hook utilitario para disparar animacoes de XP.
 * Usado nos componentes que concedem XP (video completion, quiz, etc).
 */
export function useXpAnimation() {
  const showXpPopup = useGamificationStore((s) => s.showXpPopup);
  const fetchProfile = useGamificationStore((s) => s.fetchProfile);

  const animateXp = useCallback(
    (xp: number, description: string) => {
      showXpPopup(xp, description);

      // Refresh profile after XP is earned
      setTimeout(() => {
        fetchProfile();
      }, 1000);
    },
    [showXpPopup, fetchProfile]
  );

  return { animateXp };
}
