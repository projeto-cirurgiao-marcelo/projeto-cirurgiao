'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService } from '@/lib/api/courses.service';
import { videosService } from '@/lib/api/videos.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, SkipBack, ListVideo, Loader2, AlertCircle, CheckCircle, Circle, Clock } from 'lucide-react';
import { Course, Video as VideoType } from '@/lib/types/course.types';
import { StreamDataResponse } from '@/lib/api/videos.service';
import { Stream } from '@cloudflare/stream-react';

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
  const [isCompleted, setIsCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  
  // Refs para controle de progresso
  const lastSavedTimeRef = useRef(0);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Aguardar hidratação do Zustand antes de verificar autenticação
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN') {
      router.push('/admin/courses');
      return;
    }

    loadData();
    
    // Cleanup ao desmontar
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      // Salvar progresso final ao sair
      saveProgressOnExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, courseId, videoId, hasHydrated]);

  // Função para salvar progresso ao sair da página
  const saveProgressOnExit = async () => {
    if (currentWatchTime > lastSavedTimeRef.current) {
      try {
        await progressService.saveProgress({
          videoId,
          watchTime: Math.floor(currentWatchTime),
          completed: isCompleted,
        });
      } catch (err) {
        console.error('Erro ao salvar progresso final:', err);
      }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar dados do curso, vídeo e progresso em paralelo
      const [courseData, videoData, progressData] = await Promise.all([
        coursesService.getById(courseId),
        videosService.findOne(videoId),
        progressService.getCourseProgress(courseId).catch(() => null),
      ]);

      // Verificar se o vídeo está pronto para streaming
      // Para vídeos embed externos, não precisa de cloudflareId
      const isEmbedVideo = videoData.videoSource && videoData.videoSource !== 'cloudflare';
      
      if (!isEmbedVideo) {
        // Vídeo Cloudflare - verificar cloudflareId
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

      // Buscar URL do stream (Cloudflare ou embed)
      const streamInfo = await videosService.getStreamUrl(videoId);

      // Configurar progresso atual do vídeo
      if (progressData) {
        setCourseProgress(progressData);
        const videoProgress = progressData.videos.find(v => v.videoId === videoId);
        if (videoProgress) {
          setCurrentWatchTime(videoProgress.watchTime);
          lastSavedTimeRef.current = videoProgress.watchTime;
          setIsCompleted(videoProgress.completed);
        }
      }

      setCourse(courseData);
      setCurrentVideo(videoData);
      setStreamData(streamInfo);

      // Iniciar intervalo de salvamento automático (a cada 10 segundos)
      startAutoSave();
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar vídeo');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar salvamento automático
  const startAutoSave = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }

    saveIntervalRef.current = setInterval(async () => {
      if (currentWatchTime > lastSavedTimeRef.current + 5) { // Salvar se avançou mais de 5 segundos
        try {
          await progressService.saveProgress({
            videoId,
            watchTime: Math.floor(currentWatchTime),
            completed: isCompleted,
          });
          lastSavedTimeRef.current = currentWatchTime;
          console.log('Progresso salvo automaticamente:', currentWatchTime);
        } catch (err) {
          console.error('Erro ao salvar progresso:', err);
        }
      }
    }, 10000); // A cada 10 segundos
  };

  // Handler para atualização de tempo do vídeo
  const handleTimeUpdate = useCallback((event: any) => {
    const currentTime = event.target?.currentTime || 0;
    setCurrentWatchTime(currentTime);
  }, []);

  // Handler para quando o vídeo termina
  const handleVideoEnded = useCallback(async () => {
    try {
      setSavingProgress(true);
      await progressService.markAsCompleted(videoId);
      setIsCompleted(true);
      
      // Atualizar progresso do curso
      const updatedProgress = await progressService.getCourseProgress(courseId);
      setCourseProgress(updatedProgress);
      
      console.log('Vídeo marcado como completo!');
    } catch (err) {
      console.error('Erro ao marcar vídeo como completo:', err);
    } finally {
      setSavingProgress(false);
    }
  }, [videoId, courseId]);

  // Marcar vídeo como completo manualmente
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
      
      // Atualizar progresso do curso
      const updatedProgress = await progressService.getCourseProgress(courseId);
      setCourseProgress(updatedProgress);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setSavingProgress(false);
    }
  };

  // Função para obter todos os vídeos em ordem sequencial
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

  // Função para obter o índice do vídeo atual
  const getCurrentVideoIndex = (): number => {
    const allVideos = getAllVideosInOrder();
    return allVideos.findIndex(v => v.id === currentVideo?.id);
  };

  // Função para obter vídeo anterior
  const getPreviousVideo = (): VideoType | null => {
    const allVideos = getAllVideosInOrder();
    const currentIndex = getCurrentVideoIndex();

    if (currentIndex > 0) {
      return allVideos[currentIndex - 1];
    }
    return null;
  };

  // Função para obter próximo vídeo
  const getNextVideo = (): VideoType | null => {
    const allVideos = getAllVideosInOrder();
    const currentIndex = getCurrentVideoIndex();

    if (currentIndex >= 0 && currentIndex < allVideos.length - 1) {
      return allVideos[currentIndex + 1];
    }
    return null;
  };

  // Verificar se um vídeo foi assistido/completado
  const getVideoProgressStatus = (vId: string): { watched: boolean; completed: boolean } => {
    if (!courseProgress) return { watched: false, completed: false };
    const videoProgress = courseProgress.videos.find(v => v.videoId === vId);
    return {
      watched: videoProgress?.watched || false,
      completed: videoProgress?.completed || false,
    };
  };

  // Formatar tempo em minutos:segundos
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

  // Voltar para a lista de todos os cursos
  const handleBackToAllCourses = () => {
    router.push('/student/my-courses');
  };

  // Voltar para a página de detalhes do curso atual
  const handleBackToCourse = () => {
    router.push(`/student/courses/${courseId}`);
  };

  const previousVideo = getPreviousVideo();
  const nextVideo = getNextVideo();
  const hasPreviousVideo = !!previousVideo;
  const hasNextVideo = !!nextVideo;

  // Mostrar loading enquanto aguarda hidratação
  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando vídeo...</p>
        </div>
      </div>
    );
  }

  // Verificar se temos dados válidos para renderizar
  const hasValidStreamData = streamData && (
    (streamData.type === 'cloudflare' && streamData.cloudflareId) ||
    (streamData.type === 'embed' && streamData.embedUrl)
  );

  if (error || !currentVideo || !hasValidStreamData) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="container mx-auto max-w-4xl">
          <Button
            variant="ghost"
            onClick={handleBackToAllCourses}
            className="mb-4 text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Cursos
          </Button>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Erro ao carregar vídeo</h2>
            <p className="text-gray-400 mb-6">{error || 'Vídeo não disponível'}</p>
            <Button onClick={handleBackToAllCourses} className="bg-red-600 hover:bg-red-700">
              Voltar aos Cursos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBackToAllCourses}
              className="text-white hover:bg-gray-800"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Cursos
            </Button>

            <div className="flex items-center gap-4">
              {courseProgress && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${courseProgress.progressPercentage}%` }}
                    />
                  </div>
                  <span>{courseProgress.progressPercentage}% concluído</span>
                </div>
              )}

              {course && (
                <h1 className="text-sm font-medium text-gray-400 hidden lg:block">
                  {course.title}
                </h1>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player e Info */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Principal */}
          <div className="lg:col-span-2">
            {/* Player Container */}
            <div className="bg-black rounded-lg overflow-hidden border border-gray-800 mb-4" style={{ aspectRatio: '16/9' }}>
              {streamData?.type === 'cloudflare' && streamData.cloudflareId ? (
                // Player Cloudflare Stream
                <Stream
                  controls
                  src={streamData.cloudflareId.split('?')[0]}
                  responsive={true}
                  autoplay={false}
                  preload="auto"
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                />
              ) : streamData?.type === 'embed' && streamData.embedUrl ? (
                // Player Embed Externo (YouTube, Vimeo, Panda, etc)
                <iframe
                  src={streamData.embedUrl}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{currentVideo.title}</h2>
                  {currentVideo.description && (
                    <p className="text-gray-400">{currentVideo.description}</p>
                  )}
                </div>
                
                {/* Botão Marcar como Completo */}
                <Button
                  onClick={handleMarkAsComplete}
                  disabled={savingProgress}
                  variant={isCompleted ? "default" : "outline"}
                  className={isCompleted 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "border-gray-700 bg-transparent text-white hover:bg-gray-800"
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

              {/* Info de Progresso */}
              {currentWatchTime > 0 && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Tempo assistido: {formatTime(currentWatchTime)}</span>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleBackToCourse}
                variant="outline"
                className="border-gray-700 bg-transparent text-white hover:bg-gray-800 hover:text-white"
              >
                <ListVideo className="h-4 w-4 mr-2" />
                Voltar ao Curso
              </Button>

              {hasPreviousVideo && (
                <Button
                  onClick={handlePreviousVideo}
                  variant="outline"
                  className="border-gray-700 bg-transparent text-white hover:bg-gray-800 hover:text-white"
                >
                  <SkipBack className="h-4 w-4 mr-2" />
                  Aula Anterior
                </Button>
              )}

              {hasNextVideo && (
                <Button
                  onClick={handleNextVideo}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Próxima Aula
                  <SkipForward className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar - Lista de Aulas */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Conteúdo do Curso</h3>
                {courseProgress && (
                  <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                    {courseProgress.completedVideos}/{courseProgress.totalVideos} concluídas
                  </span>
                )}
              </div>

              {!course?.modules || course.modules.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum módulo disponível</p>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {course.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center text-xs font-semibold text-red-500">
                          {moduleIndex + 1}
                        </div>
                        <h4 className="text-sm font-medium text-white">{module.title}</h4>
                      </div>

                      {module.videos && module.videos.length > 0 && (
                        <div className="ml-8 space-y-1">
                          {module.videos.map((video, videoIndex) => {
                            const isCurrentVideo = video.id === currentVideo.id;
                            const progressStatus = getVideoProgressStatus(video.id);

                            return (
                              <button
                                key={video.id}
                                onClick={() => video.id !== currentVideo.id
                                  ? router.push(`/student/courses/${courseId}/watch/${video.id}`)
                                  : null
                                }
                                disabled={isCurrentVideo}
                                className={`
                                  w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2
                                  ${isCurrentVideo
                                    ? 'bg-red-600 text-white'
                                    : progressStatus.completed
                                      ? 'bg-green-600/10 text-green-400 hover:bg-green-600/20'
                                      : progressStatus.watched
                                        ? 'bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                  }
                                `}
                              >
                                {/* Ícone de Status */}
                                <span className="flex-shrink-0">
                                  {isCurrentVideo ? (
                                    <span className="w-4 h-4 flex items-center justify-center text-white">▶</span>
                                  ) : progressStatus.completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : progressStatus.watched ? (
                                    <Clock className="w-4 h-4 text-yellow-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gray-600" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
