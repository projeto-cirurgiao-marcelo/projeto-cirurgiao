import { create } from 'zustand';
import { gamificationService } from '@/lib/gamification';
import type {
  GamificationEvent,
  GamificationEventType,
} from '@/lib/gamification';

// ===== Display Types =====

export interface NotificationDisplay {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  icon: string;
  read: boolean;
  createdAt: string;
  eventType: GamificationEventType;
}

// ===== Event -> Notification Mapping =====

function mapEventToNotification(
  event: GamificationEvent,
): NotificationDisplay {
  const { type, data, readAt, timestamp } = event;

  switch (type) {
    case 'xp_earned':
      return {
        id: event.id,
        title: `+${data.xp || 0} XP`,
        message: data.description || 'Experiencia ganha',
        type: 'success',
        icon: 'Sparkles',
        read: readAt !== null,
        createdAt: timestamp,
        eventType: type,
      };

    case 'level_up':
      return {
        id: event.id,
        title: `Nivel ${data.newLevel}!`,
        message: `Voce agora e ${data.newTitle}`,
        type: 'warning',
        icon: 'TrendingUp',
        read: readAt !== null,
        createdAt: timestamp,
        eventType: type,
      };

    case 'badge_unlocked':
      return {
        id: event.id,
        title: `Badge: ${data.badge?.name || 'Novo badge'}`,
        message: data.badge?.description || 'Badge desbloqueado!',
        type: 'info',
        icon: data.badge?.icon || 'Award',
        read: readAt !== null,
        createdAt: timestamp,
        eventType: type,
      };

    case 'streak_milestone':
      return {
        id: event.id,
        title: `Sequencia de ${data.streakDays} dias!`,
        message: 'Continue assim! Sua dedicacao e inspiradora.',
        type: 'success',
        icon: 'Flame',
        read: readAt !== null,
        createdAt: timestamp,
        eventType: type,
      };

    case 'challenge_completed':
      return {
        id: event.id,
        title: 'Desafio completado!',
        message: `${data.challenge?.title || 'Desafio'} - +${data.challenge?.xpReward || 0} XP`,
        type: 'success',
        icon: 'Target',
        read: readAt !== null,
        createdAt: timestamp,
        eventType: type,
      };

    default:
      return {
        id: event.id,
        title: 'Notificacao',
        message: 'Novo evento de gamificacao',
        type: 'info',
        icon: 'Bell',
        read: readAt !== null,
        createdAt: timestamp,
        eventType: type,
      };
  }
}

// ===== Store =====

interface NotificationState {
  notifications: NotificationDisplay[];
  unreadCount: number;
  isLoading: boolean;
  hasLoaded: boolean;
}

interface NotificationActions {
  fetchHistory: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  addFromEvents: (events: GamificationEvent[]) => void;
  reset: () => void;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasLoaded: false,
};

export const useNotificationStore = create<
  NotificationState & NotificationActions
>()((set, get) => ({
  ...initialState,

  fetchHistory: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      const data = await gamificationService.getEventHistory(30);
      const notifications = data.events.map(mapEventToNotification);
      set({
        notifications,
        unreadCount: data.unreadCount,
        isLoading: false,
        hasLoaded: true,
      });
    } catch (error) {
      console.warn('[Notifications] Erro ao carregar historico:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    const prev = get();
    const wasUnread = prev.notifications.find((n) => n.id === id && !n.read);

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
      unreadCount: wasUnread
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));

    try {
      await gamificationService.markEventRead(id);
    } catch {
      // Revert on failure
      get().fetchHistory();
    }
  },

  markAllAsRead: async () => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));

    try {
      await gamificationService.markAllEventsRead();
    } catch {
      get().fetchHistory();
    }
  },

  dismiss: async (id: string) => {
    const wasUnread = get().notifications.find((n) => n.id === id && !n.read);

    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: wasUnread
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));

    if (wasUnread) {
      try {
        await gamificationService.markEventRead(id);
      } catch {
        // Silent fail - already removed from UI
      }
    }
  },

  addFromEvents: (events: GamificationEvent[]) => {
    const newNotifications = events.map(mapEventToNotification);
    set((state) => {
      const existingIds = new Set(state.notifications.map((n) => n.id));
      const trulyNew = newNotifications.filter(
        (n) => !existingIds.has(n.id),
      );
      if (trulyNew.length === 0) return state;

      return {
        notifications: [...trulyNew, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + trulyNew.length,
      };
    });
  },

  reset: () => set(initialState),
}));
