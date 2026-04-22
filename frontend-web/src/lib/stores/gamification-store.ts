import { create } from 'zustand';
import { gamificationService } from '@/lib/gamification';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { logger } from '@/lib/logger';
import type {
  GamificationProfile,
  Badge,
  BadgesSummary,
  LeaderboardResponse,
  LeaderboardPeriod,
  ChallengesResponse,
  ClaimChallengeResponse,
  GamificationEvent,
  BadgeRarity,
} from '@/lib/gamification';

// ===== State Types =====

interface GamificationState {
  profile: GamificationProfile | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  badges: Badge[];
  badgesSummary: BadgesSummary | null;
  isLoadingBadges: boolean;
  leaderboard: LeaderboardResponse | null;
  isLoadingLeaderboard: boolean;
  challenges: ChallengesResponse | null;
  isLoadingChallenges: boolean;
  pendingEvents: GamificationEvent[];
  isPollingEvents: boolean;
  showLevelUpModal: boolean;
  levelUpData: { newLevel: number; newTitle: string; newColor: string } | null;
  showBadgeUnlockModal: boolean;
  badgeUnlockData: {
    slug: string;
    name: string;
    description: string;
    icon: string;
    rarity: BadgeRarity;
  } | null;
  xpPopupQueue: Array<{ xp: number; description: string; id: string }>;
}

interface GamificationActions {
  fetchProfile: () => Promise<void>;
  fetchBadges: () => Promise<void>;
  fetchLeaderboard: (period?: LeaderboardPeriod) => Promise<void>;
  fetchChallenges: () => Promise<void>;
  claimChallenge: (challengeId: string) => Promise<ClaimChallengeResponse | null>;
  fetchEvents: () => Promise<void>;
  processEvents: (events: GamificationEvent[]) => void;
  markEventSeen: (eventId: string) => Promise<void>;
  triggerLevelUp: (level: number, title: string, color: string) => void;
  dismissLevelUp: () => void;
  triggerBadgeUnlock: (badge: {
    slug: string;
    name: string;
    description: string;
    icon: string;
    rarity: BadgeRarity;
  }) => void;
  dismissBadgeUnlock: () => void;
  showXpPopup: (xp: number, description: string) => void;
  dismissXpPopup: (id: string) => void;
  reset: () => void;
}

type GamificationStore = GamificationState & GamificationActions;

const initialState: GamificationState = {
  profile: null,
  isLoadingProfile: false,
  profileError: null,
  badges: [],
  badgesSummary: null,
  isLoadingBadges: false,
  leaderboard: null,
  isLoadingLeaderboard: false,
  challenges: null,
  isLoadingChallenges: false,
  pendingEvents: [],
  isPollingEvents: false,
  showLevelUpModal: false,
  levelUpData: null,
  showBadgeUnlockModal: false,
  badgeUnlockData: null,
  xpPopupQueue: [],
};

export const useGamificationStore = create<GamificationStore>()((set, get) => ({
  ...initialState,

  fetchProfile: async () => {
    set({ isLoadingProfile: true, profileError: null });
    try {
      const data = await gamificationService.getProfile();
      set({
        profile: {
          xp: data.xp,
          level: data.level,
          streak: data.streak,
          stats: data.stats,
          recentXpHistory: data.recentXpHistory,
        },
        isLoadingProfile: false,
      });
    } catch (error: any) {
      logger.error('[Gamification] Erro ao carregar perfil:', error);
      set({
        isLoadingProfile: false,
        profileError: error?.message || 'Erro ao carregar perfil',
      });
    }
  },

  fetchBadges: async () => {
    set({ isLoadingBadges: true });
    try {
      const data = await gamificationService.getBadges();
      set({ badges: data.badges, badgesSummary: data.summary, isLoadingBadges: false });
    } catch (error) {
      logger.error('[Gamification] Erro ao carregar badges:', error);
      set({ isLoadingBadges: false });
    }
  },

  fetchLeaderboard: async (period: LeaderboardPeriod = 'weekly') => {
    set({ isLoadingLeaderboard: true });
    try {
      const data = await gamificationService.getLeaderboard(period);
      set({ leaderboard: data, isLoadingLeaderboard: false });
    } catch (error) {
      logger.error('[Gamification] Erro ao carregar leaderboard:', error);
      set({ isLoadingLeaderboard: false });
    }
  },

  fetchChallenges: async () => {
    set({ isLoadingChallenges: true });
    try {
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
      if (result.success) {
        get().showXpPopup(result.xpAwarded, 'Desafio completado!');
        if (result.levelUp) {
          setTimeout(() => {
            get().triggerLevelUp(result.levelUp!.newLevel, result.levelUp!.newTitle, '#F59E0B');
          }, 1500);
        }
        if (result.badgesUnlocked.length > 0) {
          const badge = result.badgesUnlocked[0];
          setTimeout(() => {
            get().triggerBadgeUnlock({
              slug: badge.slug, name: badge.name, description: '',
              icon: badge.icon, rarity: badge.rarity as BadgeRarity,
            });
          }, result.levelUp ? 4000 : 1500);
        }
        get().fetchProfile();
        get().fetchChallenges();
      }
      return result;
    } catch (error) {
      logger.error('[Gamification] Erro ao reivindicar desafio:', error);
      return null;
    }
  },

  fetchEvents: async () => {
    if (get().isPollingEvents) return;
    set({ isPollingEvents: true });
    try {
      const data = await gamificationService.getEvents();
      const unseenEvents = data.events.filter((e) => !e.seen);
      if (unseenEvents.length > 0) {
        set({ pendingEvents: unseenEvents });
        get().processEvents(unseenEvents);
      }
    } catch (error) {
      logger.warn('[Gamification] Erro no polling de eventos:', error);
    } finally {
      set({ isPollingEvents: false });
    }
  },

  processEvents: (events: GamificationEvent[]) => {
    useNotificationStore.getState().addFromEvents(events);
    for (const event of events) {
      switch (event.type) {
        case 'xp_earned':
          if (event.data.xp && event.data.description) {
            get().showXpPopup(event.data.xp, event.data.description);
          }
          break;
        case 'level_up':
          if (event.data.newLevel && event.data.newTitle) {
            get().triggerLevelUp(event.data.newLevel, event.data.newTitle, '#F59E0B');
          }
          break;
        case 'badge_unlocked':
          if (event.data.badge) {
            get().triggerBadgeUnlock(event.data.badge);
          }
          break;
        case 'streak_milestone':
          if (event.data.streakDays) {
            get().showXpPopup(event.data.xp || 50, `Sequencia de ${event.data.streakDays} dias!`);
          }
          break;
        case 'challenge_completed':
          if (event.data.challenge) {
            get().showXpPopup(event.data.challenge.xpReward, `Desafio "${event.data.challenge.title}" completado!`);
          }
          break;
      }
      get().markEventSeen(event.id);
    }
  },

  markEventSeen: async (eventId: string) => {
    try {
      await gamificationService.markEventSeen(eventId);
      set((state) => ({ pendingEvents: state.pendingEvents.filter((e) => e.id !== eventId) }));
    } catch { /* silent */ }
  },

  triggerLevelUp: (level, title, color) => {
    set({ showLevelUpModal: true, levelUpData: { newLevel: level, newTitle: title, newColor: color } });
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
    const id = `xp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({ xpPopupQueue: [...state.xpPopupQueue, { xp, description, id }] }));
    setTimeout(() => { get().dismissXpPopup(id); }, 3000);
  },
  dismissXpPopup: (id) => {
    set((state) => ({ xpPopupQueue: state.xpPopupQueue.filter((p) => p.id !== id) }));
  },

  reset: () => { set(initialState); },
}));
