'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { videosService } from '@/lib/api/videos.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, SkipBack, ListVideo, Loader2, AlertCircle, CheckCircle, Circle, Clock } from 'lucide-react';
import { Course, Video as VideoType } from '@/lib/types/course.types';
import { StreamDataResponse } from '@/lib/api/videos.service';
import { VideoBreadcrumbs, VideoBreadcrumbsMobile } from '@/components/video-player/video-breadcrumbs';
import { VideoLikeButton } from '@/components/video-player/video-like-button';
import { VideoMaterialsCarousel, VideoMaterialsCompactList } from '@/components/video-player/video-materials-carousel';
import { VideoNotes, VideoNotesCompact } from '@/components/video-player/video-notes';
import { VideoSummaries } from '@/components/video-player/video-summaries';
import { VideoChatWidget } from '@/components/chatbot/video-chat-widget';
import { QuizCard } from '@/components/quiz/quiz-card';
import { quizzesService, QuizStats } from '@/lib/api/quizzes.service';
import { logger } from '@/lib/logger';
import HlsVideoPlayer, { type HlsPlayerRef } from '@/components/video-player/hls-video-player';

export default function VideoPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const videoId = params.videoId as string;
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoType | null>(null);
  const [streamData, setStreamData] = useState<StreamDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);

  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [currentWatchTime, setCurrentWatchTime] = useState(0);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savedWatchTime, setSavedWatchTime] = useState(0);

  const lastSavedTimeRef = useRef(0);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentWatchTimeRef = useRef(0);
  const hlsPlayerRef = useRef<HlsPlayerRef>(null);
  const hasRestoredPosition = useRef(false);
  const playerDurationRef = useRef(0);

  // Blob URL das legendas quando o backend envia playback.captionsUrl separado
  const [captionsBlobUrl, setCaptionsBlobUrl] = useState<string | null>(null);

  const saveProgressOnExit = useCallback(async () => {
    const timeToSave = currentWatchTimeRef.current;
    logger.log('[Progress] saveProgressOnExit - timeToSave:', timeToSave, 'lastSaved:', lastSavedTimeRef.current);
    if (timeToSave > lastSavedTimeRef.current) {
      try {
        logger.log('[Progress] Salvando progresso final:', timeToSave);
        await progressService.saveProgress({
          videoId,
          watchTime: Math.floor(timeToSave),
          completed: isCompleted,
          videoDuration: playerDurationRef.current > 0 ? Math.floor(playerDurationRef.current) : undefined,
        });
        lastSavedTimeRef.current = timeToSave;
        logger.log('[Progress] Progresso final salvo com sucesso');
      } catch (err) {
        logger.error('[Progress] Erro ao salvar progresso final:', err);
      }
    }
  }, [videoId, isCompleted]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN' && !isAdminViewingAsStudent) {
      router.push('/admin/courses');
      return;
    }

    loadData();

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      saveProgressOnExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, courseId, videoId, hasHydrated]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeToSave = currentWatchTimeRef.current;
      const lastSaved = lastSavedTimeRef.current;
      logger.log('[Progress] beforeunload - timeToSave:', timeToSave, 'lastSaved:', lastSaved);
      if (timeToSave > lastSaved) {
        const token = useAuthStore.getState().firebaseToken;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const data = JSON.stringify({
          videoId,
          watchTime: Math.floor(timeToSave),
          completed: isCompleted,
          videoDuration: playerDurationRef.current > 0 ? Math.floor(playerDurationRef.current) : undefined,
        });

        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          try {
            fetch(`${apiUrl}/progress`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: data,
              keepalive: true,
            });
            logger.log('[Progress] Progresso enviado via fetch keepalive');
          } catch {
            navigator.sendBeacon(`${apiUrl}/progress`, blob);
            logger.log('[Progress] Fallback: Progresso enviado via sendBeacon');
          }
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logger.log('[Progress] Página ficou oculta, salvando progresso...');
        saveProgressOnExit();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [videoId, isCompleted, saveProgressOnExit]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const coursePromise = coursesService.getById(courseId);
      const videoPromise = videosService.findOne(videoId);
      const progressPromise = progressService.getCourseProgress(courseId).catch(() => null);

      const [courseData, videoData, progressData] = await Promise.all([
        coursePromise,
        videoPromise,
        progressPromise,
      ]);

      try {
        const stats = await quizzesService.getVideoQuizStats(videoId);
        setQuizStats(stats.totalAttempts > 0 ? stats : null);
      } catch {
        setQuizStats(null);
      }

      // Vídeos ainda no Cloudflare Stream (não migrados para R2 HLS)
      const isCloudflareOnly =
        (videoData.videoSource === 'cloudflare' || videoData.cloudflareId) &&
        !videoData.hlsUrl &&
        !(videoData.externalUrl?.includes('.m3u8'));

      if (isCloudflareOnly) {
        setError('Este vídeo está sendo migrado para o novo sistema de streaming. Tente novamente em breve.');
        setCourse(courseData);
        setCurrentVideo(videoData);
        return;
      }

      // Vídeo embed sem URL configurada
      const isEmbedVideo =
        videoData.videoSource &&
        videoData.videoSource !== 'cloudflare' &&
        videoData.videoSource !== 'r2_hls';
      if (isEmbedVideo && !videoData.externalUrl) {
        setError('URL do vídeo não configurada.');
        setCourse(courseData);
        setCurrentVideo(videoData);
        return;
      }

      const streamInfo = videosService.getStreamDataFromVideo(videoData);

      if (progressData) {
        setCourseProgress(progressData);
        const videoProgress = progressData.videos.find(v => v.videoId === videoId);
        logger.log('[Progress] Progresso carregado:', videoProgress);
        if (videoProgress) {
          logger.log('[Progress] watchTime do servidor:', videoProgress.watchTime);
          setCurrentWatchTime(videoProgress.watchTime);
          setSavedWatchTime(videoProgress.watchTime);
          lastSavedTimeRef.current = videoProgress.watchTime;
          setIsCompleted(videoProgress.completed);
          hasRestoredPosition.current = false;
        } else {
          logger.log('[Progress] Nenhum progresso encontrado para este vídeo');
        }
      } else {
        logger.log('[Progress] Nenhum progresso do curso encontrado');
      }

      setCourse(courseData);
      setCurrentVideo(videoData);
      setStreamData(streamInfo);
      startAutoSave();
    } catch (err: any) {
      logger.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar vídeo');
    } finally {
      setLoading(false);
    }
  };

  const startAutoSave = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }

    logger.log('[AutoSave] Iniciando auto-save a cada 10 segundos');

    saveIntervalRef.current = setInterval(async () => {
      const currentTime = currentWatchTimeRef.current;
      const lastSaved = lastSavedTimeRef.current;
      logger.log('[AutoSave] Verificando... currentTime:', Math.floor(currentTime), 'lastSaved:', Math.floor(lastSaved));

      if (currentTime > lastSaved + 3) {
        try {
          logger.log('[AutoSave] Salvando progresso:', Math.floor(currentTime));
          await progressService.saveProgress({
            videoId,
            watchTime: Math.floor(currentTime),
            completed: isCompleted,
            videoDuration: playerDurationRef.current > 0 ? Math.floor(playerDurationRef.current) : undefined,
          });
          lastSavedTimeRef.current = currentTime;
          logger.log('[AutoSave] Progresso salvo com sucesso!');
        } catch (err) {
          logger.error('[AutoSave] Erro ao salvar progresso:', err);
        }
      } else {
        logger.log('[AutoSave] Não salvou - diferença insuficiente');
      }
    }, 10000);
  };

  useEffect(() => {
    currentWatchTimeRef.current = currentWatchTime;
  }, [currentWatchTime]);

  const handleVideoEnded = useCallback(async () => {
    try {
      setSavingProgress(true);
      await progressService.markAsCompleted(videoId);
      setIsCompleted(true);
      const updatedProgress = await progressService.getCourseProgress(courseId);
      setCourseProgress(updatedProgress);
    } catch (err) {
      logger.error('Erro ao marcar vídeo como completo:', err);
    } finally {
      setSavingProgress(false);
    }
  }, [videoId, courseId]);

  // Carrega legendas VTT quando o backend envia playback.captionsUrl separado
  // (HLS flow sem captions embedded no manifest). apiClient injeta auth header.
  useEffect(() => {
    const captionsUrl = currentVideo?.playback?.captionsUrl;
    const kind = currentVideo?.playback?.kind;
    const embedded = currentVideo?.playback?.captionsEmbedded;

    if (kind !== 'hls' || embedded === true || !captionsUrl) {
      setCaptionsBlobUrl(null);
      return;
    }

    let cancelled = false;
    let createdObjectUrl: string | null = null;

    import('@/lib/api/client').then(({ apiClient }) => {
      apiClient
        .get<Blob>(captionsUrl, { responseType: 'blob' })
        .then((res) => {
          if (cancelled) return;
          const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
          createdObjectUrl = URL.createObjectURL(blob);
          setCaptionsBlobUrl(createdObjectUrl);
        })
        .catch((err) => {
          logger.warn('[Captions] falha ao carregar VTT:', err);
          setCaptionsBlobUrl(null);
        });
    });

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [currentVideo?.playback?.captionsUrl, currentVideo?.playback?.kind, currentVideo?.playback?.captionsEmbedded]);

  const handleMarkAsComplete = async () => {
    try {
      setSavingProgress(true);
      if (isCompleted) {
        await progressService.markAsIncomplete(videoId);
        setIsCompleted(false);
      } else {
        await progressService.markAsCompleted(videoId);
        setIsCompleted(true);
      }
      const updatedProgress = await progressService.getCourseProgress(courseId);
      setCourseProgress(updatedProgress);
    } catch (err) {
      logger.error('Erro ao atualizar status:', err);
    } finally {
      setSavingProgress(false);
    }
  };

  const getAllVideosInOrder = (): VideoType[] => {
    if (!course?.modules) return [];
    const videos: VideoType[] = [];
    for (const module of course.modules) {
      if (module.videos) {
        videos.push(...module.videos);
      }
    }
    return videos;
  };

  const getCurrentVideoIndex = (): number => {
    const allVideos = getAllVideosInOrder();
    return allVideos.findIndex(v => v.id === currentVideo?.id);
  };

  const getPreviousVideo = (): VideoType | null => {
    const allVideos = getAllVideosInOrder();
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex > 0) {
      return allVideos[currentIndex - 1];
    }
    return null;
  };

  const getNextVideo = (): VideoType | null => {
    const allVideos = getAllVideosInOrder();
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex >= 0 && currentIndex < allVideos.length - 1) {
      return allVideos[currentIndex + 1];
    }
    return null;
  };

  const getVideoProgressStatus = (vId: string): { watched: boolean; completed: boolean } => {
    if (!courseProgress) return { watched: false, completed: false };
    const videoProgress = courseProgress.videos.find(v => v.videoId === vId);
    return {
      watched: videoProgress?.watched || false,
      completed: videoProgress?.completed || false,
    };
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreviousVideo = () => {
    const prevVideo = getPreviousVideo();
    if (prevVideo) {
      router.push(`/student/courses/${courseId}/watch/${prevVideo.id}`);
    }
  };

  const handleNextVideo = () => {
    const nextVideo = getNextVideo();
    if (nextVideo) {
      router.push(`/student/courses/${courseId}/watch/${nextVideo.id}`);
    }
  };

  const handleSeek = useCallback((time: number) => {
    if (hlsPlayerRef.current) {
      logger.log('[HlsPlayer] Seeking to:', time);
      hlsPlayerRef.current.seekTo(time);
      setPlayerCurrentTime(time);
    }
  }, []);

  const handleHlsTimeUpdate = useCallback((currentTime: number, duration: number) => {
    setPlayerCurrentTime(currentTime);

    if (playerDurationRef.current === 0 && duration > 0) {
      playerDurationRef.current = duration;
    }

    if (currentTime > currentWatchTimeRef.current) {
      setCurrentWatchTime(currentTime);
      currentWatchTimeRef.current = currentTime;
    }
  }, []);

  const handleHlsReady = useCallback((duration: number) => {
    logger.log('[HlsPlayer] Ready, duration:', duration);
    playerDurationRef.current = duration;
  }, []);

  const handleBackToAllCourses = () => {
    router.push('/student/my-courses');
  };

  const handleBackToCourse = () => {
    router.push(`/student/courses/${courseId}`);
  };

  const hasPreviousVideo = !!getPreviousVideo();
  const hasNextVideo = !!getNextVideo();

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando vídeo...</p>
        </div>
      </div>
    );
  }

  const hasValidStreamData =
    (currentVideo?.playback?.kind && currentVideo.playback.kind !== 'none') ||
    (streamData && (
      (streamData.type === 'embed' && streamData.embedUrl) ||
      (streamData.type === 'hls' && streamData.hlsUrl)
    ));

  if (error || !currentVideo || !hasValidStreamData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={handleBackToAllCourses} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Cursos
          </Button>
          <div className="bg-white border-2 border-gray-200 rounded-lg p-12 text-center shadow-sm">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar vídeo</h2>
            <p className="text-gray-600 mb-6">{error || 'Vídeo não disponível'}</p>
            <Button onClick={handleBackToAllCourses} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              Voltar aos Cursos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 -m-4 md:-m-6 lg:-m-8">
      {/* Header */}
      <div className="border-b-2 border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBackToAllCourses} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Voltar aos Cursos</span>
              <span className="sm:hidden">Voltar</span>
            </Button>

            <div className="flex items-center gap-4">
              {courseProgress && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                      style={{ width: `${courseProgress.progressPercentage}%` }}
                    />
                  </div>
                  <span className="font-medium">{courseProgress.progressPercentage}%</span>
                </div>
              )}

              {course && (
                <h1 className="text-sm font-semibold text-gray-900 hidden lg:block truncate max-w-[200px]">
                  {course.title}
                </h1>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player e Info */}
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Player Principal */}
          <div className="lg:col-span-2">
            {/* Breadcrumbs - Desktop */}
            <div className="hidden sm:block mb-2">
              {course && currentVideo && (
                <VideoBreadcrumbs
                  courseName={course.title}
                  courseId={courseId}
                  moduleName={course.modules?.find(m => m.videos?.some(v => v.id === currentVideo.id))?.title}
                  videoName={currentVideo.title}
                />
              )}
            </div>

            {/* Breadcrumbs - Mobile */}
            <div className="sm:hidden mb-2">
              {course && currentVideo && (
                <VideoBreadcrumbsMobile
                  courseName={course.title}
                  courseId={courseId}
                  videoName={currentVideo.title}
                />
              )}
            </div>

            {/* Player Container */}
            <div className="bg-black rounded-lg overflow-hidden border border-gray-800 mb-3 sm:mb-4" style={{ aspectRatio: '16/9' }}>
              {/*
                Contrato `playback` (VideoPayload.playback):
                - kind === 'hls'    → HlsVideoPlayer (R2 HLS). Suporta captions
                  embedded no manifest ou via blob URL de endpoint autenticado.
                - kind === 'iframe' → iframe sandboxed (YouTube/Vimeo/external).
                - kind === 'none'   → placeholder "processando".
                Fallback via streamData quando backend não envia `playback`.
              */}
              {currentVideo.playback && currentVideo.playback.playbackUrl && (currentVideo.playback.kind === 'hls' || currentVideo.playback.playbackUrl.includes('.m3u8')) ? (
                <HlsVideoPlayer
                  ref={hlsPlayerRef}
                  src={currentVideo.playback.playbackUrl}
                  initialTime={savedWatchTime}
                  onTimeUpdate={handleHlsTimeUpdate}
                  onReady={handleHlsReady}
                  onEnded={handleVideoEnded}
                  externalCaptionsUrl={
                    currentVideo.playback.captionsEmbedded === false
                      ? captionsBlobUrl ?? undefined
                      : undefined
                  }
                />
              ) : currentVideo.playback && currentVideo.playback.kind === 'iframe' && currentVideo.playback.playbackUrl && !currentVideo.playback.playbackUrl.includes('.m3u8') ? (
                <iframe
                  src={currentVideo.playback.playbackUrl.includes('?')
                    ? `${currentVideo.playback.playbackUrl}&autoplay=0`
                    : `${currentVideo.playback.playbackUrl}?autoplay=0`}
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  sandbox="allow-same-origin allow-scripts allow-presentation"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={currentVideo.title}
                />
              ) : currentVideo.playback && currentVideo.playback.kind === 'none' ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-center px-6">
                  <div className="max-w-sm">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-white text-lg font-semibold mb-2">
                      Vídeo em processamento
                    </h3>
                    <p className="text-gray-300 text-sm">
                      Este vídeo ainda não está disponível. Tente novamente em alguns minutos.
                    </p>
                  </div>
                </div>
              ) : streamData?.type === 'hls' && streamData.hlsUrl ? (
                <HlsVideoPlayer
                  ref={hlsPlayerRef}
                  src={streamData.hlsUrl}
                  initialTime={savedWatchTime}
                  onTimeUpdate={handleHlsTimeUpdate}
                  onReady={handleHlsReady}
                  onEnded={handleVideoEnded}
                />
              ) : streamData?.type === 'embed' && streamData.embedUrl ? (
                <iframe
                  src={streamData.embedUrl.includes('?')
                    ? `${streamData.embedUrl}&autoplay=0`
                    : `${streamData.embedUrl}?autoplay=0`}
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={currentVideo.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <Loader2 className="h-12 w-12 animate-spin text-red-500" />
                </div>
              )}
            </div>

            {/* Info do Vídeo */}
            <div className="mb-3 sm:mb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 line-clamp-2">{currentVideo.title}</h2>
                  {currentVideo.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 sm:line-clamp-none hidden sm:block">{currentVideo.description}</p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <VideoLikeButton videoId={videoId} size="default" />
                </div>
              </div>

              {currentWatchTime > 0 ? (
                <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-600">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Tempo assistido: {formatTime(currentWatchTime)}</span>
                </div>
              ) : null}
            </div>

            {/* Botões de Ação - Desktop */}
            <div className="hidden sm:flex flex-wrap items-center gap-3">
              <Button onClick={handleBackToCourse} variant="outline">
                <ListVideo className="h-4 w-4 mr-2" />
                Voltar ao Curso
              </Button>

              {hasPreviousVideo && (
                <Button onClick={handlePreviousVideo} variant="outline">
                  <SkipBack className="h-4 w-4 mr-2" />
                  Aula Anterior
                </Button>
              )}

              {hasNextVideo && (
                <Button
                  onClick={handleNextVideo}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                >
                  Próxima Aula
                  <SkipForward className="h-4 w-4 ml-2" />
                </Button>
              )}

              <Button
                onClick={handleMarkAsComplete}
                disabled={savingProgress}
                variant={isCompleted ? "default" : "outline"}
                className={isCompleted
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                  : "border-2 border-gray-300 hover:border-gray-400"
                }
              >
                {savingProgress ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Circle className="h-4 w-4 mr-2" />
                )}
                {isCompleted ? 'Concluído' : 'Marcar como Concluído'}
              </Button>
            </div>

            {/* Anotações - Desktop */}
            <div className="hidden sm:block mt-6">
              <VideoNotes videoId={videoId} currentTime={playerCurrentTime} />
            </div>

            {/* Resumos com IA - Desktop */}
            <div className="hidden sm:block mt-4">
              <VideoSummaries videoId={videoId} hasTranscript={true} />
            </div>

            {/* Materiais, Anotações e Resumos - Mobile */}
            <div className="mt-4 sm:hidden space-y-3">
              <VideoMaterialsCompactList videoId={videoId} />
              <VideoNotesCompact videoId={videoId} currentTime={playerCurrentTime} />
              <VideoSummaries videoId={videoId} hasTranscript={true} />

              <QuizCard
                stats={quizStats || undefined}
                videoId={videoId}
                courseId={courseId}
              />
            </div>
          </div>

          {/* Sidebar - Lista de Aulas e Materiais (oculta em mobile) */}
          <div className="lg:col-span-1 hidden lg:block space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Conteúdo do Curso</h3>
                {courseProgress && (
                  <span className="text-xs bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">
                    {courseProgress.completedVideos}/{courseProgress.totalVideos}
                  </span>
                )}
              </div>

              {!course?.modules || course.modules.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum módulo disponível</p>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {course.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          {moduleIndex + 1}
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">{module.title}</h4>
                      </div>

                      {module.videos && module.videos.length > 0 && (
                        <div className="ml-8 space-y-1">
                          {module.videos.map((video, videoIndex) => {
                            const isCurrentVideo = video.id === currentVideo.id;
                            const progressStatus = getVideoProgressStatus(video.id);

                            return (
                              <button
                                key={video.id}
                                onClick={() => !isCurrentVideo && router.push(`/student/courses/${courseId}/watch/${video.id}`)}
                                disabled={isCurrentVideo}
                                className={`
                                  w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2
                                  ${isCurrentVideo
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md'
                                    : progressStatus.completed
                                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                      : progressStatus.watched
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                        : 'text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                                  }
                                `}
                              >
                                <span className="flex-shrink-0">
                                  {isCurrentVideo ? (
                                    <span className="w-4 h-4 flex items-center justify-center text-white">▶</span>
                                  ) : progressStatus.completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : progressStatus.watched ? (
                                    <Clock className="w-4 h-4 text-amber-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gray-400" />
                                  )}
                                </span>
                                <span className="truncate flex-1">
                                  {videoIndex + 1}. {video.title}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <VideoMaterialsCarousel videoId={videoId} />

            <QuizCard
              stats={quizStats || undefined}
              videoId={videoId}
              courseId={courseId}
            />
          </div>
        </div>
      </div>

      {currentVideo && (
        <VideoChatWidget
          videoId={videoId}
          courseId={courseId}
          videoTitle={currentVideo.title}
          onSeekToTimestamp={handleSeek}
        />
      )}

      {/* Barra de Navegação Mobile - Fixa na parte inferior */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-between px-2 py-2 gap-1">
          <Button
            onClick={handlePreviousVideo}
            disabled={!hasPreviousVideo}
            variant="ghost"
            size="sm"
            className={`flex-1 flex flex-col items-center gap-0.5 h-auto py-2 ${!hasPreviousVideo ? 'opacity-40' : ''}`}
          >
            <SkipBack className="h-5 w-5" />
            <span className="text-[10px]">Anterior</span>
          </Button>

          <Button
            onClick={handleBackToCourse}
            variant="ghost"
            size="sm"
            className="flex-1 flex flex-col items-center gap-0.5 h-auto py-2"
          >
            <ListVideo className="h-5 w-5" />
            <span className="text-[10px]">Aulas</span>
          </Button>

          <Button
            onClick={handleMarkAsComplete}
            disabled={savingProgress}
            variant="ghost"
            size="sm"
            className={`flex-1 flex flex-col items-center gap-0.5 h-auto py-2 ${isCompleted ? 'text-green-600' : ''}`}
          >
            {savingProgress ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isCompleted ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
            <span className="text-[10px]">{isCompleted ? 'Concluído' : 'Concluir'}</span>
          </Button>

          <Button
            onClick={handleNextVideo}
            disabled={!hasNextVideo}
            variant="ghost"
            size="sm"
            className={`flex-1 flex flex-col items-center gap-0.5 h-auto py-2 ${hasNextVideo ? 'text-blue-600' : 'opacity-40'}`}
          >
            <SkipForward className="h-5 w-5" />
            <span className="text-[10px]">Próxima</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
