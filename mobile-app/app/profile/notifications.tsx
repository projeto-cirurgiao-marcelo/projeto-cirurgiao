import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGamificationStore } from '../../src/stores/gamification-store';
import type { GamificationEvent } from '../../src/types/gamification.types';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

const EVENT_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  label: string;
}> = {
  xp_earned: { icon: 'sparkles', color: '#F59E0B', bg: '#FFFBEB', label: 'XP' },
  level_up: { icon: 'trending-up', color: '#8B5CF6', bg: '#F5F3FF', label: 'Nível' },
  badge_unlocked: { icon: 'ribbon', color: '#3B82F6', bg: '#EFF6FF', label: 'Conquista' },
  streak_milestone: { icon: 'flame', color: '#EF4444', bg: '#FEF2F2', label: 'Sequência' },
  challenge_completed: { icon: 'checkmark-done-circle', color: '#22C55E', bg: '#F0FDF4', label: 'Desafio' },
  leaderboard_change: { icon: 'podium', color: '#6366F1', bg: '#EEF2FF', label: 'Ranking' },
};

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getEventTitle(event: GamificationEvent): string {
  switch (event.type) {
    case 'xp_earned':
      return `+${event.data.xp} XP`;
    case 'level_up':
      return `Nível ${event.data.newLevel}: ${event.data.newTitle}`;
    case 'badge_unlocked':
      return `Badge: ${event.data.badge?.name}`;
    case 'streak_milestone':
      return `Sequência de ${event.data.streakDays} dias!`;
    case 'challenge_completed':
      return `Desafio completado!`;
    default:
      return 'Evento';
  }
}

function getEventMessage(event: GamificationEvent): string {
  switch (event.type) {
    case 'xp_earned':
      return event.data.description || event.data.action || '';
    case 'level_up':
      return 'Parabéns! Você subiu de nível!';
    case 'badge_unlocked':
      return event.data.badge?.description || '';
    case 'streak_milestone':
      return 'Continue assim! Sua dedicação está valendo a pena.';
    case 'challenge_completed':
      return event.data.challenge?.title || '';
    default:
      return '';
  }
}

export default function NotificationsScreen() {
  const {
    events,
    unreadCount,
    isLoading,
    fetchEventHistory,
    markEventRead,
    markAllRead,
  } = useGamificationStore();

  useEffect(() => {
    fetchEventHistory();
  }, []);

  const onRefresh = useCallback(() => {
    fetchEventHistory();
  }, [fetchEventHistory]);

  const renderEvent = ({ item }: { item: GamificationEvent }) => {
    const config = EVENT_CONFIG[item.type] || EVENT_CONFIG.xp_earned;
    const isUnread = !item.readAt;

    return (
      <TouchableOpacity
        style={[styles.eventItem, isUnread && styles.eventItemUnread]}
        onPress={() => {
          if (isUnread) markEventRead(item.id);
        }}
        activeOpacity={0.7}
      >
        {/* Unread dot */}
        {isUnread && <View style={styles.unreadDot} />}

        {/* Icon */}
        <View style={[styles.eventIcon, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>

        {/* Content */}
        <View style={styles.eventContent}>
          <View style={styles.eventTitleRow}>
            <Text style={[styles.eventTitle, isUnread && styles.eventTitleUnread]}>
              {getEventTitle(item)}
            </Text>
            <Text style={styles.eventTime}>{formatEventTime(item.timestamp)}</Text>
          </View>
          <Text style={styles.eventMessage} numberOfLines={2}>
            {getEventMessage(item)}
          </Text>
          <View style={styles.eventBadge}>
            <Text style={[styles.eventBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Ler todas</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Unread count banner */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="notifications" size={14} color={Colors.accent} />
          <Text style={styles.unreadBannerText}>
            {unreadCount} {unreadCount === 1 ? 'nova notificação' : 'novas notificações'}
          </Text>
        </View>
      )}

      {/* Event list */}
      {isLoading && events.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.loadingText}>Carregando notificações...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={[Colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={40} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
              <Text style={styles.emptyText}>
                Complete aulas, quizzes e participe do fórum para ganhar XP e conquistas!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  markAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  markAllText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: `${Colors.accent}10`,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  unreadBannerText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  listContent: {
    padding: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  eventItemUnread: {
    backgroundColor: `${Colors.accent}05`,
    borderColor: `${Colors.accent}20`,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    position: 'absolute',
    top: 12,
    left: 8,
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  eventContent: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    flex: 1,
  },
  eventTitleUnread: {
    fontWeight: FontWeight.bold,
  },
  eventTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  eventMessage: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: FontSize.xs * 1.4,
    marginBottom: Spacing.xs,
  },
  eventBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.accent}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.5,
  },
});
