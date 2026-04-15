/**
 * Tela de Detalhes do Curso
 * Design inspirado no layout Coursera / referência com tabs
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../../src/constants/colors';
import { coursesService } from '../../../src/services/api/courses.service';
import { progressService } from '../../../src/services/api/progress.service';
import { Course, Module, CourseProgress } from '../../../src/types';
import { CourseDetailSkeleton } from '../../../src/components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Tab = 'detalhes' | 'modulos' | 'instrutor';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('detalhes');

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const [courseData, progressData] = await Promise.all([
        coursesService.getById(id),
        progressService.getCourseProgress(id).catch(() => null),
      ]);
      setCourse(courseData);
      setProgress(progressData);
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleModulePress = (module: Module) => {
    router.push(`/course/${id}/module/${module.id}`);
  };

  const handleContinueWatching = async () => {
    if (!id) return;

    const lastWatched = await progressService.getLastWatched(id);
    if (lastWatched) {
      router.push(`/course/${id}/watch/${lastWatched.videoId}`);
    } else if (course?.modules?.[0]?.videos?.[0]) {
      router.push(`/course/${id}/watch/${course.modules[0].videos[0].id}`);
    }
  };

  // Dados derivados
  const thumbnail = useMemo(
    () =>
      course?.thumbnailHorizontal ||
      course?.thumbnailVertical ||
      course?.thumbnailUrl ||
      course?.thumbnail,
    [course]
  );

  const totalVideos = useMemo(
    () =>
      course?.modules?.reduce(
        (acc, m) => acc + (m.videos?.length || 0),
        0
      ) || 0,
    [course]
  );

  const totalModules = course?.modules?.length || 0;
  const progressPercentage = progress?.percentage || 0;
  const isEnrolled = !!progress;

  // Duração estimada (~10 min por vídeo)
  const estimatedMinutes = totalVideos * 10;
  const durationText = useMemo(() => {
    if (estimatedMinutes >= 60) {
      const h = Math.floor(estimatedMinutes / 60);
      const m = estimatedMinutes % 60;
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return estimatedMinutes > 0 ? `${estimatedMinutes} Min` : null;
  }, [estimatedMinutes]);

  const enrollmentCount = course?._count?.enrollments ?? 0;
  const instructorName = course?.instructor?.name || 'Projeto Cirurgião';

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <CourseDetailSkeleton />
      </SafeAreaView>
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================
  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.errorTitle}>Curso não encontrado</Text>
          <TouchableOpacity
            style={styles.errorBackBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.errorBackBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // TAB CONTENT RENDERERS
  // ==========================================
  const renderDetalhesTab = () => (
    <View style={styles.tabContent}>
      {/* Informações do Curso */}
      <Text style={styles.tabSectionTitle}>Informações do Curso</Text>
      {course.description && (
        <Text style={styles.descriptionText}>{course.description}</Text>
      )}

      {/* Visão geral */}
      <Text style={styles.tabSectionTitle}>Visão Geral</Text>
      <View style={styles.bulletList}>
        <BulletItem
          icon="document-text-outline"
          text={`${totalModules} módulos detalhados sobre o tópico.`}
        />
        <BulletItem
          icon="infinite-outline"
          text="Acesso em tempo integral."
        />
        <BulletItem
          icon="videocam-outline"
          text={`${totalVideos} ${totalVideos === 1 ? 'vídeo-aula' : 'vídeo-aulas'} sob demanda.`}
        />
        <BulletItem
          icon="ribbon-outline"
          text="Certificado ao concluir."
        />
        {enrollmentCount > 0 && (
          <BulletItem
            icon="people-outline"
            text={`Mais de ${enrollmentCount} alunos concluíram.`}
          />
        )}
      </View>

      {/* Barra de progresso (se matriculado) */}
      {isEnrolled && progressPercentage > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Seu progresso</Text>
            <Text style={styles.progressValue}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercentage}%` }]}
            />
          </View>
        </View>
      )}
    </View>
  );

  const renderModulosTab = () => (
    <View style={styles.tabContent}>
      {course.modules?.map((module, index) => {
        const moduleThumbnail =
          module.thumbnailHorizontal || module.thumbnailVertical || module.thumbnail;
        const videoCount = module.videos?.length || module._count?.videos || 0;

        return (
          <TouchableOpacity
            key={module.id}
            style={styles.moduleCard}
            onPress={() => handleModulePress(module)}
            activeOpacity={0.7}
          >
            {/* Thumbnail do módulo */}
            <View style={styles.moduleImageWrap}>
              {moduleThumbnail ? (
                <Image
                  source={{ uri: moduleThumbnail }}
                  style={styles.moduleImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.modulePlaceholder}>
                  <Ionicons name="book-outline" size={22} color={Colors.textMuted} />
                </View>
              )}
              <View style={styles.moduleNumberBadge}>
                <Text style={styles.moduleNumberText}>{index + 1}</Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.moduleContent}>
              <Text style={styles.moduleTitle} numberOfLines={2}>
                {module.title}
              </Text>
              {module.description && (
                <Text style={styles.moduleDescription} numberOfLines={2}>
                  {module.description}
                </Text>
              )}
              <View style={styles.moduleMetaRow}>
                <Ionicons name="videocam-outline" size={13} color={Colors.accent} />
                <Text style={styles.moduleVideoCount}>
                  {videoCount} {videoCount === 1 ? 'aula' : 'aulas'}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        );
      })}

      {(!course.modules || course.modules.length === 0) && (
        <View style={styles.emptyTab}>
          <Ionicons name="folder-open-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTabText}>Nenhum módulo disponível</Text>
        </View>
      )}
    </View>
  );

  const renderInstrutorTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.instructorCard}>
        <View style={styles.instructorAvatar}>
          <Ionicons name="person" size={32} color={Colors.white} />
        </View>
        <View style={styles.instructorInfo}>
          <Text style={styles.instructorName}>{instructorName}</Text>
          <Text style={styles.instructorRole}>Instrutor</Text>
        </View>
      </View>
      <Text style={styles.instructorBio}>
        Profissional especializado com ampla experiência na área. Dedicado a transmitir
        conhecimentos práticos e teóricos para formação de novos profissionais.
      </Text>
    </View>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Detalhes do Curso
        </Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.accent]}
          />
        }
      >
        {/* ===================== */}
        {/* THUMBNAIL COM PLAY   */}
        {/* ===================== */}
        <View style={styles.thumbnailSection}>
          <View style={styles.thumbnailWrap}>
            {thumbnail ? (
              <Image
                source={{ uri: thumbnail }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="videocam-outline" size={48} color={Colors.textMuted} />
              </View>
            )}
            {/* Play button overlay */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={handleContinueWatching}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={28} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===================== */}
        {/* COURSE INFO           */}
        {/* ===================== */}
        <View style={styles.infoSection}>
          {/* Tag + Rating row */}
          <View style={styles.tagRatingRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{instructorName}</Text>
            </View>
            <View style={styles.ratingWrap}>
              <Text style={styles.ratingLabel}>Avaliações</Text>
              <Text style={styles.ratingValue}>4.5</Text>
              <Ionicons name="star" size={14} color={Colors.warning} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.courseTitle}>{course.title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {durationText && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{durationText}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="play-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{totalVideos} Aulas</Text>
            </View>
          </View>
        </View>

        {/* ===================== */}
        {/* TABS                  */}
        {/* ===================== */}
        <View style={styles.tabBar}>
          {(['detalhes', 'modulos', 'instrutor'] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            const labels: Record<Tab, string> = {
              detalhes: 'Detalhes',
              modulos: `Módulos (${totalModules})`,
              instrutor: 'Instrutor',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===================== */}
        {/* TAB CONTENT           */}
        {/* ===================== */}
        {activeTab === 'detalhes' && renderDetalhesTab()}
        {activeTab === 'modulos' && renderModulosTab()}
        {activeTab === 'instrutor' && renderInstrutorTab()}

        {/* Espaço para o botão fixo */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ===================== */}
      {/* BOTTOM CTA BUTTON     */}
      {/* ===================== */}
      <View style={styles.bottomCTA}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinueWatching}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {isEnrolled
              ? progressPercentage > 0
                ? 'Continuar Assistindo'
                : 'Iniciar Curso'
              : 'Inscreva-se agora'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ==========================================
 * COMPONENTE AUXILIAR: BulletItem
 * ========================================== */
function BulletItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.bulletItem}>
      <View style={styles.bulletIconWrap}>
        <Ionicons name={icon as any} size={18} color={Colors.accent} />
      </View>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

/* ==========================================
 * STYLES
 * ========================================== */
const styles = StyleSheet.create({
  // ---- Layout ----
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  errorBackBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorBackBtnText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },

  // ---- Top Bar ----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // ---- Thumbnail ----
  thumbnailSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  thumbnailWrap: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    position: 'relative',
    ...Shadows.md,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -28,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3, // ajuste óptico do ícone play
    ...Shadows.lg,
  },

  // ---- Info Section ----
  infoSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  tagRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTag: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.sm,
  },
  categoryTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginRight: 2,
  },
  ratingValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  courseTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: FontSize.xl * 1.3,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // ---- Tab Bar ----
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },

  // ---- Tab Content ----
  tabContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  tabSectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  descriptionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.6,
    marginBottom: Spacing.lg,
  },

  // ---- Bullet List ----
  bulletList: {
    gap: Spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bulletIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.5,
    paddingTop: 5,
  },

  // ---- Progress ----
  progressSection: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },

  // ---- Module Cards (Módulos tab) ----
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  moduleImageWrap: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    marginRight: Spacing.md,
    position: 'relative',
  },
  moduleImage: {
    width: '100%',
    height: '100%',
  },
  modulePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  moduleNumberBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleNumberText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 3,
    lineHeight: FontSize.md * 1.3,
  },
  moduleDescription: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    lineHeight: FontSize.sm * 1.4,
  },
  moduleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moduleVideoCount: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyTabText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },

  // ---- Instructor Tab ----
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  instructorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  instructorRole: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  instructorBio: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.6,
  },

  // ---- Bottom CTA ----
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  ctaButtonText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
});
