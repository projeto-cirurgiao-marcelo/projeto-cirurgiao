/**
 * Tela Inicio - Home do estudante (Redesign)
 * Layout: Header simplificado, busca, Em Andamento (horizontal),
 *         Banner Mentor IA, Meus Cursos (cards full-width verticais)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { progressService } from '../../src/services/api/progress.service';
import { coursesService } from '../../src/services/api/courses.service';
import { logger } from '../../src/lib/logger';
import { ProgressCardSkeleton, CourseCardSkeleton } from '../../src/components/ui/Skeleton';
import { EnrolledCourse, Course } from '../../src/types';
import { CourseCardHome } from '../../src/components/course/CourseCardHome';
import useAuthStore from '../../src/stores/auth-store';
import { useGamificationStore } from '../../src/stores/gamification-store';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../src/constants/colors';

const PROGRESS_CARD_WIDTH = 220;
const PROGRESS_CARD_IMAGE_HEIGHT = 130;

interface SearchResult {
  type: 'course' | 'lesson' | 'module';
  id: string;
  title: string;
  subtitle: string;
  courseId: string;
  moduleId?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { unreadCount, startPolling, stopPolling } = useGamificationStore();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const enrolled = await progressService.getEnrolledCourses();
      setEnrolledCourses(enrolled || []);

      const catalog = await coursesService.findAll({ limit: 20 });
      // A API pode retornar PaginatedResponse ou array direto
      const courses = Array.isArray(catalog) ? catalog : (catalog.data || []);
      setAvailableCourses(courses);
    } catch (error) {
      logger.error('[HomeTab] Erro ao carregar cursos:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    startPolling();
    return () => stopPolling();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Cursos em andamento (progresso < 100%)
  const inProgressCourses = useMemo(
    () => enrolledCourses.filter((c) => (c.progress.percentage ?? c.progress.progressPercentage ?? 0) < 100),
    [enrolledCourses]
  );

  // Todos os cursos: matriculados primeiro, depois disponíveis (sem duplicar)
  const allCourses = useMemo(() => {
    const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
    const notEnrolled = availableCourses.filter((c) => !enrolledIds.has(c.id));
    return [...enrolledCourses, ...notEnrolled];
  }, [enrolledCourses, availableCourses]);

  // Filtro de busca (cursos)
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return allCourses;
    const q = searchQuery.toLowerCase();
    return allCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    ) as typeof allCourses;
  }, [allCourses, searchQuery]);

  // Busca expandida: cursos + aulas + módulos
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    for (const course of allCourses) {
      // Cursos
      if (course.title.toLowerCase().includes(q) || course.description?.toLowerCase().includes(q)) {
        results.push({
          type: 'course',
          id: course.id,
          title: course.title,
          subtitle: course.instructor?.name ? `por ${course.instructor.name}` : 'Curso',
          courseId: course.id,
          icon: 'book-outline',
        });
      }

      // Módulos e aulas
      if (course.modules) {
        for (const mod of course.modules) {
          if (mod.title.toLowerCase().includes(q)) {
            results.push({
              type: 'module',
              id: mod.id,
              title: mod.title,
              subtitle: course.title,
              courseId: course.id,
              moduleId: mod.id,
              icon: 'folder-outline',
            });
          }

          if (mod.videos) {
            for (const video of mod.videos) {
              if (
                video.title.toLowerCase().includes(q) ||
                video.description?.toLowerCase().includes(q)
              ) {
                results.push({
                  type: 'lesson',
                  id: video.id,
                  title: video.title,
                  subtitle: `${mod.title} · ${course.title}`,
                  courseId: course.id,
                  moduleId: mod.id,
                  icon: 'play-circle-outline',
                });
              }
            }
          }
        }
      }
    }

    return results.slice(0, 15); // Limitar a 15 resultados
  }, [searchQuery, allCourses]);

  const handleSearchResultPress = (result: SearchResult) => {
    setSearchQuery('');
    setIsSearchActive(false);
    if (result.type === 'course') {
      router.push(`/course/${result.courseId}` as any);
    } else if (result.type === 'module') {
      router.push(`/course/${result.courseId}/module/${result.moduleId}` as any);
    } else {
      router.push(`/course/${result.courseId}/watch/${result.id}` as any);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Estudante';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header skeleton */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingSmall}>Bem-vindo de volta</Text>
              <Text style={styles.greeting}>Olá, Dr. {firstName}</Text>
            </View>
          </View>
          {/* Em Andamento skeleton */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Em Andamento</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressList}>
              <ProgressCardSkeleton />
              <ProgressCardSkeleton />
            </ScrollView>
          </View>
          {/* Cursos skeleton */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cursos</Text>
            </View>
            <View style={styles.coursesList}>
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* ============================================ */}
        {/* HEADER: Saudação + Notificação               */}
        {/* ============================================ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>Bem-vindo de volta</Text>
            <Text style={styles.greeting}>Olá, Dr. {firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/profile/notifications' as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.text}
            />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* BUSCA                                        */}
        {/* ============================================ */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color={Colors.textMuted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar cursos, aulas, temas..."
              placeholderTextColor={Colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setIsSearchActive(text.length >= 2);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearchActive(false); }}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Dropdown de resultados */}
          {isSearchActive && searchQuery.length >= 2 && (
            <View style={styles.searchDropdown}>
              {searchResults.length > 0 ? (
                <ScrollView
                  style={styles.searchResultsScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={`${result.type}-${result.id}-${index}`}
                      style={styles.searchResultItem}
                      onPress={() => handleSearchResultPress(result)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.searchResultIcon,
                        result.type === 'course' && { backgroundColor: `${Colors.accent}15` },
                        result.type === 'lesson' && { backgroundColor: `${Colors.success}15` },
                        result.type === 'module' && { backgroundColor: `${Colors.warning}15` },
                      ]}>
                        <Ionicons
                          name={result.icon}
                          size={16}
                          color={
                            result.type === 'course' ? Colors.accent :
                            result.type === 'lesson' ? Colors.success :
                            Colors.warning
                          }
                        />
                      </View>
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultTitle} numberOfLines={1}>
                          {result.title}
                        </Text>
                        <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                          {result.subtitle}
                        </Text>
                      </View>
                      <View style={styles.searchResultBadge}>
                        <Text style={styles.searchResultBadgeText}>
                          {result.type === 'course' ? 'Curso' :
                           result.type === 'lesson' ? 'Aula' : 'Módulo'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.searchNoResults}>
                  <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.searchNoResultsText}>
                    Nenhum resultado para "{searchQuery}"
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ============================================ */}
        {/* EM ANDAMENTO (scroll horizontal)             */}
        {/* ============================================ */}
        {inProgressCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Em Andamento</Text>
              <TouchableOpacity
                onPress={() => router.push('/courses/in-progress')}
                style={styles.seeAllButton}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              >
                <Text style={styles.seeAllText}>Ver Todos</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={inProgressCourses}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.progressList}
              renderItem={({ item }) => <ProgressCard course={item} />}
            />
          </View>
        )}

        {/* ============================================ */}
        {/* BANNER MENTOR IA                             */}
        {/* ============================================ */}
        <TouchableOpacity
          style={styles.bannerContainer}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/mentor-ia')}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerIconWrap}>
              <Ionicons name="sparkles" size={28} color={Colors.white} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>Mentor IA</Text>
              <Text style={styles.bannerSubtitle}>
                Tire dúvidas com inteligência artificial
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="rgba(255,255,255,0.7)"
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* ============================================ */}
        {/* MEUS CURSOS (cards full-width verticais)     */}
        {/* ============================================ */}
        {filteredCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cursos</Text>
              <TouchableOpacity
                onPress={() => router.push('/courses/catalog')}
                style={styles.seeAllButton}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              >
                <Text style={styles.seeAllText}>Ver Todos</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
              </TouchableOpacity>
            </View>
            <View style={styles.coursesList}>
              {filteredCourses.map((course) => (
                <CourseCardHome key={course.id} course={course} />
              ))}
            </View>
          </View>
        )}

        {/* ============================================ */}
        {/* ESTADO VAZIO                                 */}
        {/* ============================================ */}
        {enrolledCourses.length === 0 && availableCourses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="school-outline"
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyTitle}>Nenhum curso encontrado</Text>
            <Text style={styles.emptyText}>
              Novos cursos serão adicionados em breve.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============================================ */
/* ProgressCard - Card horizontal compacto       */
/* para seção "Em Andamento"                     */
/* ============================================ */
function ProgressCard({ course }: { course: EnrolledCourse }) {
  const progress = course.progress.percentage ?? course.progress.progressPercentage ?? 0;
  const completedVideos = course.progress.completedVideos ?? 0;
  const totalVideos = course.progress.totalVideos ?? 0;
  const thumbnail =
    course.thumbnailHorizontal || course.thumbnailVertical || course.thumbnailUrl || course.thumbnail;

  // Encontrar o último vídeo assistido (não concluído) para "Continue de onde parou"
  const lastWatchedVideo = course.progress.videos
    ?.filter((v) => v.watched && !v.completed)
    .sort((a, b) => b.watchTime - a.watchTime)[0];

  const handlePress = async () => {
    if (lastWatchedVideo) {
      // Ir direto para o último vídeo assistido
      router.push(`/course/${course.id}/watch/${lastWatchedVideo.videoId}` as any);
    } else {
      router.push(`/course/${course.id}` as any);
    }
  };

  return (
    <TouchableOpacity
      style={styles.pCard}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      {/* Thumbnail com badge de progresso */}
      <View style={styles.pImageWrap}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.pImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.pPlaceholder}>
            <Ionicons
              name="videocam-outline"
              size={28}
              color={Colors.textMuted}
            />
          </View>
        )}
        {/* Badge progresso */}
        <View style={styles.pProgressBadge}>
          <Text style={styles.pProgressText}>{Math.round(progress)}%</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.pInfo}>
        <Text style={styles.pTitle} numberOfLines={2}>
          {course.title}
        </Text>

        {/* Barra de progresso */}
        <View style={styles.pProgressBarBg}>
          <View style={[styles.pProgressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>

        {/* Stats */}
        <Text style={styles.pStats}>
          {completedVideos}/{totalVideos} aulas
        </Text>

        {/* Último vídeo ou botão retomar */}
        {lastWatchedVideo ? (
          <View style={styles.pLastVideo}>
            <Ionicons name="play-circle" size={12} color={Colors.accent} />
            <Text style={styles.pLastVideoText} numberOfLines={1}>
              {lastWatchedVideo.videoTitle}
            </Text>
          </View>
        ) : (
          <View style={styles.pResumeButton}>
            <Ionicons name="play" size={12} color={Colors.white} />
            <Text style={styles.pResumeText}>Retomar</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
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
    ...Shadows.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  // ---- Search ----
  searchWrapper: {
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 46,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.inputText,
    height: '100%',
  },
  searchDropdown: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
    ...Shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  searchResultsScroll: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchResultIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${Colors.accent}10`,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  searchResultSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  searchResultBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  searchResultBadgeText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  searchNoResults: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  searchNoResultsText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // ---- Section ----
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${Colors.accent}0A`,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },

  // ---- Progress cards horizontal list ----
  progressList: {
    paddingHorizontal: Spacing['2xl'],
  },

  // ---- ProgressCard ----
  pCard: {
    width: PROGRESS_CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  pImageWrap: {
    width: '100%',
    height: PROGRESS_CARD_IMAGE_HEIGHT,
    backgroundColor: Colors.border,
    position: 'relative',
  },
  pImage: {
    width: '100%',
    height: '100%',
  },
  pPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  pProgressBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  pProgressText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  pInfo: {
    padding: Spacing.md,
  },
  pTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: FontSize.sm * 1.35,
    marginBottom: Spacing.sm,
  },
  pResumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  pResumeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  pProgressBarBg: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  pProgressBarFill: {
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  pStats: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  pLastVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.accent}10`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  pLastVideoText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
    flex: 1,
  },

  // ---- Banner Mentor IA ----
  bannerContainer: {
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  bannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },

  // ---- Courses List (full-width vertical) ----
  coursesList: {
    paddingHorizontal: Spacing['2xl'],
  },

  // ---- Empty state ----
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['5xl'],
    paddingHorizontal: Spacing['3xl'],
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ---- Bottom ----
  bottomSpace: {
    height: Spacing['3xl'],
  },
});
