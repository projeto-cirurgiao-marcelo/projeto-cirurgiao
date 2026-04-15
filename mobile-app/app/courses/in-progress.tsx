import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../src/stores/auth-store';
import { useGamificationStore } from '../../src/stores/gamification-store';
import { progressService } from '../../src/services/api/progress.service';
import { InProgressCourseCard } from '../../src/components/course/InProgressCourseCard';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';
import type { EnrolledCourse } from '../../src/types/student.types';

interface CourseWithLastVideo extends EnrolledCourse {
  _lastWatchedTitle?: string;
  _lastWatchedVideoId?: string;
}

export default function InProgressScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useGamificationStore((s) => s.unreadCount);
  const firstName = user?.name?.split(' ')[0] || 'Estudante';

  const [courses, setCourses] = useState<CourseWithLastVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadCourses = useCallback(async () => {
    try {
      const enrolled = await progressService.getEnrolledCourses();
      const inProgress = enrolled.filter((c) => {
        const p = c.progress?.percentage ?? c.progress?.progressPercentage ?? c.enrollment?.progress ?? 0;
        return p > 0 && p < 100;
      });

      const withLastVideo: CourseWithLastVideo[] = await Promise.all(
        inProgress.map(async (course) => {
          try {
            const lastWatched = await progressService.getLastWatched(course.id);
            const lastVideoTitle = course.progress?.lastWatchedVideo?.title;
            const lastVideoId = lastWatched?.videoId || course.progress?.lastWatchedVideo?.id;
            return {
              ...course,
              _lastWatchedTitle: lastVideoTitle || undefined,
              _lastWatchedVideoId: lastVideoId || undefined,
            } as CourseWithLastVideo;
          } catch {
            return course as CourseWithLastVideo;
          }
        }),
      );

      setCourses(withLastVideo);
    } catch (error) {
      console.error('Erro ao carregar cursos em andamento:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  const handlePress = (course: CourseWithLastVideo) => {
    if (course._lastWatchedVideoId) {
      router.push(`/course/${course.id}/watch/${course._lastWatchedVideoId}`);
    } else {
      router.push(`/course/${course.id}`);
    }
  };

  const filtered = search.trim()
    ? courses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : courses;

  const totalWatched = courses.reduce((sum, c) => sum + (c.progress?.watchedVideos ?? c.progress?.completedVideos ?? 0), 0);
  const totalRemaining = courses.reduce((sum, c) => {
    const total = c.progress?.totalVideos ?? 0;
    const watched = c.progress?.watchedVideos ?? c.progress?.completedVideos ?? 0;
    return sum + (total - watched);
  }, 0);
  const hoursRemaining = Math.ceil((totalRemaining * 10) / 60);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />
        }
        ListHeaderComponent={
          <>
            {/* Header: greeting + notifications */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.text} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.greetingSmall}>Em Andamento</Text>
                  <Text style={styles.greeting}>Ola, Dr. {firstName}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => router.push('/profile/notifications' as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={22} color={Colors.text} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrapper}>
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Pesquisar cursos em andamento..."
                  placeholderTextColor={Colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Stats */}
            {!loading && courses.length > 0 && (
              <View style={styles.statsRow}>
                <StatPill icon="book-outline" color={Colors.accent} value={courses.length} label="Cursos" />
                <StatPill icon="play-circle-outline" color={Colors.success} value={totalWatched} label="Assistidas" />
                <StatPill icon="time-outline" color="#F59E0B" value={`${hoursRemaining}h`} label="Restantes" />
              </View>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.accent} />
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <InProgressCourseCard
              course={item}
              lastWatchedTitle={item._lastWatchedTitle}
              onPress={() => handlePress(item)}
              onResume={() => handlePress(item)}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="play-circle-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Nenhum curso em andamento</Text>
              <Text style={styles.emptyText}>Comece um curso e ele aparecera aqui</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/courses/catalog')}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaText}>Explorar Cursos</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function StatPill({ icon, color, value, label }: { icon: any; color: string; value: any; label: string }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  greetingSmall: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  searchWrapper: {
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 46,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing['2xl'],
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statValue: { fontSize: 18, fontWeight: '700' as const, color: '#1E293B' },
  statLabel: { fontSize: 11, fontWeight: '500' as const, color: '#94A3B8' },

  cardWrapper: { paddingHorizontal: Spacing['2xl'] },

  loadingContainer: { paddingVertical: 60, alignItems: 'center' },

  emptyContainer: { alignItems: 'center', padding: 40, gap: 10, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: '#1E293B' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  ctaButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaText: { fontSize: 14, fontWeight: '600' as const, color: '#fff' },
});
