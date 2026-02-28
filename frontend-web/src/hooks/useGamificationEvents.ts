'use client';

import { useEffect, useRef } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';
import { useAuthStore } from '@/lib/stores/auth-store';

const POLLING_INTERVAL = 30_000;

/**
 * Hook para polling de eventos de gamificacao.
 * Automaticamente inicia/para com base no estado de autenticacao.
 * Normalmente nao precisa ser usado diretamente — o GamificationProvider ja faz isso.
 */
export function useGamificationEvents() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchEvents = useGamificationStore((s) => s.fetchEvents);
  const pendingEvents = useGamificationStore((s) => s.pendingEvents);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchEvents();

    intervalRef.current = setInterval(fetchEvents, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, fetchEvents]);

  return {
    pendingEvents,
    refetch: fetchEvents,
  };
}
