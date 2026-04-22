import { create } from 'zustand';
import { gamificationService } from '../services/api/gamification.service';
import { logger } from '../lib/logger';
import type {
  GamificationProfile,
  GamificationEvent,
  Badge,
  BadgeRarity,
  BadgesResponse,
  LeaderboardResponse,
  LeaderboardPeriod,
  ChallengesResponse,
  ClaimChallengeResponse,
} from '../types/gamification.types';

// ===== Celebration Types =====

interface LevelUpData {
  newLevel: number;
  newTitle: string;
  newColor: string;
}

interface BadgeUnlockData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
}

interface XpPopupItem {
  id: string;
  xp: number;
  description: string;
}

// ===== Store =====

interface GamificationState {
  // Existing
  profile: GamificationProfile | null;
  badges: Badge[];
  badgesSummary: BadgesResponse['summary'] | null;
  events: GamificationEvent[];
  unreadCount: number;
  isLoading: boolean;
  pollingInterval: ReturnType<typeof setInterval> | null;

  // Leaderboard
  leaderboard: LeaderboardResponse | null;
  isLoadingLeaderboard: boolean;

  // Challenges
  challenges: ChallengesResponse | null;
  isLoadingChallenges: boolean;

  // Celebrations
  showLevelUpModal: boolean;
  levelUpData: LevelUpData | null;
  showBadgeUnlockModal: boolean;
  badgeUnlockData: BadgeUnlockData | null;
  xpPopupQueue: XpPopupItem[];
}

interface GamificationActions {
  // Existing
  fetchProfile: () => Promise<void>;
  fetchBadges: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchEventHistory: () => Promise<void>;
  markEventRead: (eventId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;

  // Leaderboard
  fetchLeaderboard: (period?: LeaderboardPeriod) => Promise<void>;

  // Challenges
  fetchChallenges: () => Promise<void>;
  claimChallenge: (challengeId: string) => Promise<ClaimChallengeResponse | null>;

  // Celebrations
  processEvents: (events: GamificationEvent[]) => void;
  triggerLevelUp: (level: number, title: string, color: string) => void;
  dismissLevelUp: () => void;
  triggerBadgeUnlock: (badge: BadgeUnlockData) => void;
  dismissBadgeUnlock: () => void;
  showXpPopup: (xp: number, description: string) => void;
  dismissXpPopup: (id: string) => void;
}

type GamificationStore = GamificationState & GamificationActions;

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  // ===== Initial State =====
  profile: null,
  badges: [],
  badgesSummary: null,
  events: [],
  unreadCount: 0,
  isLoading: false,
  pollingInterval: null,

  leaderboard: null,
  isLoadingLeaderboard: false,

  challenges: null,
  isLoadingChallenges: false,

  showLevelUpModal: false,
  levelUpData: null,
  showBadgeUnlockModal: false,
  badgeUnlockData: null,
  xpPopupQueue: [],

  // ===== Existing Actions =====

  fetchProfile: async () => {
    try {
      const profile = await gamificationService.getProfile();
      set({ profile });
    } catch (error) {
      logger.error('[Gamification] Erro ao carregar perfil:', error);
    }
  },

  fetchBadges: async () => {
    try {
      const data = await gamificationService.getBadges();
      set({ badges: data.badges, badgesSummary: data.summary });
    } catch (error) {
      logger.error('[Gamification] Erro ao carregar badges:', error);
    }
  },

  fetchEvents: async () => {
    try {
      const data = await gamificationService.getRecentEvents();
      if (data.events && data.events.length > 0) {
        const state = get();
        const existingIds = new Set(state.events.map((e) => e.id));
        const newEvents = data.events.filter((e) => !existingIds.has(e.id));

        // Process unseen events for celebrations
        const unseenEvents = data.events.filter((e) => !e.seen);
        if (unseenEvents.length > 0) {
          get().processEvents(unseenEvents);
        }

        const allEvents = [...newEvents, ...state.events].slice(0, 50);
        const unreadCount = allEvents.filter((e) => !e.readAt).length;
        set({ events: allEvents, unreadCount });

        // Mark as seen
        for (const event of data.events) {
          if (!event.seen) {
            gamificationService.markEventSeen(event.id).catch(() => {});
          }
        }
      }
    } catch (error) {
      // Silent fail for polling
    }
  },

  fetchEventHistory: async () => {
    try {
      set({ isLoading: true });
      const data = await gamificationService.getEventHistory(50);
      set({
        events: data.events,
        unreadCount: data.unreadCount,
        isLoading: false,
      });
    } catch (error) {
      logger.error('[Gamification] Erro ao carregar historico:', error);
      set({ isLoading: false });
    }
  },

  markEventRead: async (eventId: string) => {
    try {
      await gamificationService.markEventRead(eventId);
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, readAt: new Date().toISOString() } : e
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      logger.error('[Gamification] Erro ao marcar como lido:', error);
    }
  },

  markAllRead: async () => {
    try {
      await gamificationService.markAllEventsRead();
      set((state) => ({
        events: state.events.map((e) => ({ ...e, readAt: e.readAt || new Date().toISOString() })),
        unreadCount: 0,
      }));
    } catch (error) {
      logger.error('[Gamification] Erro ao marcar todas como lidas:', error);
    }
  },

  startPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) return;

    get().fetchEvents();
    get().fetchProfile();

    const interval = setInterval(() => {
      get().fetchEvents();
    }, 30000);

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  // ===== Leaderboard =====

  fetchLeaderboard: async (period: LeaderboardPeriod = 'weekly') => {
    try {
      set({ isLoadingLeaderboard: true });
      const data = await gamificationService.getLeaderboard(period);
      set({ leaderboard: data, isLoadingLeaderboard: false });
    } catch (error) {
      logger.error('[Gamification] Erro ao carregar leaderboard:', error);
      set({ isLoadingLeaderboard: false });
    }
  },

  // ===== Challenges =====

  fetchChallenges: async () => {
    try {
      set({ isLoadingChallenges: true });
      const data = await gamificationService.getChallenges();
      set({ challenges: data, isLoadingChallenges: false });
    } catch (error) {
      logger.error('[Gamification] Erro ao carregar desafios:', error);
      set({ isLoadingChallenges: false });
    }
  },

  claimChallenge: async (challengeId: string) => {
    try {
      const result = await gamificationService.claimChallenge(challengeId);

      // Show XP popup immediately
      get().showXpPopup(result.xpAwarded, 'Desafio completado!');

      // Level up modal after 1.5s
      if (result.levelUp) {
        const { LEVELS } = require('../types/gamification.types');
        const levelDef = LEVELS.find((l: any) => l.level === result.levelUp!.newLevel);
        setTimeout(() => {
          get().triggerLevelUp(
            result.levelUp!.newLevel,
            result.levelUp!.newTitle,
            levelDef?.color || '#F59E0B',
          );
        }, 1500);
      }

      // Badge unlock modals after 4s (staggered)
      if (result.badgesUnlocked && result.badgesUnlocked.length > 0) {
        const delay = result.levelUp ? 4000 : 1500;
        result.badgesUnlocked.forEach((badge, i) => {
          setTimeout(() => {
            get().triggerBadgeUnlock({
              slug: badge.slug,
              name: badge.name,
              description: '',
              icon: badge.icon,
              rarity: badge.rarity as BadgeRarity,
            });
          }, delay + i * 2500);
        });
      }

      // Refresh challenges + profile
      get().fetchChallenges();
      get().fetchProfile();

      return result;
    } catch (error) {
      logger.error('[Gamification] Erro ao coletar desafio:', error);
      return null;
    }
  },

  // ===== Celebration Actions =====

  processEvents: (events: GamificationEvent[]) => {
    let levelUpDelay = 0;

    for (const event of events) {
      switch (event.type) {
        case 'xp_earned':
          if (event.data.xp) {
            get().showXpPopup(event.data.xp, event.data.description || event.data.action || '');
          }
          break;

        case 'level_up':
          if (event.data.newLevel && event.data.newTitle) {
            const { LEVELS } = require('../types/gamification.types');
            const levelDef = LEVELS.find((l: any) => l.level === event.data.newLevel);
            levelUpDelay = 1500;
            setTimeout(() => {
              get().triggerLevelUp(
                event.data.newLevel!,
                event.data.newTitle!,
                levelDef?.color || '#F59E0B',
              );
            }, 1500);
          }
          break;

        case 'badge_unlocked':
          if (event.data.badge) {
            const delay = levelUpDelay > 0 ? 4000 : 1500;
            setTimeout(() => {
              get().triggerBadgeUnlock({
                slug: event.data.badge!.slug,
                name: event.data.badge!.name,
                description: event.data.badge!.description || '',
                icon: event.data.badge!.icon,
                rarity: event.data.badge!.rarity as BadgeRarity,
              });
            }, delay);
          }
          break;

        case 'streak_milestone':
          if (event.data.streakDays) {
            get().showXpPopup(
              event.data.xp || 50,
              `Sequencia de ${event.data.streakDays} dias!`,
            );
          }
          break;

        case 'challenge_completed':
          if (event.data.challenge) {
            get().showXpPopup(
              event.data.challenge.xpReward,
              event.data.challenge.title,
            );
          }
          break;
      }
    }
  },

  triggerLevelUp: (level, title, color) => {
    set({
      showLevelUpModal: true,
      levelUpData: { newLevel: level, newTitle: title, newColor: color },
    });
  },

  dismissLevelUp: () => {
    set({ showLevelUpModal: false, levelUpData: null });
  },

  triggerBadgeUnlock: (badge) => {
    set({ showBadgeUnlockModal: true, badgeUnlockData: badge });
  },

  dismissBadgeUnlock: () => {
    set({ showBadgeUnlockModal: false, badgeUnlockData: null });
  },

  showXpPopup: (xp, description) => {
    const id = `xp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      xpPopupQueue: [...state.xpPopupQueue, { id, xp, description }],
    }));
    // Auto-dismiss after 3s
    setTimeout(() => get().dismissXpPopup(id), 3000);
  },

  dismissXpPopup: (id) => {
    set((state) => ({
      xpPopupQueue: state.xpPopupQueue.filter((p) => p.id !== id),
    }));
  },
}));

export default useGamificationStore;
