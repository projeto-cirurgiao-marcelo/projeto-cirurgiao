'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGamificationStore } from '@/lib/stores/gamification-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { XpPopup } from './XpPopup';

const POLLING_INTERVAL = 30_000; // 30 seconds

interface GamificationProviderProps {
  children: React.ReactNode;
}

/**
 * Provider de gamificacao que inicializa o store,
 * faz polling de eventos e renderiza popups/modais no root.
 *
 * Deve envolver o layout do student/dashboard.
 */
export function GamificationProvider({ children }: GamificationProviderProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchProfile = useGamificationStore((s) => s.fetchProfile);
  const fetchEvents = useGamificationStore((s) => s.fetchEvents);
  const reset = useGamificationStore((s) => s.reset);
  const fetchNotificationHistory = useNotificationStore((s) => s.fetchHistory);
  const resetNotifications = useNotificationStore((s) => s.reset);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    // Initial fetch
    fetchEvents();

    pollingRef.current = setInterval(() => {
      fetchEvents();
    }, POLLING_INTERVAL);
  }, [fetchEvents]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Load profile and start polling when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchNotificationHistory();
      startPolling();
    } else {
      stopPolling();
      reset();
      resetNotifications();
    }

    return () => {
      stopPolling();
    };
  }, [isAuthenticated, fetchProfile, fetchNotificationHistory, startPolling, stopPolling, reset, resetNotifications]);

  return (
    <>
      {children}

      {/* XP Popup floats on top of everything */}
      {isAuthenticated && <XpPopup />}

      {/* LevelUpModal and BadgeUnlockModal are rendered by the dashboard page
          or wherever they are needed, using store state */}
    </>
  );
}
