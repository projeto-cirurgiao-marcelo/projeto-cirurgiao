/**
 * Tela de Lista de Vídeos do Módulo
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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
} from '../../../../src/constants/colors';
import { coursesService } from '../../../../src/services/api/courses.service';
import { progressService } from '../../../../src/services/api/progress.service';
import { Module, Video } from '../../../../src/types';
import { VideoItemSkeleton } from '../../../../src/components/ui/Skeleton';

export default function ModuleVideosScreen() {
  const params = useLocalSearchParams();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const moduleId = Array.isArray(params.moduleId) ? params.moduleId[0] : params.moduleId;

  const [module, setModule] = useState<Module | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!courseId || !moduleId) return;

    try {
      const courseData = await coursesService.getById(courseId);
      const moduleData = courseData.modules?.find(m => m.id === moduleId);

      if (moduleData) {
        setModule(moduleData);
        setVideos(moduleData.videos || []);
      }

      // Carregar progresso dos vídeos do curso
      try {
        const progress = await progressService.getCourseProgress(courseId);
        if (progress?.videos) {
          const completed = new Set<string>();
          const watched = new Set<string>();
          for (const v of progress.videos) {
            if (v.completed) completed.add(v.videoId);
            else if (v.watched) watched.add(v.videoId);
          }
          setCompletedVideos(completed);
          setWatchedVideos(watched);
        }
      } catch (error) {
        console.log('Sem progresso ainda');
      }
    } catch (error) {
      console.error('Erro ao carregar módulo:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [courseId, moduleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleVideoPress = (video: Video) => {
    router.push(`/course/${courseId}/watch/${video.id}` as any);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoStatus = (videoId: string) => {
    if (completedVideos.has(videoId)) {
      return { icon: 'checkmark-circle' as const, color: Colors.success, label: 'Concluído' };
    }
    if (watchedVideos.has(videoId)) {
      return { icon: 'play-circle' as const, color: Colors.accent, label: 'Em progresso' };
    }
    return { icon: 'ellipse-outline' as const, color: Colors.textMuted, label: 'Não iniciado' };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerImageWrap}>
          <View style={styles.headerImagePlaceholder}>
            <Ionicons name="book-outline" size={36} color={Colors.textMuted} />
          </View>
          <TouchableOpacity style={styles.backButtonOverlay} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.videosContainer}>
          <VideoItemSkeleton />
          <VideoItemSkeleton />
          <VideoItemSkeleton />
          <VideoItemSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!module) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorTitle}>Módulo não encontrado</Text>
          <TouchableOpacity
            style={styles.errorBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.errorBackBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const moduleThumbnail =
    module.thumbnailHorizontal || module.thumbnailVertical || module.thumbnail;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Header com thumbnail do módulo */}
        <View style={styles.headerImageWrap}>
          {moduleThumbnail ? (
            <Image
              source={{ uri: moduleThumbnail }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.headerImagePlaceholder}>
              <Ionicons name="book-outline" size={36} color={Colors.textMuted} />
            </View>
          )}
          {/* Botão voltar sobre a imagem */}
          <TouchableOpacity
            style={styles.backButtonOverlay}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Info do módulo */}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{module.title}</Text>
          {module.description && (
            <Text style={styles.headerDescription} numberOfLines={3}>
              {module.description}
            </Text>
          )}
          <View style={styles.headerMetaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="videocam-outline" size={13} color={Colors.accent} />
              <Text style={styles.metaBadgeText}>
                {videos.length} {videos.length === 1 ? 'aula' : 'aulas'}
              </Text>
            </View>
          </View>
        </View>

        {/* Lista de Vídeos */}
        <View style={styles.videosContainer}>
          {videos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-off-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma aula disponível</Text>
              <Text style={styles.emptyDescription}>
                Este módulo ainda não possui aulas cadastradas.
              </Text>
            </View>
          ) : (
            videos.map((video, index) => {
              const status = getVideoStatus(video.id);
              return (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => handleVideoPress(video)}
                  activeOpacity={0.7}
                >
                  {/* Número da aula */}
                  <View style={styles.videoNumber}>
                    <Text style={styles.videoNumberText}>{index + 1}</Text>
                  </View>

                  {/* Conteúdo */}
                  <View style={styles.videoContent}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                    {video.description && (
                      <Text style={styles.videoDescription} numberOfLines={1}>
                        {video.description}
                      </Text>
                    )}
                    <View style={styles.videoMeta}>
                      <View style={styles.durationBadge}>
                        <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.durationText}>
                          {formatDuration(video.duration)}
                        </Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <Ionicons name={status.icon} size={13} color={status.color} />
                        <Text style={[styles.statusLabel, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Chevron */}
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
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
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
  errorTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  errorBackBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorBackBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // ---- Header ----
  headerImageWrap: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.border,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  backButtonOverlay: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    lineHeight: FontSize.lg * 1.3,
  },
  headerDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
    marginBottom: Spacing.sm,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  metaBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },

  // ---- Videos List ----
  videosContainer: {
    padding: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  emptyDescription: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  videoNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  videoNumberText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  videoContent: {
    flex: 1,
  },
  videoTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
    lineHeight: FontSize.md * 1.3,
  },
  videoDescription: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  bottomSpace: {
    height: Spacing.xl,
  },
});
