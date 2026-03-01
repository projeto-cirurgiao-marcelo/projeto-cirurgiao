'use client';

import { useCallback } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';

/**
 * Hook utilitario para disparar animacoes de XP popup.
 */
export function useXpAnimation() {
  const showXpPopup = useGamificationStore((s) => s.showXpPopup);

  const triggerXp = useCallback(
    (xp: number, description: string) => {
      showXpPopup(xp, description);
    },
    [showXpPopup],
  );

  return { triggerXp };
}
