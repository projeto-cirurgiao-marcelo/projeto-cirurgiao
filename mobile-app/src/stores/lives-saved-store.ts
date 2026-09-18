/**
 * Último número conhecido do contador, persistido pra Home renderizar na
 * hora e atualizar em silêncio (mesmo padrão de persist do auth-store).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { livesSavedService, type LifeSavedSummary } from '../services/api/lives-saved.service';

interface LivesSavedState {
  summary: LifeSavedSummary | null;
  fetchedAt: number | null;
  refresh: () => Promise<void>;
}

export const useLivesSavedStore = create<LivesSavedState>()(
  persist(
    (set) => ({
      summary: null,
      fetchedAt: null,
      refresh: async () => {
        const summary = await livesSavedService.summary();
        if (summary) set({ summary, fetchedAt: Date.now() });
      },
    }),
    {
      name: 'lives-saved-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ summary: s.summary, fetchedAt: s.fetchedAt }),
    },
  ),
);
