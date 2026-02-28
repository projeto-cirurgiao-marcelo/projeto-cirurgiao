'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { videosService } from '@/lib/api/videos.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';

// URL base da API para fetch com keepalive (não pode usar apiClient)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  SkipForward, 
  SkipBack, 
  ListVideo, 
  Loader2, 
  AlertCircle, 
  Circle, 
  CheckCircle,
  Clock, 
  FileText, 
  StickyNote,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Menu
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Course, Video as VideoType } from '@/lib/types/course.types';
import { StreamDataResponse } from '@/lib/api/videos.service';
import { VideoBreadcrumbs, VideoBreadcrumbsMobile } from '@/components/video-player/video-breadcrumbs';
import { VideoLikeButton } from '@/components/video-player/video-like-button';
import { VideoNotes, VideoNotesCompact } from '@/components/video-player/video-notes';
import { VideoTranscript, VideoTranscriptCompact } from '@/components/video-player/video-transcript';
import { VideoSummaries } from '@/components/video-player/video-summaries';
import { VideoMaterialsCarousel, VideoMaterialsCompactList } from '@/components/video-player/video-materials-carousel';
import { QuizCard } from '@/components/quiz/quiz-card';
import { QuizLockedCard } from '@/components/quiz/quiz-locked-card';
import { QuizCompletionModal } from '@/components/quiz/quiz-completion-modal';
import { quizzesService, Quiz, QuizStats } from '@/lib/api/quizzes.service';
import { ChatWidget } from '@/components/chatbot/chat-widget';

// ============================================
// VARIANTES DE ANIMAÇÃO FRAMER MOTION
// ============================================

// Container principal - stagger na entrada
const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// Itens individuais - fade + slide up
const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
    }
  }
};

// Transição de conteúdo das tabs
const tabContentVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0, 
    x: 10,
    transition: { duration: 0.2 }
  }
};

// Animação da lista de aulas - stagger
const lessonListVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

// Item individual da lista de aulas
const lessonItemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};

// Animação do Sheet mobile
const sheetVariants = {
  initial: { x: 300, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  exit: { 
    x: 300, 
    opacity: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  }
};

// Animação de expandir/colapsar card
const cardExpandVariants = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
  },
  expanded: { 
    height: "auto", 
    opacity: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
  }
};

// Botão com hover/tap
const buttonHoverTap = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2 }
};

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
  const { isStudentView } = useViewModeStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoType | null>(null);
  const [streamData, setStreamData] = useState<StreamDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de progresso
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [currentWatchTime, setCurrentWatchTime] = useState(0);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savedWatchTime, setSavedWatchTime] = useState(0);
  
  // Estado do quiz
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  
  // Estado do modal de quiz (aparece ao concluir aula)
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [hasShownQuizModal, setHasShownQuizModal] = useState(false);

  // Estado do menu lateral
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado da aba ativa (começa vazio = card fechado)
  const [activeTab, setActiveTab] = useState<string>("");
  
  // Refs para controle de progresso
  const lastSavedTimeRef = useRef(0);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentWatchTimeRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<CloudflareStreamPlayer | null>(null);
  const hasRestoredPosition = useRef(false);
  const hasCompletedInitialRestore = useRef(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [iframeMounted, setIframeMounted] = useState(false);

  const saveProgressOnExit = useCallback(async () => {
    const timeToSave = currentWatchTimeRef.current;
    if (timeToSave > lastSavedTimeRef.current) {
      try {
        await progressService.saveProgress({
          videoId,
          watchTime: Math.floor(timeToSave),
          completed: isCompleted,
        });
        lastSavedTimeRef.current = timeToSave;
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

    if (user?.role === 'ADMIN' && !isStudentView) {
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
  }, [isAuthenticated, user, courseId, videoId, hasHydrated, isStudentView]);

  // Salvar progresso ao fechar a aba ou navegar para outra página
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeToSave = currentWatchTimeRef.current;
      if (timeToSave > 0) {
        // Obtém o token de autenticação
        const firebaseToken = localStorage.getItem('firebaseToken') || localStorage.getItem('accessToken');
        
        const data = JSON.stringify({
          videoId,
          watchTime: Math.floor(timeToSave),
          completed: isCompleted,
        });
        
        // Usa fetch com keepalive para enviar com autenticação
        // keepalive permite que a requisição continue mesmo após a página ser fechada
        try {
          fetch(`${API_BASE_URL}/progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(firebaseToken && { 'Authorization': `Bearer ${firebaseToken}` }),
            },
            body: data,
            keepalive: true, // Importante: permite que a requisição continue após unload
          }).catch(() => {
            // Silencia erros - a página está sendo fechada
          });
        } catch {
          // Silencia erros - a página está sendo fechada
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
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
        if (videoProgress) {
          setCurrentWatchTime(videoProgress.watchTime);
          setSavedWatchTime(videoProgress.watchTime);
          lastSavedTimeRef.current = videoProgress.watchTime;
          setIsCompleted(videoProgress.completed);
          hasRestoredPosition.current = false;
        }
      }

      setCourse(courseData);
      setCurrentVideo(videoData);
      setStreamData(streamInfo);
      startAutoSave();
      
      // Carregar quizzes
      loadQuizzes();
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar vídeo');
    } finally {
      setLoading(false);
    }
  };

  const loadQuizzes = async () => {
    try {
      setLoadingQuiz(true);
      const quizzesData = await quizzesService.listQuizzesByVideo(videoId).catch(() => []);
      setQuizzes(quizzesData);
      
      if (quizzesData.length > 0) {
        const statsData = await quizzesService.getQuizStats(quizzesData[0].id).catch(() => null);
        if (statsData) {
          setQuizStats(statsData);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar quizzes:', err);
      setQuizzes([]);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const startAutoSave = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }

    saveIntervalRef.current = setInterval(async () => {
      const currentTime = currentWatchTimeRef.current;
      const lastSaved = lastSavedTimeRef.current;
      
      if (currentTime > lastSaved + 3) {
        try {
          await progressService.saveProgress({
            videoId,
            watchTime: Math.floor(currentTime),
            completed: isCompleted,
          });
          lastSavedTimeRef.current = currentTime;
        } catch (err) {
          console.error('[AutoSave] Erro ao salvar progresso:', err);
        }
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
      
      // Mostrar modal de quiz se houver quiz disponível e ainda não foi mostrado
      if (quizzes.length > 0 && !hasShownQuizModal) {
        setShowQuizModal(true);
        setHasShownQuizModal(true);
      }
    } catch (err) {
      console.error('Erro ao marcar vídeo como completo:', err);
    } finally {
      setSavingProgress(false);
    }
  }, [videoId, courseId, quizzes.length, hasShownQuizModal]);

  // Carrega o SDK do Cloudflare Stream
  useEffect(() => {
    if (window.Stream) {
      setSdkLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="cloudflarestream.com/embed/sdk"]');
    if (existingScript) {
      const checkSDK = setInterval(() => {
        if (window.Stream) {
          setSdkLoaded(true);
          clearInterval(checkSDK);
        }
      }, 100);
      return () => clearInterval(checkSDK);
    }

    const script = document.createElement('script');
    script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => console.error('[Player] Erro ao carregar SDK');
    document.head.appendChild(script);
  }, []);

  // Verifica periodicamente se o iframe foi montado
  useEffect(() => {
    if (iframeMounted) return;

    const checkIframe = setInterval(() => {
      if (iframeRef.current) {
        setIframeMounted(true);
        clearInterval(checkIframe);
        return;
      }

      const iframe = document.querySelector('iframe[src*="cloudflarestream.com"]') as HTMLIFrameElement;
      if (iframe) {
        (iframeRef as any).current = iframe;
        setIframeMounted(true);
        clearInterval(checkIframe);
      }
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(checkIframe);
    }, 10000);

    return () => {
      clearInterval(checkIframe);
      clearTimeout(timeout);
    };
  }, [iframeMounted, streamData?.cloudflareId, streamData?.type]);

  // Ref para armazenar o savedWatchTime
  const savedWatchTimeRef = useRef(0);
  
  useEffect(() => {
    savedWatchTimeRef.current = savedWatchTime;
  }, [savedWatchTime]);

  // Inicializa o player quando o iframe e SDK estiverem prontos
  useEffect(() => {
    if (!sdkLoaded || !iframeMounted || !iframeRef.current || !window.Stream) {
      return;
    }

    const initTimeout = setTimeout(() => {
      try {
        if (!window.Stream || !iframeRef.current) return;
        
        const player = window.Stream(iframeRef.current);
        playerRef.current = player;

        const handleTimeUpdate = () => {
          if (playerRef.current) {
            const currentTime = playerRef.current.currentTime || 0;
            setPlayerCurrentTime(currentTime);

            if (currentTime > currentWatchTimeRef.current) {
              setCurrentWatchTime(currentTime);
              currentWatchTimeRef.current = currentTime;
            }
          }
        };

        const handleLoadedData = () => {
          setIsPlayerReady(true);

          const timeToRestore = savedWatchTimeRef.current;
          if (timeToRestore > 0 && !hasRestoredPosition.current && playerRef.current) {
            hasRestoredPosition.current = true;
            hasCompletedInitialRestore.current = false;
            
            const restorePosition = (attempt: number = 1) => {
              if (!playerRef.current || attempt > 5) {
                hasCompletedInitialRestore.current = true;
                return;
              }
              
              playerRef.current.currentTime = timeToRestore;
              
              setTimeout(() => {
                if (playerRef.current) {
                  const currentTime = playerRef.current.currentTime;
                  
                  if (Math.abs(currentTime - timeToRestore) > 2 && attempt < 5) {
                    restorePosition(attempt + 1);
                  } else {
                    hasCompletedInitialRestore.current = true;
                  }
                }
              }, 500);
            };
            
            setTimeout(() => restorePosition(1), 300);
          } else {
            hasCompletedInitialRestore.current = true;
          }
        };

        const handleEnded = () => {
          handleVideoEnded();
        };

        const handleError = (error: any) => {
          console.error('[Player] Erro no player:', error);
        };

        let hasRestoredOnPlay = false;
        const handlePlay = () => {
          const timeToRestore = savedWatchTimeRef.current;
          
          if (timeToRestore > 0 && !hasRestoredOnPlay && playerRef.current) {
            const currentTime = playerRef.current.currentTime;
            
            if (currentTime < 3) {
              hasRestoredOnPlay = true;
              
              setTimeout(() => {
                if (playerRef.current) {
                  playerRef.current.currentTime = timeToRestore;
                }
              }, 100);
            } else {
              hasRestoredOnPlay = true;
            }
          }
        };

        player.addEventListener('timeupdate', handleTimeUpdate);
        player.addEventListener('loadeddata', handleLoadedData);
        player.addEventListener('ended', handleEnded);
        player.addEventListener('canplay', handleLoadedData);
        player.addEventListener('play', handlePlay);

        if (player.duration > 0) {
          handleLoadedData();
        }

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
        
        // Mostrar modal de quiz se houver quiz disponível e ainda não foi mostrado
        if (quizzes.length > 0 && !hasShownQuizModal) {
          setShowQuizModal(true);
          setHasShownQuizModal(true);
        }
      }
      const updatedProgress = await progressService.getCourseProgress(courseId);
      setCourseProgress(updatedProgress);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setSavingProgress(false);
    }
  };

  // Handler para iniciar quiz do modal
  const handleStartQuizFromModal = () => {
    setShowQuizModal(false);
    if (quizzes.length > 0) {
      router.push(`/student/courses/${courseId}/quiz/${quizzes[0].id}`);
    }
  };

  // Calcular progresso do vídeo em porcentagem
  const getVideoWatchProgress = (): number => {
    if (!currentVideo?.duration || currentVideo.duration === 0) return 0;
    return Math.min((currentWatchTime / currentVideo.duration) * 100, 100);
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
    if (playerRef.current) {
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-medical-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando vídeo...</p>
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
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={handleBackToAllCourses} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Cursos
          </Button>
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Erro ao carregar vídeo</h2>
            <p className="text-slate-600 mb-6">{error || 'Vídeo não disponível'}</p>
            <Button onClick={handleBackToAllCourses} className="bg-medical-700 hover:bg-medical-800">
              Voltar aos Cursos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-slate-50"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Breadcrumb - dentro do conteúdo, não fixo */}
      <motion.div 
        className="container mx-auto px-4 py-4"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackToAllCourses}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Meus Cursos</span>
            </Button>
            
            {course && currentVideo && (
              <div className="hidden md:block">
                <VideoBreadcrumbs
                  courseName={course.title}
                  courseId={courseId}
                  moduleName={course.modules?.find(m => m.videos?.some(v => v.id === currentVideo.id))?.title}
                  moduleId={course.modules?.find(m => m.videos?.some(v => v.id === currentVideo.id))?.id}
                  videoName={currentVideo.title}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {courseProgress && (
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">{courseProgress.progressPercentage}%</span>
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-medical-600 transition-all duration-300"
                    style={{ width: `${courseProgress.progressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Menu Mobile */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </motion.div>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 p-0">
                <motion.div
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="h-full"
                >
                  <SheetHeader className="px-6 py-4 border-b border-slate-200">
                    <SheetTitle>Conteúdo do Curso</SheetTitle>
                  </SheetHeader>
                  <div className="p-4">
                    <SidebarContent 
                      course={course}
                      courseProgress={courseProgress}
                      currentVideo={currentVideo}
                      quizzes={quizzes}
                      quizStats={quizStats}
                      loadingQuiz={loadingQuiz}
                      videoId={videoId}
                      courseId={courseId}
                      isVideoCompleted={isCompleted}
                      watchProgress={getVideoWatchProgress()}
                      getVideoProgressStatus={getVideoProgressStatus}
                      onVideoSelect={(vId) => {
                        setSidebarOpen(false);
                        if (vId !== currentVideo.id) {
                          router.push(`/student/courses/${courseId}/watch/${vId}`);
                        }
                      }}
                    />
                  </div>
                </motion.div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.div>

      {/* Layout Principal */}
      <main className="container mx-auto px-3 sm:px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Coluna Principal - Vídeo e Conteúdo */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Container do Player */}
            <motion.div 
              className="bg-slate-900 rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl -mx-3 sm:mx-0"
              variants={itemVariants}
            >
              <div className="aspect-video relative">
                {streamData?.type === 'cloudflare' && streamData.cloudflareId ? (
                  <iframe
                    ref={iframeRef}
                    src={`https://iframe.cloudflarestream.com/${streamData.cloudflareId.split('?')[0]}?preload=auto&previewThumbnails=false`}
                    className="w-full h-full"
                    style={{ border: 'none' }}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={currentVideo.title}
                    onLoad={() => setIframeMounted(true)}
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
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-medical-500" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Título e Ações */}
            <motion.div 
              className="space-y-4"
              variants={itemVariants}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    {currentVideo.title}
                  </h1>
                  {currentVideo.description && (
                    <p className="mt-2 text-slate-600 leading-relaxed">
                      {currentVideo.description}
                    </p>
                  )}
                </div>
                <VideoLikeButton videoId={videoId} size="default" />
              </div>

              {/* Barra de Ações - Responsiva */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-4 border-t border-slate-200">
                {/* Botão de Conclusão - Destaque Principal */}
                <motion.div className="w-full sm:w-auto" {...buttonHoverTap}>
                  <Button
                    onClick={handleMarkAsComplete}
                    disabled={savingProgress}
                    className={`
                      w-full sm:w-auto
                      ${isCompleted 
                        ? 'bg-medical-success hover:bg-medical-success/90' 
                        : 'bg-medical-700 hover:bg-medical-800'
                      } text-white shadow-md transition-all duration-200 h-11 sm:h-12 px-4 sm:px-6
                    `}
                  >
                    {savingProgress ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin flex-shrink-0" />
                    ) : isCompleted ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                    )}
                    <span className="text-sm sm:text-base whitespace-nowrap">
                      {isCompleted ? 'Aula Concluída' : 'Marcar como Concluído'}
                    </span>
                  </Button>
                </motion.div>

                {/* Botões de Navegação */}
                <div className="flex items-stretch sm:items-center gap-2 sm:ml-auto">
                  {hasPreviousVideo && (
                    <motion.div {...buttonHoverTap}>
                      <Button 
                        onClick={handlePreviousVideo} 
                        variant="outline"
                        className="flex-1 sm:flex-none h-11 sm:h-12 px-3 sm:px-4"
                      >
                        <SkipBack className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="text-sm sm:text-base">Anterior</span>
                      </Button>
                    </motion.div>
                  )}
                  
                  {hasNextVideo && (
                    <motion.div {...buttonHoverTap}>
                      <Button
                        onClick={handleNextVideo}
                        className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white h-11 sm:h-12 px-3 sm:px-4"
                      >
                        <span className="text-sm sm:text-base">Próxima</span>
                        <ChevronRight className="h-4 w-4 ml-1 sm:ml-2 flex-shrink-0" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Progresso de Visualização */}
              {currentWatchTime > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>Tempo assistido: {formatTime(currentWatchTime)}</span>
                </div>
              )}
            </motion.div>

            {/* Abas de Conteúdo com Animação */}
            <motion.div variants={itemVariants}>
              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full justify-start bg-slate-100/50 p-1 rounded-lg">
                  <TabsTrigger 
                    value="transcript" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Transcrição
                  </TabsTrigger>
                  <TabsTrigger 
                    value="materials" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Materiais
                  </TabsTrigger>
                </TabsList>
                
                <div className="mt-4">
                  <AnimatePresence mode="wait">
                    {activeTab === "transcript" && (
                      <TabsContent value="transcript" className="mt-0" forceMount>
                        <motion.div
                          key="transcript-panel"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                          className="bg-white border border-slate-200 rounded-xl p-4"
                        >
                          <VideoTranscript 
                            videoId={videoId} 
                            currentTime={playerCurrentTime} 
                            onSeek={handleSeek}
                          />
                        </motion.div>
                      </TabsContent>
                    )}
                    
                    {activeTab === "materials" && (
                      <TabsContent value="materials" className="mt-0" forceMount>
                        <motion.div
                          key="materials-panel"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                          className="bg-white border border-slate-200 rounded-xl p-4"
                        >
                          <VideoMaterialsCompactList videoId={videoId} />
                        </motion.div>
                      </TabsContent>
                    )}
                  </AnimatePresence>
                </div>
              </Tabs>
            </motion.div>
          </div>

          {/* Sidebar - Desktop */}
          <motion.div 
            className="hidden lg:block"
            variants={itemVariants}
          >
            <div className="sticky top-20 space-y-4">
              <SidebarContent 
                course={course}
                courseProgress={courseProgress}
                currentVideo={currentVideo}
                quizzes={quizzes}
                quizStats={quizStats}
                loadingQuiz={loadingQuiz}
                videoId={videoId}
                courseId={courseId}
                isVideoCompleted={isCompleted}
                watchProgress={getVideoWatchProgress()}
                getVideoProgressStatus={getVideoProgressStatus}
                onVideoSelect={(vId) => {
                  if (vId !== currentVideo.id) {
                    router.push(`/student/courses/${courseId}/watch/${vId}`);
                  }
                }}
              />
            </div>
          </motion.div>
        </div>
      </main>

      {/* Chatbot IA - Widget flutuante */}
      <ChatWidget 
        videoId={videoId}
        courseId={courseId}
        videoTitle={currentVideo.title}
        onSeekToTimestamp={handleSeek}
      />

      {/* Modal de Quiz - aparece ao concluir aula */}
      {quizzes.length > 0 && (
        <QuizCompletionModal
          isOpen={showQuizModal}
          onClose={() => setShowQuizModal(false)}
          onStartQuiz={handleStartQuizFromModal}
          quiz={quizzes[0]}
          stats={quizStats || undefined}
          videoTitle={currentVideo.title}
        />
      )}

      {/* Painel de Anotações - Sheet com animação */}
      <Sheet>
        <SheetTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="secondary"
              size="lg"
              className="fixed bottom-6 right-6 shadow-lg z-30 rounded-full h-14 px-6"
            >
              <StickyNote className="h-5 w-5 mr-2" />
              Anotações
            </Button>
          </motion.div>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[480px] p-0">
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full"
          >
            <SheetHeader className="px-6 py-4 border-b border-slate-200">
              <SheetTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-medical-600" />
                Suas Anotações
              </SheetTitle>
            </SheetHeader>
            <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
              <VideoNotes videoId={videoId} currentTime={playerCurrentTime} />
            </div>
          </motion.div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

// Componente da Sidebar (reutilizado entre desktop e mobile)
interface SidebarContentProps {
  course: Course | null;
  courseProgress: CourseProgress | null;
  currentVideo: VideoType;
  quizzes: Quiz[];
  quizStats: QuizStats | null;
  loadingQuiz: boolean;
  videoId: string;
  courseId: string;
  isVideoCompleted: boolean;
  watchProgress: number;
  getVideoProgressStatus: (vId: string) => { watched: boolean; completed: boolean };
  onVideoSelect: (vId: string) => void;
}

function SidebarContent({
  course,
  courseProgress,
  currentVideo,
  quizzes,
  quizStats,
  loadingQuiz,
  videoId,
  courseId,
  isVideoCompleted,
  watchProgress,
  getVideoProgressStatus,
  onVideoSelect,
}: SidebarContentProps) {
  return (
    <Tabs defaultValue="lessons" className="w-full">
      <TabsList className="w-full grid grid-cols-3 bg-slate-100/50 p-1">
        <TabsTrigger value="lessons" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
          <ListVideo className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Aulas</span>
        </TabsTrigger>
        <TabsTrigger value="summaries" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
          <GraduationCap className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Resumos</span>
        </TabsTrigger>
        <TabsTrigger value="quiz" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
          <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Quiz</span>
        </TabsTrigger>
      </TabsList>

      {/* Aba de Aulas */}
      <TabsContent value="lessons" className="mt-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Conteúdo do Curso</h3>
            {courseProgress && (
              <span className="text-xs bg-medical-100 text-medical-700 px-2 py-1 rounded-md font-medium">
                {courseProgress.completedVideos}/{courseProgress.totalVideos}
              </span>
            )}
          </div>

          {!course?.modules || course.modules.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum módulo disponível</p>
          ) : (
            <motion.div 
              className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2"
              variants={lessonListVariants}
              initial="initial"
              animate="animate"
            >
              {course.modules.map((module, moduleIndex) => (
                <motion.div 
                  key={module.id} 
                  className="space-y-2"
                  variants={lessonItemVariants}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-medical-100 flex items-center justify-center text-xs font-semibold text-medical-700">
                      {moduleIndex + 1}
                    </div>
                    <h4 className="text-sm font-medium text-slate-900 line-clamp-1">{module.title}</h4>
                  </div>

                  {module.videos && module.videos.length > 0 && (
                    <motion.div 
                      className="ml-7 space-y-1"
                      variants={lessonListVariants}
                      initial="initial"
                      animate="animate"
                    >
                      {module.videos.map((video, videoIndex) => {
                        const isCurrentVideo = video.id === currentVideo.id;
                        const progressStatus = getVideoProgressStatus(video.id);

                        return (
                          <motion.button
                            key={video.id}
                            onClick={() => onVideoSelect(video.id)}
                            disabled={isCurrentVideo}
                            variants={lessonItemVariants}
                            whileHover={!isCurrentVideo ? { x: 4 } : {}}
                            whileTap={!isCurrentVideo ? { scale: 0.98 } : {}}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2
                              ${isCurrentVideo
                                ? 'bg-medical-50 text-medical-700 font-medium border border-medical-200'
                                : progressStatus.completed
                                  ? 'text-medical-success hover:bg-medical-success/5'
                                  : progressStatus.watched
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-600 hover:bg-slate-50'
                              }
                            `}
                          >
                            <span className="flex-shrink-0">
                              {isCurrentVideo ? (
                                <motion.div 
                                  className="w-4 h-4 rounded-full bg-medical-600 flex items-center justify-center"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                >
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                </motion.div>
                              ) : progressStatus.completed ? (
                                <CheckCircle className="w-4 h-4 text-medical-success" />
                              ) : progressStatus.watched ? (
                                <Clock className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-300" />
                              )}
                            </span>
                            <span className="truncate flex-1 text-xs">
                              {videoIndex + 1}. {video.title}
                            </span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </TabsContent>

      {/* Aba de Resumos */}
      <TabsContent value="summaries" className="mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <VideoSummaries 
            videoId={videoId} 
            hasTranscript={true}
          />
        </motion.div>
      </TabsContent>

      {/* Aba de Quiz */}
      <TabsContent value="quiz" className="mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {loadingQuiz ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum quiz disponível para esta aula</p>
            </div>
          ) : isVideoCompleted ? (
            <QuizCard
              quiz={quizzes[0]}
              stats={quizStats || undefined}
              videoId={videoId}
              courseId={courseId}
            />
          ) : (
            <QuizLockedCard
              watchProgress={watchProgress}
              hasQuiz={quizzes.length > 0}
            />
          )}
        </motion.div>
      </TabsContent>
    </Tabs>
  );
}
