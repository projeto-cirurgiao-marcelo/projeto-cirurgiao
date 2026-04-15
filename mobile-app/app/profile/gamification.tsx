import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomTabView } from '../../src/components/ui/CustomTabView';
import { BadgeCard } from '../../src/components/gamification/BadgeCard';
import { ChallengeCard } from '../../src/components/gamification/ChallengeCard';
import { LeaderboardPodium } from '../../src/components/gamification/LeaderboardPodium';
import { useGamificationStore } from '../../src/stores/gamification-store';
import { Colors as colors } from '../../src/constants/colors';
import {
  RARITY_LABELS,
  CATEGORY_LABELS,
  LEVELS,
} from '../../src/types/gamification.types';
import type {
  Badge,
  BadgeRarity,
  BadgeCategory,
  LeaderboardPeriod,
  LeaderboardEntry,
} from '../../src/types/gamification.types';

const TAB_ROUTES = [
  { key: 'overview', title: 'Visao Geral', icon: 'home-outline' as const },
  { key: 'achievements', title: 'Conquistas', icon: 'ribbon-outline' as const },
  { key: 'leaderboard', title: 'Ranking', icon: 'podium-outline' as const },
  { key: 'challenges', title: 'Desafios', icon: 'flag-outline' as const },
];

export default function GamificationHubScreen() {
  const router = useRouter();
  const {
    profile,
    badges,
    badgesSummary,
    leaderboard,
    challenges,
    isLoadingLeaderboard,
    isLoadingChallenges,
    fetchProfile,
    fetchBadges,
    fetchLeaderboard,
    fetchChallenges,
    claimChallenge,
  } = useGamificationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchBadges();
    fetchLeaderboard('weekly');
    fetchChallenges();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchBadges(), fetchLeaderboard(), fetchChallenges()]);
    setRefreshing(false);
  };

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    await claimChallenge(id);
    setClaimingId(null);
  };

  const renderScene = useCallback((route: { key: string }) => {
    switch (route.key) {
      case 'overview':
        return <OverviewTab profile={profile} badges={badges} challenges={challenges} onRefresh={handleRefresh} refreshing={refreshing} />;
      case 'achievements':
        return <AchievementsTab badges={badges} summary={badgesSummary} />;
      case 'leaderboard':
        return <LeaderboardTab />;
      case 'challenges':
        return <ChallengesTab challenges={challenges} isLoading={isLoadingChallenges} onClaim={handleClaim} claimingId={claimingId} />;
      default:
        return null;
    }
  }, [profile, badges, badgesSummary, challenges, isLoadingChallenges, claimingId, refreshing]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="trophy" size={18} color={colors.accent} />
          <Text style={styles.headerTitle}>Gamificacao</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <CustomTabView routes={TAB_ROUTES} renderScene={renderScene} />
    </SafeAreaView>
  );
}

// ===== Tab: Visao Geral =====

function OverviewTab({ profile, badges, challenges, onRefresh, refreshing }: any) {
  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  const unlockedBadges = badges.filter((b: Badge) => b.unlockedAt);
  const firstChallenge = challenges?.daily?.[0] || challenges?.weekly?.[0] || null;
  const watchHours = Math.floor((profile.stats.totalWatchTimeMinutes || 0) / 60);
  const watchMins = (profile.stats.totalWatchTimeMinutes || 0) % 60;

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Hero card */}
      <View style={[styles.heroCard, { borderColor: profile.level.color + '40' }]}>
        <View style={[styles.levelCircle, { backgroundColor: profile.level.color }]}>
          <Text style={styles.levelNumber}>{profile.level.current}</Text>
        </View>
        <Text style={[styles.levelTitle, { color: profile.level.color }]}>{profile.level.title}</Text>

        {/* XP bar */}
        <View style={styles.xpBarContainer}>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${profile.level.progressPercent}%`, backgroundColor: profile.level.color }]} />
          </View>
          <Text style={styles.xpBarLabel}>
            {profile.xp.total} / {profile.level.xpForNextLevel} XP
          </Text>
        </View>

        {/* Streak */}
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={18} color="#EF4444" />
          <Text style={styles.streakText}>{profile.streak.current} dias</Text>
          <Text style={styles.streakRecord}>Recorde: {profile.streak.longest}</Text>
        </View>
      </View>

      {/* Stats 2x2 */}
      <View style={styles.statsGrid}>
        <StatCard icon="time-outline" color="#8B5CF6" value={`${watchHours}h ${watchMins}m`} label="Tempo" />
        <StatCard icon="school" color="#22C55E" value={profile.stats.coursesCompleted} label="Cursos" />
        <StatCard icon="play-circle" color="#3B82F6" value={profile.stats.videosCompleted} label="Videos" />
        <StatCard icon="chatbubble-outline" color="#EC4899" value={profile.stats.forumTopics + profile.stats.forumReplies} label="Forum" />
      </View>

      {/* Weekly XP goal */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={styles.sectionTitle}>Meta Semanal</Text>
        </View>
        <View style={styles.xpBarTrack}>
          <View style={[styles.xpBarFill, { width: `${Math.min((profile.xp.weekEarned / 500) * 100, 100)}%` }]} />
        </View>
        <Text style={styles.xpGoalText}>{profile.xp.weekEarned} / 500 XP esta semana</Text>
      </View>

      {/* First challenge */}
      {firstChallenge && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flag-outline" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>Desafio Ativo</Text>
          </View>
          <ChallengeCard challenge={firstChallenge} />
        </View>
      )}

      {/* Recent badges */}
      {unlockedBadges.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="ribbon" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>Conquistas Recentes</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {unlockedBadges.slice(0, 6).map((badge: Badge) => (
              <View key={badge.slug} style={{ width: 130 }}>
                <BadgeCard badge={badge} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* XP history */}
      {profile.recentXpHistory && profile.recentXpHistory.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>Historico XP</Text>
          </View>
          {profile.recentXpHistory.slice(0, 8).map((entry: any, i: number) => (
            <View key={i} style={styles.xpHistoryRow}>
              <View style={styles.xpHistoryBadge}>
                <Text style={styles.xpHistoryXp}>+{entry.xp}</Text>
              </View>
              <Text style={styles.xpHistoryDesc} numberOfLines={1}>{entry.description || entry.action}</Text>
              <Text style={styles.xpHistoryTime}>{formatRelativeTime(entry.timestamp)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatCard({ icon, color, value, label }: { icon: any; color: string; value: any; label: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ===== Tab: Conquistas =====

function AchievementsTab({ badges, summary }: { badges: Badge[]; summary: any }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<BadgeCategory | 'all'>('all');

  const filtered = badges.filter((b) => {
    if (statusFilter === 'unlocked' && !b.unlockedAt) return false;
    if (statusFilter === 'locked' && b.unlockedAt) return false;
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    return true;
  }).sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1;
    if (!a.unlockedAt && b.unlockedAt) return 1;
    return 0;
  });

  const unlocked = summary?.unlocked || 0;
  const total = summary?.total || badges.length;

  return (
    <View style={styles.tabContent}>
      {/* Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{unlocked} de {total} desbloqueadas</Text>
        <View style={styles.summaryTrack}>
          <View style={[styles.summaryFill, { width: `${total > 0 ? (unlocked / total) * 100 : 0}%` }]} />
        </View>
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {(['all', 'unlocked', 'locked'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todas' : f === 'unlocked' ? 'Desbloqueadas' : 'Bloqueadas'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterDivider} />
        {(['all', 'progress', 'quizzes', 'community', 'consistency', 'special'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, categoryFilter === f && styles.filterChipActive]}
            onPress={() => setCategoryFilter(f)}
          >
            <Text style={[styles.filterText, categoryFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todas' : CATEGORY_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.slug}
        numColumns={2}
        contentContainerStyle={styles.badgeGrid}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <BadgeCard badge={item} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ribbon-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyText}>Nenhuma conquista encontrada</Text>
          </View>
        }
      />
    </View>
  );
}

// ===== Tab: Ranking =====

function LeaderboardTab() {
  const { leaderboard, isLoadingLeaderboard, fetchLeaderboard } = useGamificationStore();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');

  const handlePeriodChange = (p: LeaderboardPeriod) => {
    setPeriod(p);
    fetchLeaderboard(p);
  };

  if (isLoadingLeaderboard && !leaderboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  const entries = leaderboard?.entries || [];

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPadding}>
      {/* Period toggle */}
      <View style={styles.periodToggle}>
        {(['weekly', 'monthly'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => handlePeriodChange(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'weekly' ? 'Semanal' : 'Mensal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current user rank */}
      {leaderboard?.currentUser && (
        <View style={styles.yourRankCard}>
          <Text style={styles.yourRankLabel}>Sua Posicao</Text>
          <View style={styles.yourRankRow}>
            <Text style={styles.yourRankNumber}>{leaderboard.currentUser.rank}°</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.yourRankTitle}>{leaderboard.currentUser.levelTitle}</Text>
              <Text style={styles.yourRankXp}>{leaderboard.currentUser.xpEarned} XP</Text>
            </View>
          </View>
        </View>
      )}

      {/* Podium */}
      {entries.length >= 3 && <LeaderboardPodium entries={entries.slice(0, 3)} />}

      {/* Full list */}
      <View style={{ marginTop: 16, gap: 6 }}>
        {entries.map((entry) => (
          <View
            key={entry.userId}
            style={[
              styles.leaderboardRow,
              leaderboard?.currentUser?.rank === entry.rank && styles.leaderboardRowCurrent,
            ]}
          >
            <Text style={styles.lbRank}>
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `${entry.rank}°`}
            </Text>
            <View style={[styles.lbAvatar, { borderColor: entry.levelColor }]}>
              <Text style={styles.lbAvatarText}>
                {entry.displayName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lbName} numberOfLines={1}>{entry.displayName}</Text>
              <Text style={styles.lbLevel}>Lv.{entry.level}</Text>
            </View>
            <Text style={styles.lbXp}>{entry.xpEarned} XP</Text>
          </View>
        ))}
      </View>

      {entries.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="podium-outline" size={40} color="#9CA3AF" />
          <Text style={styles.emptyText}>Nenhum participante ainda</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ===== Tab: Desafios =====

function ChallengesTab({ challenges, isLoading, onClaim, claimingId }: any) {
  if (isLoading && !challenges) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  const daily = challenges?.daily || [];
  const weekly = challenges?.weekly || [];
  const special = challenges?.special || [];
  const hasAnyChallenges = daily.length > 0 || weekly.length > 0 || special.length > 0;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPadding}>
      {/* Summary */}
      {challenges && (
        <View style={styles.challengeSummary}>
          <Ionicons name="flag" size={16} color={colors.accent} />
          <Text style={styles.challengeSummaryText}>
            {challenges.completedToday} completados hoje · {challenges.totalCompleted} no total
          </Text>
        </View>
      )}

      {/* Daily */}
      {daily.length > 0 && (
        <ChallengeSection
          title="Desafios Diarios"
          icon="calendar-outline"
          color="#3B82F6"
          challenges={daily}
          onClaim={onClaim}
          claimingId={claimingId}
        />
      )}

      {/* Weekly */}
      {weekly.length > 0 && (
        <ChallengeSection
          title="Desafios Semanais"
          icon="calendar"
          color="#8B5CF6"
          challenges={weekly}
          onClaim={onClaim}
          claimingId={claimingId}
        />
      )}

      {/* Special */}
      {special.length > 0 && (
        <ChallengeSection
          title="Desafios Especiais"
          icon="sparkles"
          color="#F59E0B"
          challenges={special}
          onClaim={onClaim}
          claimingId={claimingId}
        />
      )}

      {!hasAnyChallenges && (
        <View style={styles.emptyContainer}>
          <Ionicons name="flag-outline" size={40} color="#9CA3AF" />
          <Text style={styles.emptyText}>Nenhum desafio disponivel no momento</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ChallengeSection({ title, icon, color, challenges, onClaim, claimingId }: any) {
  return (
    <View style={styles.challengeSection}>
      <View style={styles.challengeSectionHeader}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.challengeSectionTitle}>{title}</Text>
        <Text style={styles.challengeSectionCount}>{challenges.length}</Text>
      </View>
      <View style={{ gap: 8 }}>
        {challenges.map((c: any) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            onClaim={onClaim}
            isClaiming={claimingId === c.id}
          />
        ))}
      </View>
    </View>
  );
}

// ===== Helpers =====

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ===== Styles =====

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },

  tabContent: { flex: 1 },
  tabPadding: { padding: 16, gap: 16 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero
  heroCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1.5, gap: 8,
  },
  levelCircle: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  levelNumber: { fontSize: 24, fontWeight: '800', color: '#fff' },
  levelTitle: { fontSize: 18, fontWeight: '700' },
  xpBarContainer: { width: '100%', gap: 4 },
  xpBarTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  xpBarLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  streakRecord: { fontSize: 11, color: '#6B7280' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%' as any, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6, flexGrow: 1, flexBasis: '45%',
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 11, color: '#6B7280' },

  // Sections
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

  // XP goal
  xpGoalText: { fontSize: 11, color: '#6B7280', textAlign: 'center' },

  // XP history
  xpHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  xpHistoryBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  xpHistoryXp: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  xpHistoryDesc: { flex: 1, fontSize: 12, color: '#475569' },
  xpHistoryTime: { fontSize: 10, color: '#9CA3AF' },

  // Badges
  summaryBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  summaryText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  summaryTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  summaryFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  filterScroll: { maxHeight: 40 },
  filterRow: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: { backgroundColor: colors.accent },
  filterText: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  filterTextActive: { color: '#fff' },
  filterDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0' },
  badgeGrid: { padding: 16, gap: 10 },

  // Leaderboard
  periodToggle: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3,
  },
  periodButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  periodButtonActive: { backgroundColor: '#fff', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  periodText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  periodTextActive: { color: '#1E293B', fontWeight: '600' },
  yourRankCard: {
    backgroundColor: colors.accent + '10', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.accent + '30',
  },
  yourRankLabel: { fontSize: 11, color: colors.accent, fontWeight: '500', marginBottom: 4 },
  yourRankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yourRankNumber: { fontSize: 28, fontWeight: '800', color: colors.accent },
  yourRankTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  yourRankXp: { fontSize: 12, color: '#6B7280' },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 10, borderRadius: 10, gap: 10,
  },
  leaderboardRowCurrent: { backgroundColor: colors.accent + '10', borderWidth: 1, borderColor: colors.accent + '30' },
  lbRank: { fontSize: 14, fontWeight: '700', color: '#475569', width: 30, textAlign: 'center' },
  lbAvatar: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  lbAvatarText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  lbName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  lbLevel: { fontSize: 10, color: '#6B7280' },
  lbXp: { fontSize: 13, fontWeight: '600', color: colors.accent },

  // Challenges
  challengeSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent + '10', padding: 10, borderRadius: 10,
  },
  challengeSummaryText: { fontSize: 12, color: colors.accent, fontWeight: '500' },
  challengeSection: { gap: 10 },
  challengeSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeSectionTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1 },
  challengeSectionCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  // Empty
  emptyContainer: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
