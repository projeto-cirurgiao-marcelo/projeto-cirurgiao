'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService } from '@/lib/api/courses.service';
import { videosService } from '@/lib/api/videos.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, SkipBack, ListVideo, Loader2, AlertCircle, CheckCircle, Circle, Clock, ThumbsUp } from 'lucide-react';
import { Course, Video as VideoType } from '@/lib/types/course.types';
import { StreamDataResponse } from '@/lib/api/videos.service';
import { VideoBreadcrumbs, VideoBreadcrumbsMobile } from '@/components/video-player/video-breadcrumbs';
import { VideoLikeButton } from '@/components/video-player/video-like-button';
import { VideoMaterialsCarousel, VideoMaterialsCompactList } from '@/components/video-player/video-materials-carousel';
import { VideoNotes, VideoNotesCompact } from '@/components/video-player/video-notes';
import { VideoTranscript, VideoTranscriptCompact } from '@/components/video-player/video-transcript';

// Declaração de tipo para o SDK do Cloudflare Stream
declare global {
  interface Window {
    Stream?: (iframe: HTMLIFrameElement) => CloudflareStreamPlayer;
  }
}

interface CloudflareStreamPlayer {
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (event: string, callback: (data?: any) => void) => void;
  removeEventListener: (event: string, callback: (data?: any) => void) => void;
}

export default function VideoPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const videoId = params.videoId as string;
  const { user, isAuthenticated, hasHydrated } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoType | null>(null);
  const [streamData, setStreamData] = useState<StreamDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de progresso
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [currentWatchTime, setCurrentWatchTime] = useState(0);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0); // Tempo real do player
  const [isCompleted, setIsCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savedWatchTime, setSavedWatchTime] = useState(0); // Tempo salvo para restaurar posição
  
  // Refs para controle de progresso
  const lastSavedTimeRef = useRef(0);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentWatchTimeRef = useRef(0); // Ref para evitar stale closure
  const iframeRef = useRef<HTMLIFrameElement>(null); // Ref para o iframe do player Cloudflare
  const playerRef = useRef<CloudflareStreamPlayer | null>(null); // Ref para a API do player
  const hasRestoredPosition = useRef(false); // Flag para restaurar posição apenas uma vez
  const hasCompletedInitialRestore = useRef(false); // Flag para indicar que a restauração inicial foi concluída
  const [isPlayerReady, setIsPlayerReady] = useState(false); // Flag para indicar que o player está pronto
  const [sdkLoaded, setSdkLoaded] = useState(false); // Flag para SDK do Cloudflare carregado
  const [iframeMounted, setIframeMounted] = useState(false); // Flag para indicar que o iframe foi montado

  const saveProgressOnExit = useCallback(async () => {
    const timeToSave = currentWatchTimeRef.current;
    console.log('[Progress] saveProgressOnExit - timeToSave:', timeToSave, 'lastSaved:', lastSavedTimeRef.current);
    if (timeToSave > lastSavedTimeRef.current) {
      try {
        console.log('[Progress] Salvando progresso final:', timeToSave);
        await progressService.saveProgress({
          videoId,
          watchTime: Math.floor(timeToSave),
          completed: isCompleted,
        });
        lastSavedTimeRef.current = timeToSave;
        console.log('[Progress] Progresso final salvo com sucesso');
      } catch (err) {
        console.error('[Progress] Erro ao salvar progresso final:', err);
      }
    }
  }, [videoId, isCompleted]);

  // Effect principal - carrega dados e configura cleanup
  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN') {
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

  // Salvar progresso ao fechar a aba ou navegar para outra página
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeToSave = currentWatchTimeRef.current;
      console.log('[Progress] beforeunload - timeToSave:', timeToSave);
      if (timeToSave > 0) {
        // Usar sendBeacon para garantir que a requisição seja enviada mesmo ao fechar
        const data = JSON.stringify({
          videoId,
          watchTime: Math.floor(timeToSave),
          completed: isCompleted,
        });
        
        // Tentar usar sendBeacon (mais confiável ao fechar aba)
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon('/api/v1/progress', blob);
          console.log('[Progress] Progresso enviado via sendBeacon');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[Progress] Página ficou oculta, salvando progresso...');
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

      const [courseData, videoData, progressData] = await Promise.all([
        coursesService.getById(courseId),
        videosService.findOne(videoId),
        progressService.getCourseProgress(courseId).catch(() => null),
      ]);

      const isEmbedVideo = videoData.videoSource && videoData.videoSource !== 'cloudflare';
      
      if (!isEmbedVideo) {
        if (!videoData.cloudflareId) {
          setError('Vídeo ainda não foi enviado ao Cloudflare Stream');
          setCourse(courseData);
          setCurrentVideo(videoData);
          return;
        }

        if (videoData.uploadStatus !== 'READY') {
          setError(`Vídeo ainda está sendo processado (Status: ${videoData.uploadStatus})`);
          setCourse(courseData);
          setCurrentVideo(videoData);
          return;
        }
      }

      const streamInfo = await videosService.getStreamUrl(videoId);

      if (progressData) {
        setCourseProgress(progressData);
        const videoProgress = progressData.videos.find(v => v.videoId === videoId);
        console.log('[Progress] Progresso carregado:', videoProgress);
        if (videoProgress) {
          console.log('[Progress] watchTime do servidor:', videoProgress.watchTime);
          setCurrentWatchTime(videoProgress.watchTime);
          setSavedWatchTime(videoProgress.watchTime); // Salva para restaurar posição
          lastSavedTimeRef.current = videoProgress.watchTime;
          setIsCompleted(videoProgress.completed);
          hasRestoredPosition.current = false; // Reset flag para restaurar posição
        } else {
          console.log('[Progress] Nenhum progresso encontrado para este vídeo');
        }
      } else {
        console.log('[Progress] Nenhum progresso do curso encontrado');
      }

      setCourse(courseData);
      setCurrentVideo(videoData);
      setStreamData(streamInfo);
      startAutoSave();
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar vídeo');
    } finally {
      setLoading(false);
    }
  };

  const startAutoSave = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }

    console.log('[AutoSave] Iniciando auto-save a cada 10 segundos');
    
    saveIntervalRef.current = setInterval(async () => {
      const currentTime = currentWatchTimeRef.current;
      const lastSaved = lastSavedTimeRef.current;
      console.log('[AutoSave] Verificando... currentTime:', Math.floor(currentTime), 'lastSaved:', Math.floor(lastSaved));
      
      // Salva se assistiu pelo menos 3 segundos a mais que o último save
      if (currentTime > lastSaved + 3) {
        try {
          console.log('[AutoSave] Salvando progresso:', Math.floor(currentTime));
          await progressService.saveProgress({
            videoId,
            watchTime: Math.floor(currentTime),
            completed: isCompleted,
          });
          lastSavedTimeRef.current = currentTime;
          console.log('[AutoSave] Progresso salvo com sucesso!');
        } catch (err) {
          console.error('[AutoSave] Erro ao salvar progresso:', err);
        }
      } else {
        console.log('[AutoSave] Não salvou - diferença insuficiente');
      }
    }, 10000);
  };

  // Mantém a ref sincronizada com o state
  useEffect(() => {
    currentWatchTimeRef.current = currentWatchTime;
  }, [currentWatchTime]);

  // Handler para quando o vídeo termina
  const handleVideoEnded = useCallback(async () => {
    try {
      setSavingProgress(true);
      await progressService.markAsCompleted(videoId);
      setIsCompleted(true);
      const updatedProgress = await progressService.getCourseProgress(courseId);
      setCourseProgress(updatedProgress);
    } catch (err) {
      console.error('Erro ao marcar vídeo como completo:', err);
    } finally {
      setSavingProgress(false);
    }
  }, [videoId, courseId]);

  // Carrega o SDK do Cloudflare Stream
  useEffect(() => {
    console.log('[Player] Iniciando carregamento do SDK...');

    // Verifica se o SDK já está carregado
    if (window.Stream) {
      console.log('[Player] SDK já estava carregado');
      setSdkLoaded(true);
      return;
    }

    // Verifica se o script já existe
    const existingScript = document.querySelector('script[src*="cloudflarestream.com/embed/sdk"]');
    if (existingScript) {
      console.log('[Player] Script já existe, aguardando carregamento...');
      // Espera o script existente carregar
      const checkSDK = setInterval(() => {
        if (window.Stream) {
          console.log('[Player] SDK carregado (polling)');
          setSdkLoaded(true);
          clearInterval(checkSDK);
        }
      }, 100);
      return () => clearInterval(checkSDK);
    }

    // Carrega o SDK dinamicamente
    console.log('[Player] Carregando SDK dinamicamente...');
    const script = document.createElement('script');
    script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
    script.async = true;
    script.onload = () => {
      console.log('[Player] SDK carregado com sucesso');
      setSdkLoaded(true);
    };
    script.onerror = () => {
      console.error('[Player] Erro ao carregar SDK do Cloudflare');
    };
    document.head.appendChild(script);
  }, []);

  // Verifica periodicamente se o iframe foi montado (fallback para onLoad)
  useEffect(() => {
    if (iframeMounted) return; // Já está montado

    console.log('[Player] Iniciando polling para iframe. streamData:', streamData?.type, 'cloudflareId:', streamData?.cloudflareId);

    const checkIframe = setInterval(() => {
      // Tenta via ref primeiro
      if (iframeRef.current) {
        console.log('[Player] iframe detectado via ref');
        setIframeMounted(true);
        clearInterval(checkIframe);
        return;
      }

      // Fallback: busca o iframe no DOM diretamente
      const iframe = document.querySelector('iframe[src*="cloudflarestream.com"]') as HTMLIFrameElement;
      if (iframe) {
        console.log('[Player] iframe detectado via querySelector');
        // Atualiza a ref manualmente
        (iframeRef as any).current = iframe;
        setIframeMounted(true);
        clearInterval(checkIframe);
      }
    }, 200);

    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      clearInterval(checkIframe);
      if (!iframeMounted) {
        console.warn('[Player] Timeout aguardando iframe. Verificando DOM...');
        const allIframes = document.querySelectorAll('iframe');
        console.log('[Player] Total de iframes no DOM:', allIframes.length);
        allIframes.forEach((iframe, i) => {
          console.log(`[Player] iframe[${i}]:`, iframe.src);
        });
      }
    }, 10000);

    return () => {
      clearInterval(checkIframe);
      clearTimeout(timeout);
    };
  }, [iframeMounted, streamData?.cloudflareId, streamData?.type]);

  // Ref para armazenar o savedWatchTime para uso nos handlers
  const savedWatchTimeRef = useRef(0);
  
  // Mantém a ref sincronizada com o state
  useEffect(() => {
    savedWatchTimeRef.current = savedWatchTime;
  }, [savedWatchTime]);

  // Inicializa o player quando o iframe e SDK estiverem prontos
  useEffect(() => {
    console.log('[Player] useEffect init - sdkLoaded:', sdkLoaded, 'iframeMounted:', iframeMounted, 'iframeRef:', !!iframeRef.current, 'Stream:', !!window.Stream);

    if (!sdkLoaded || !iframeMounted || !iframeRef.current || !window.Stream) {
      console.log('[Player] Condições não atendidas, aguardando...');
      return;
    }

    console.log('[Player] Todas as condições atendidas, inicializando em 500ms...');

    // Pequeno delay para garantir que o iframe está completamente carregado
    const initTimeout = setTimeout(() => {
      try {
        if (!window.Stream || !iframeRef.current) {
          console.log('[Player] Stream ou iframe não disponível no timeout');
          return;
        }
        console.log('[Player] Inicializando player com iframe:', iframeRef.current.src);
        const player = window.Stream(iframeRef.current);
        playerRef.current = player;
        console.log('[Player] Player inicializado:', player);

        // Event listeners para o player
        const handleTimeUpdate = () => {
          if (playerRef.current) {
            const currentTime = playerRef.current.currentTime || 0;
            // Log a cada segundo para debug
            console.log('[Player] timeupdate:', Math.floor(currentTime), 'currentWatchTimeRef:', Math.floor(currentWatchTimeRef.current));
            setPlayerCurrentTime(currentTime);

            // Atualiza o tempo máximo assistido
            if (currentTime > currentWatchTimeRef.current) {
              setCurrentWatchTime(currentTime);
              currentWatchTimeRef.current = currentTime; // Atualiza a ref imediatamente
            }
          }
        };

        const handleLoadedData = () => {
          console.log('[Player] loadeddata/canplay disparado, savedWatchTimeRef:', savedWatchTimeRef.current);
          setIsPlayerReady(true);

          // Restaura posição salva com retry - usa a ref para pegar o valor mais atual
          const timeToRestore = savedWatchTimeRef.current;
          if (timeToRestore > 0 && !hasRestoredPosition.current && playerRef.current) {
            hasRestoredPosition.current = true; // Marca antes para evitar múltiplas tentativas
            hasCompletedInitialRestore.current = false; // Ainda não completou
            
            const restorePosition = (attempt: number = 1) => {
              if (!playerRef.current || attempt > 5) {
                hasCompletedInitialRestore.current = true;
                return;
              }
              
              console.log(`[Player] Tentativa ${attempt} de restaurar posição para: ${timeToRestore}`);
              playerRef.current.currentTime = timeToRestore;
              
              // Verifica se funcionou após um delay
              setTimeout(() => {
                if (playerRef.current) {
                  const currentTime = playerRef.current.currentTime;
                  console.log(`[Player] Após restauração, currentTime: ${currentTime}`);
                  
                  // Se não restaurou corretamente (diferença > 2 segundos), tenta novamente
                  if (Math.abs(currentTime - timeToRestore) > 2 && attempt < 5) {
                    restorePosition(attempt + 1);
                  } else {
                    console.log('[Player] Posição restaurada com sucesso!');
                    hasCompletedInitialRestore.current = true;
                  }
                }
              }, 500);
            };
            
            // Aguarda um pouco antes de tentar restaurar (player pode não estar 100% pronto)
            setTimeout(() => restorePosition(1), 300);
          } else {
            hasCompletedInitialRestore.current = true; // Não precisa restaurar
          }
        };

        const handleEnded = () => {
          handleVideoEnded();
        };

        const handleError = (error: any) => {
          console.error('[Player] Erro no player:', error);
          // Não mostrar erro se for apenas um problema de rede temporário
        };

        // Handler para quando o play é iniciado - restaura posição se necessário
        let hasRestoredOnPlay = false;
        const handlePlay = () => {
          console.log('[Player] play event disparado, currentTime:', playerRef.current?.currentTime, 'savedWatchTimeRef:', savedWatchTimeRef.current);
          
          // Usa a ref para pegar o valor mais atual
          const timeToRestore = savedWatchTimeRef.current;
          
          // Se temos uma posição salva e ainda não restauramos após o play
          if (timeToRestore > 0 && !hasRestoredOnPlay && playerRef.current) {
            const currentTime = playerRef.current.currentTime;
            
            // Se o player resetou para o início (< 3 segundos), restaura a posição
            if (currentTime < 3) {
              console.log('[Player] Detectado reset após play, restaurando para:', timeToRestore);
              hasRestoredOnPlay = true;
              
              // Pequeno delay para garantir que o play foi processado
              setTimeout(() => {
                if (playerRef.current) {
                  playerRef.current.currentTime = timeToRestore;
                  console.log('[Player] Posição restaurada após play para:', timeToRestore);
                }
              }, 100);
            } else {
              hasRestoredOnPlay = true; // Não precisa restaurar, já está na posição correta
            }
          }
        };

        // Registra os event listeners
        console.log('[Player] Registrando event listeners...');
        player.addEventListener('timeupdate', handleTimeUpdate);
        player.addEventListener('loadeddata', handleLoadedData);
        player.addEventListener('ended', handleEnded);
        player.addEventListener('canplay', handleLoadedData);
        player.addEventListener('play', handlePlay);
        console.log('[Player] Event listeners registrados');

        // Se o vídeo já estiver carregado, marca como pronto
        console.log('[Player] duration atual:', player.duration);
        if (player.duration > 0) {
          console.log('[Player] Vídeo já carregado, chamando handleLoadedData');
          handleLoadedData();
        }

        // Polling adicional de segurança para currentTime
        const pollInterval = setInterval(() => {
          if (playerRef.current && !playerRef.current.paused) {
            const currentTime = playerRef.current.currentTime || 0;
            if (currentTime > 0) {
              setPlayerCurrentTime(currentTime);
              if (currentTime > currentWatchTimeRef.current) {
                setCurrentWatchTime(currentTime);
              }
            }
          }
        }, 500);

        // Cleanup
        return () => {
          clearInterval(pollInterval);
          if (player) {
            player.removeEventListener('timeupdate', handleTimeUpdate);
            player.removeEventListener('loadeddata', handleLoadedData);
            player.removeEventListener('ended', handleEnded);
            player.removeEventListener('canplay', handleLoadedData);
            player.removeEventListener('play', handlePlay);
          }
        };
      } catch (err) {
        console.error('[Player] Erro ao inicializar player:', err);
      }
    }, 500);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [sdkLoaded, iframeMounted, streamData?.cloudflareId, handleVideoEnded]);

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
      console.error('Erro ao atualizar status:', err);
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

  // Handler para seek (pular para um tempo específico)
  const handleSeek = useCallback((time: number) => {
    if (playerRef.current) {
      console.log('[Player] Seeking to:', time);
      playerRef.current.currentTime = time;
      setPlayerCurrentTime(time);
    }
  }, []);

  const handleBackToAllCourses = () => {
    router.push('/student/my-courses');
  };

  const handleBackToCourse = () => {
    router.push(`/student/courses/${courseId}`);
  };

  const hasPreviousVideo = !!getPreviousVideo();
  const hasNextVideo = !!getNextVideo();

  // Loading state
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

  const hasValidStreamData = streamData && (
    (streamData.type === 'cloudflare' && streamData.cloudflareId) ||
    (streamData.type === 'embed' && streamData.embedUrl)
  );

  // Error state
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
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
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
              {streamData?.type === 'cloudflare' && streamData.cloudflareId ? (
                <iframe
                  ref={iframeRef}
                  src={`https://iframe.cloudflarestream.com/${streamData.cloudflareId.split('?')[0]}?preload=auto&previewThumbnails=false`}
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={currentVideo.title}
                  onLoad={() => {
                    console.log('[Player] iframe onLoad disparado');
                    setIframeMounted(true);
                  }}
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
                
                {/* Botão de Like */}
                <div className="flex-shrink-0">
                  <VideoLikeButton videoId={videoId} size="default" />
                </div>
              </div>

              {/* Info de Progresso */}
              {currentWatchTime > 0 && (
                <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-600">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Tempo assistido: {formatTime(currentWatchTime)}</span>
                </div>
              )}
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

              {/* Botão Marcar como Completo */}
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

            {/* Transcrição - Desktop */}
            <div className="hidden sm:block mt-6">
              <VideoTranscript 
                videoId={videoId} 
                currentTime={playerCurrentTime} 
                onSeek={handleSeek}
              />
            </div>

            {/* Anotações - Desktop */}
            <div className="hidden sm:block mt-4">
              <VideoNotes videoId={videoId} currentTime={playerCurrentTime} />
            </div>

            {/* Materiais, Anotações e Transcrição - Mobile (lista compacta) */}
            <div className="mt-4 sm:hidden space-y-3">
              <VideoMaterialsCompactList videoId={videoId} />
              <VideoNotesCompact videoId={videoId} currentTime={playerCurrentTime} />
              <VideoTranscriptCompact 
                videoId={videoId} 
                currentTime={playerCurrentTime} 
                onSeek={handleSeek}
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

            {/* Materiais Relacionados - Carrossel (Desktop) */}
            <VideoMaterialsCarousel videoId={videoId} />
          </div>
        </div>
      </div>

      {/* Barra de Navegação Mobile - Fixa na parte inferior */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-between px-2 py-2 gap-1">
          {/* Botão Anterior */}
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

          {/* Botão Lista/Curso */}
          <Button
            onClick={handleBackToCourse}
            variant="ghost"
            size="sm"
            className="flex-1 flex flex-col items-center gap-0.5 h-auto py-2"
          >
            <ListVideo className="h-5 w-5" />
            <span className="text-[10px]">Aulas</span>
          </Button>

          {/* Botão Concluir */}
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

          {/* Botão Próximo */}
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
