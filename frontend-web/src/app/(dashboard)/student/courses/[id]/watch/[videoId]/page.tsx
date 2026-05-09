'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { videosService } from '@/lib/api/videos.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, SkipBack, ListVideo, Loader2, AlertCircle, CheckCircle, Circle, Clock, PlayCircle } from 'lucide-react';
import {
  AtlasButton,
  AtlasLessonHeader,
  AtlasLessonInfo,
  AtlasLessonStats,
  AtlasLoadingBar,
  AtlasModuleSidebar,
  AtlasPlayerWrapper,
  AtlasSheet,
  AtlasSheetContent,
  AtlasStagesProgress,
  AtlasStickyActions,
  type LessonStatus,
  type SidebarLesson,
  type SidebarModule,
  type Stage,
  type StageStatus,
} from '@/components/atlas';
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

  // Mobile bottom sheet de módulos
  const [modulesSheetOpen, setModulesSheetOpen] = useState(false);

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

    if (
      duration > 0 &&
      currentVideo &&
      (!currentVideo.duration || currentVideo.duration === 0)
    ) {
      void videosService.updateDuration(currentVideo.id, duration);
    }
  }, [currentVideo]);

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
      <main className="min-h-screen bg-atlas-bg px-7 py-7">
        <AtlasLoadingBar />
        <p className="atlas-mono text-[10.5px] text-atlas-muted mt-3 tracking-[0.04em] uppercase">
          Carregando aula
        </p>
      </main>
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
      <main className="min-h-screen bg-atlas-bg px-7 py-10">
        <div className="max-w-3xl mx-auto">
          <AtlasButton
            variant="ghost"
            size="sm"
            onClick={handleBackToAllCourses}
            className="mb-5"
          >
            <ArrowLeft strokeWidth={1.75} />
            Voltar aos cursos
          </AtlasButton>
          <div className="bg-atlas-surface border border-dashed border-atlas-line rounded-md px-7 pt-14 pb-16 text-center">
            <div className="size-12 mx-auto mb-[18px] text-atlas-accent flex items-center justify-center">
              <AlertCircle className="size-12" strokeWidth={1.25} />
            </div>
            <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-1.5">
              Não foi possível carregar a aula
            </h2>
            <p className="text-atlas-muted text-[13px] max-w-[420px] mx-auto mb-[18px] leading-[1.55]">
              {error || 'Vídeo não disponível.'}
            </p>
            <AtlasButton
              variant="primary"
              size="md"
              onClick={handleBackToAllCourses}
            >
              Voltar aos cursos
            </AtlasButton>
          </div>
        </div>
      </main>
    );
  }

  const currentModule = course?.modules?.find(m =>
    m.videos?.some(v => v.id === currentVideo.id),
  );
  const currentLessonIndex = (() => {
    const all = getAllVideosInOrder();
    return all.findIndex(v => v.id === currentVideo.id);
  })();
  const totalLessons = getAllVideosInOrder().length;

  // Sidebar so mostra modulo raiz da aula atual + seus submodulos.
  // Se currentVideo esta num submodulo, identifica o pai como raiz.
  // Resultado: aluno ve apenas o capitulo em que esta, nao todos os
  // modulos do curso.
  const sidebarRootModule = currentModule
    ? currentModule.parentModuleId
      ? course?.modules?.find((m) => m.id === currentModule.parentModuleId) ?? currentModule
      : currentModule
    : null;

  const sidebarSourceModules = sidebarRootModule
    ? [
        sidebarRootModule,
        ...(course?.modules ?? []).filter(
          (m) => m.parentModuleId === sidebarRootModule.id,
        ),
      ]
    : [];

  const sidebarModules: SidebarModule[] = sidebarSourceModules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    lessons: (mod.videos ?? []).map((video): SidebarLesson => {
      const isActive = video.id === currentVideo.id;
      const status: LessonStatus = isActive
        ? 'active'
        : (() => {
            const p = getVideoProgressStatus(video.id);
            if (p.completed) return 'done';
            if (p.watched) return 'watched';
            return 'todo';
          })();
      const dur = video.duration
        ? formatTime(video.duration)
        : undefined;
      return {
        id: video.id,
        title: video.title,
        status,
        duration: dur,
      };
    }),
  }));

  const handleLessonClick = (_moduleId: string, lessonId: string) => {
    setModulesSheetOpen(false);
    router.push(`/student/courses/${courseId}/watch/${lessonId}`);
  };

  const openModulesSheet = () => setModulesSheetOpen(true);

  const stages: Stage[] = (course?.modules ?? []).map((mod, mi) => {
    const totalVideos = mod.videos?.length ?? 0;
    const doneVideos =
      mod.videos?.filter((v) => getVideoProgressStatus(v.id).completed).length ?? 0;
    const watchedVideos =
      mod.videos?.filter((v) => getVideoProgressStatus(v.id).watched).length ?? 0;
    const isCurrentModule = !!mod.videos?.some((v) => v.id === currentVideo.id);

    let status: StageStatus = 'future';
    let count = `${doneVideos} / ${totalVideos} bloqueada${totalVideos === 1 ? '' : 's'}`;

    if (totalVideos > 0 && doneVideos === totalVideos) {
      status = 'done';
      count = `${doneVideos} / ${totalVideos} concluída${totalVideos === 1 ? '' : 's'}`;
    } else if (isCurrentModule) {
      status = 'current';
      count = `${doneVideos} / ${totalVideos} em andamento`;
    } else if (watchedVideos > 0) {
      status = 'current';
      count = `${doneVideos} / ${totalVideos} em andamento`;
    } else {
      count = `${doneVideos} / ${totalVideos} pendente${totalVideos === 1 ? '' : 's'}`;
    }

    return {
      num: mi + 1,
      name: mod.title,
      count,
      status,
    };
  });

  const currentModuleIndex = course?.modules?.findIndex((m) =>
    m.videos?.some((v) => v.id === currentVideo.id),
  ) ?? -1;
  const sidebarTitle = currentModule
    ? `Módulo ${String(currentModuleIndex + 1).padStart(2, '0')} — ${currentModule.title}`
    : (course?.title ?? 'Curso');

  const moduleLessonsTotal = currentModule?.videos?.length ?? 0;
  const moduleLessonsDone =
    currentModule?.videos?.filter((v) => getVideoProgressStatus(v.id).completed).length ?? 0;
  const modulePercent =
    moduleLessonsTotal === 0
      ? 0
      : Math.round((moduleLessonsDone / moduleLessonsTotal) * 100);

  return (
    <main className="min-h-screen bg-atlas-bg pb-20 sm:pb-0 -m-4 md:-m-6 lg:-m-8">
      <AtlasLessonHeader
        metaLabel={`Curso · ${course?.title ?? ''}`}
        title={course?.title ?? 'Curso'}
        progressDone={
          courseProgress
            ? String(courseProgress.completedVideos).padStart(2, '0')
            : undefined
        }
        progressTotal={
          courseProgress
            ? String(courseProgress.totalVideos).padStart(2, '0')
            : undefined
        }
        progressPercent={courseProgress?.progressPercentage}
        backLabel="Voltar aos cursos"
        backLabelMobile="Voltar"
        onBack={handleBackToAllCourses}
      >
        {stages.length > 1 && <AtlasStagesProgress stages={stages} />}
      </AtlasLessonHeader>

      {/* Study area: 1fr + 320px sidebar flush */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 min-h-0">
        {/* Player Principal */}
        <section className="min-w-0 px-8 pt-6 pb-12">
          {/* Player Container — wrapper Atlas */}
          <AtlasPlayerWrapper className="mb-[18px]">
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
                <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A]">
                  <Loader2 className="h-12 w-12 animate-spin text-atlas-primary" />
                </div>
              )}
            </AtlasPlayerWrapper>

            {/* Lesson head — meta + título + descrição + actions */}
            <AtlasLessonInfo
              lessonNum={
                currentLessonIndex >= 0
                  ? `Aula ${String(currentLessonIndex + 1).padStart(2, '0')} · ${currentModule?.title ?? 'Aulas'}`
                  : undefined
              }
              title={currentVideo.title}
              description={currentVideo.description ?? undefined}
              contextLine={
                course?.title && currentLessonIndex >= 0 ? (
                  <>
                    {course.title}
                    <span className="text-atlas-muted-2 mx-1.5">·</span>
                    <span className="atlas-mono text-[11.5px]">
                      aula {String(currentLessonIndex + 1).padStart(2, '0')} / {String(totalLessons).padStart(2, '0')}
                    </span>
                  </>
                ) : undefined
              }
              actions={
                /* Botões só em md+ — em mobile bottom bar contextual já cobre */
                <div className="hidden sm:flex flex-wrap items-center gap-2">
                  <VideoLikeButton videoId={videoId} size="default" />
                  {hasPreviousVideo && (
                    <AtlasButton
                      variant="outline"
                      size="md"
                      onClick={handlePreviousVideo}
                    >
                      <SkipBack strokeWidth={1.75} />
                      Anterior
                    </AtlasButton>
                  )}
                  {hasNextVideo && !isCompleted ? (
                    <AtlasButton
                      variant="outline"
                      size="md"
                      onClick={handleNextVideo}
                    >
                      Próxima
                      <SkipForward strokeWidth={1.75} />
                    </AtlasButton>
                  ) : null}
                  <AtlasButton
                    variant="primary"
                    size="md"
                    onClick={handleMarkAsComplete}
                    disabled={savingProgress}
                    className={
                      isCompleted
                        ? 'bg-atlas-success border-atlas-success hover:bg-atlas-success/90 hover:border-atlas-success/90'
                        : ''
                    }
                  >
                    {savingProgress ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle strokeWidth={1.75} />
                    ) : (
                      <Circle strokeWidth={1.75} />
                    )}
                    {isCompleted ? 'Concluído' : 'Marcar concluída'}
                  </AtlasButton>
                </div>
              }
            />

            {/* Stats da aula — sem "Posição" (redundante com contextLine acima) */}
            <AtlasLessonStats
              className="mt-4 mb-6"
              stats={[
                ...(currentVideo.duration
                  ? [
                      {
                        icon: PlayCircle,
                        label: 'Duração',
                        value: formatTime(currentVideo.duration),
                        mono: true,
                      } as const,
                    ]
                  : []),
                {
                  icon: Clock,
                  label: 'Assistido',
                  value: formatTime(currentWatchTime),
                  mono: true,
                },
              ]}
            />

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

        </section>

        {/* Sidebar flush right (oculta em mobile).
            sticky + altura limitada ao viewport pra evitar que listas
            longas estiquem a pagina inteira. Scroll interno do
            AtlasModuleSidebar (overflow-y-auto) cuida do overflow. */}
        <aside className="hidden lg:flex flex-col min-h-0 self-start sticky top-0 h-[100dvh] max-h-[100dvh]">
          <AtlasModuleSidebar
            flush
            metaLabel="Conteúdo do módulo"
            title={sidebarTitle}
            progressPercent={modulePercent}
            lessonsProgress={
              moduleLessonsTotal > 0
                ? `${String(moduleLessonsDone).padStart(2, '0')} / ${String(moduleLessonsTotal).padStart(2, '0')}`
                : undefined
            }
            modules={sidebarModules}
            activeLessonId={currentVideo.id}
            onLessonClick={handleLessonClick}
            footer={
              <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
                <VideoMaterialsCarousel videoId={videoId} />
                <QuizCard
                  stats={quizStats || undefined}
                  videoId={videoId}
                  courseId={courseId}
                />
              </div>
            }
            className="flex-1 min-h-0"
          />
        </aside>
      </div>

      {currentVideo && (
        <VideoChatWidget
          videoId={videoId}
          courseId={courseId}
          videoTitle={currentVideo.title}
          onSeekToTimestamp={handleSeek}
        />
      )}

      <AtlasStickyActions
        actions={[
          {
            id: 'prev',
            icon: SkipBack,
            label: 'Anterior',
            onClick: handlePreviousVideo,
            disabled: !hasPreviousVideo,
          },
          {
            id: 'list',
            icon: ListVideo,
            label: 'Aulas',
            onClick: openModulesSheet,
          },
          {
            id: 'complete',
            icon: savingProgress ? Loader2 : isCompleted ? CheckCircle : Circle,
            label: isCompleted ? 'Concluído' : 'Concluir',
            onClick: handleMarkAsComplete,
            disabled: savingProgress,
            tone: isCompleted ? 'success' : 'default',
          },
          {
            id: 'next',
            icon: SkipForward,
            label: 'Próxima',
            onClick: handleNextVideo,
            disabled: !hasNextVideo,
            tone: hasNextVideo ? 'primary' : 'default',
          },
        ]}
      />

      {/* Mobile bottom sheet de módulos (acionado pelo botão "Aulas" do AtlasStickyActions) */}
      <AtlasSheet open={modulesSheetOpen} onOpenChange={setModulesSheetOpen}>
        <AtlasSheetContent
          metaLabel="Conteúdo do módulo"
          title={sidebarTitle}
          height="78vh"
          className="lg:hidden"
        >
          <AtlasModuleSidebar
            hideHeader
            title={sidebarTitle}
            modules={sidebarModules}
            activeLessonId={currentVideo.id}
            onLessonClick={handleLessonClick}
            className="border-0 rounded-none h-full"
          />
        </AtlasSheetContent>
      </AtlasSheet>
    </main>
  );
}
