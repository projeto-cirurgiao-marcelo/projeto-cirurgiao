import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import VideoPlayer, { VideoPlayerRef } from '../../../../src/components/video/VideoPlayer';
import { VideoLessonsList } from '../../../../src/components/video/VideoLessonsList';
import { VideoSummaries } from '../../../../src/components/video/VideoSummaries';
import { VideoMaterials } from '../../../../src/components/video/VideoMaterials';
import { VideoNotes } from '../../../../src/components/video/VideoNotes';
import { VideoQuiz } from '../../../../src/components/video/VideoQuiz';
import { VideoActionBar } from '../../../../src/components/video/VideoActionBar';
import { VideoAIChatBubble } from '../../../../src/components/chat/VideoAIChatBubble';
import { CustomTabView } from '../../../../src/components/ui/CustomTabView';
import { videosService } from '../../../../src/services/api/videos.service';
import { progressService } from '../../../../src/services/api/progress.service';
import { coursesService } from '../../../../src/services/api/courses.service';
import { Video, Module } from '../../../../src/types/course.types';
import { Colors as colors } from '../../../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const TAB_ROUTES = [
  { key: 'lessons', title: 'Aulas', icon: 'list-outline' as const },
  { key: 'summary', title: 'Resumo', icon: 'sparkles-outline' as const },
  { key: 'materials', title: 'Materiais', icon: 'folder-outline' as const },
  { key: 'notes', title: 'Notas', icon: 'create-outline' as const },
  { key: 'quiz', title: 'Quiz', icon: 'school-outline' as const },
];

export default function WatchVideoScreen() {
  const { id: courseId, videoId } = useLocalSearchParams<{ id: string; videoId: string }>();
  const router = useRouter();
  const playerRef = useRef<VideoPlayerRef>(null);

  const [video, setVideo] = useState<Video | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [moduleVideos, setModuleVideos] = useState<Video[]>([]);
  const [allCourseVideos, setAllCourseVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialPosition, setInitialPosition] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);

  // Calcular navegação entre vídeos
  const { previousVideo, nextVideo } = useMemo(() => {
    if (!videoId || allCourseVideos.length === 0) {
      return { previousVideo: null, nextVideo: null };
    }

    const currentIndex = allCourseVideos.findIndex(v => v.id === videoId);
    return {
      previousVideo: currentIndex > 0 ? allCourseVideos[currentIndex - 1] : null,
      nextVideo: currentIndex < allCourseVideos.length - 1 ? allCourseVideos[currentIndex + 1] : null,
    };
  }, [videoId, allCourseVideos]);

  useEffect(() => {
    loadVideoData();
  }, [videoId]);

  const loadVideoData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!videoId || !courseId) return;

      // Carregar vídeo, posição salva e status de conclusão em paralelo
      const [videoData, savedPosition, videoProgress] = await Promise.all([
        videosService.getById(videoId),
        progressService.getVideoPosition(videoId).catch(() => 0),
        progressService.getVideoProgress(videoId).catch(() => null),
      ]);

      console.log(`[WatchVideo] Posição salva carregada: ${savedPosition}s`);

      // Restaurar estado de conclusão
      if (videoProgress?.completed) {
        setIsCompleted(true);
      }

      setVideo(videoData);

      // Resolver URL de streaming do Cloudflare
      const streamData = videosService.getStreamData(videoData);
      const resolvedUrl = streamData.hlsUrl || '';
      setStreamUrl(resolvedUrl);
      console.log(`[WatchVideo] Stream URL resolvida: ${resolvedUrl} (tipo: ${streamData.type})`);

      // Garantir que a posição é um número válido
      const validPosition = typeof savedPosition === 'number' && savedPosition > 0 ? savedPosition : 0;
      setInitialPosition(validPosition);

      // Carregar dados do curso para navegação e lista de aulas
      try {
        const courseData = await coursesService.getById(courseId);

        // Extrair todos os vídeos de todos os módulos
        const videos: Video[] = [];
        const currentModuleVideos: Video[] = [];

        if (courseData.modules) {
          courseData.modules.forEach((module: Module) => {
            if (module.videos) {
              videos.push(...module.videos);
              if (module.id === videoData.moduleId) {
                currentModuleVideos.push(...module.videos);
              }
            }
          });
        }

        setAllCourseVideos(videos);
        setModuleVideos(currentModuleVideos);
      } catch (err) {
        console.error('Erro ao carregar curso:', err);
      }
    } catch (err) {
      console.error('Erro ao carregar vídeo:', err);
      setError('Não foi possível carregar o vídeo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEnded = useCallback(() => {
    console.log('Vídeo concluído');
    setIsCompleted(true);

    // Navegar automaticamente para próxima aula após 3 segundos
    // (tempo suficiente para o progresso ser salvo no backend)
    if (nextVideo) {
      setTimeout(() => {
        router.replace(`/course/${courseId}/watch/${nextVideo.id}`);
      }, 3000);
    }
  }, [nextVideo, courseId, router]);

  const handleProgressUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/course/${courseId}`);
    }
  };

  const handleNavigatePrevious = () => {
    if (previousVideo) {
      router.replace(`/course/${courseId}/watch/${previousVideo.id}`);
    }
  };

  const handleNavigateNext = () => {
    if (nextVideo) {
      router.replace(`/course/${courseId}/watch/${nextVideo.id}`);
    }
  };

  const handleCompletedChange = (completed: boolean) => {
    setIsCompleted(completed);
  };

  // Handler para seek (usado pela transcrição)
  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seekTo(time);
  }, []);

  // Renderizar cenas das tabs
  const renderScene = useCallback(
    (route: { key: string; title: string }) => {
      switch (route.key) {
        case 'lessons':
          return (
            <VideoLessonsList
              videos={moduleVideos}
              currentVideoId={videoId || ''}
              courseId={courseId || ''}
            />
          );
        case 'summary':
          return <VideoSummaries videoId={videoId || ''} />;
        case 'materials':
          return <VideoMaterials videoId={videoId || ''} />;
        case 'notes':
          return (
            <VideoNotes
              videoId={videoId || ''}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          );
        case 'quiz':
          return <VideoQuiz videoId={videoId || ''} />;
        default:
          return null;
      }
    },
    [moduleVideos, videoId, courseId, currentTime, handleSeek]
  );

  // Helpers
  const formatTime = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentIndex = allCourseVideos.findIndex(v => v.id === videoId);
  const totalVideos = allCourseVideos.length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando aula...</Text>
      </View>
    );
  }

  if (error || !video) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} style={{ marginBottom: 12 }} />
        <Text style={styles.errorTitle}>Erro ao carregar</Text>
        <Text style={styles.errorText}>{error || 'Vídeo não encontrado'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVideoData} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color="#999" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {!isTabsExpanded && (
        <>
          {/* Header compacto sobre fundo escuro */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {video.title}
              </Text>
              {totalVideos > 0 && (
                <Text style={styles.headerSubtitle}>
                  Aula {currentIndex + 1} de {totalVideos}
                </Text>
              )}
            </View>
          </View>

          {/* Player de vídeo */}
          <VideoPlayer
            ref={playerRef}
            video={video}
            streamUrl={streamUrl}
            onEnded={handleVideoEnded}
            onProgressUpdate={handleProgressUpdate}
            initialPosition={initialPosition}
          />

          {/* Info compacta abaixo do player */}
          <View style={styles.videoInfo}>
            <View style={styles.videoMetaRow}>
              {video.duration ? (
                <View style={styles.metaBadge}>
                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.metaText}>{formatTime(video.duration)}</Text>
                </View>
              ) : null}
              {duration > 0 && currentTime > 0 && (
                <View style={[styles.metaBadge, styles.metaBadgeAccent]}>
                  <Ionicons name="play" size={10} color={colors.accent} />
                  <Text style={[styles.metaText, { color: colors.accent }]}>
                    {formatTime(currentTime)}
                  </Text>
                </View>
              )}
              {isCompleted && (
                <View style={[styles.metaBadge, styles.metaBadgeSuccess]}>
                  <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.success }]}>Concluída</Text>
                </View>
              )}
            </View>
          </View>

          {/* Barra de ações */}
          <VideoActionBar
            videoId={videoId || ''}
            isCompleted={isCompleted}
            onCompletedChange={handleCompletedChange}
            onPrevious={handleNavigatePrevious}
            onNext={handleNavigateNext}
            hasPrevious={!!previousVideo}
            hasNext={!!nextVideo}
          />
        </>
      )}

      {/* Header compacto quando expandido */}
      {isTabsExpanded && (
        <View style={styles.expandedHeader}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.expandedBackButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.expandedHeaderTitle} numberOfLines={1}>
            {video.title}
          </Text>
          <View style={{ width: 32 }} />
        </View>
      )}

      {/* Botao expandir/recolher */}
      <TouchableOpacity
        style={styles.expandToggle}
        onPress={() => setIsTabsExpanded(!isTabsExpanded)}
        activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <View style={styles.expandToggleHandle} />
        <Ionicons
          name={isTabsExpanded ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* Tabs de conteúdo */}
      <CustomTabView
        routes={TAB_ROUTES}
        renderScene={renderScene}
      />

      {/* Chat IA contextual */}
      <VideoAIChatBubble
        videoId={videoId || ''}
        courseId={courseId || ''}
        videoTitle={video.title}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    gap: 12,
  },
  loadingText: {
    color: '#999',
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#000',
    zIndex: 10,
  },
  headerBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 1,
  },
  videoInfo: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  metaBadgeAccent: {
    backgroundColor: `${colors.accent}10`,
  },
  metaBadgeSuccess: {
    backgroundColor: `${colors.success}10`,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  errorText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  backButtonText: {
    color: '#999',
    fontSize: 13,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 4,
  },
  expandToggleHandle: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  expandedBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  expandedHeaderTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
