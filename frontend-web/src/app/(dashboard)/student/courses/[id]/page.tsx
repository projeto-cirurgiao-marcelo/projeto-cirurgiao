'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Play, CheckCircle2, Circle, Lock, BookOpen, Clock, Loader2 } from 'lucide-react';
import { Course } from '@/lib/types/course.types';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, courseId, hasHydrated]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar curso e progresso em paralelo
      const [courseData, progressData] = await Promise.all([
        coursesService.getById(courseId),
        progressService.getCourseProgress(courseId).catch(() => null),
      ]);
      
      setCourse(courseData);
      setCourseProgress(progressData);
      setError(null);
    } catch (err: any) {
      setError('Erro ao carregar curso');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se um vídeo foi concluído
  const isVideoCompleted = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const videoProgress = courseProgress.videos.find(v => v.videoId === videoId);
    return videoProgress?.completed || false;
  };

  // Verificar se um vídeo foi assistido (mas não necessariamente concluído)
  const isVideoWatched = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const videoProgress = courseProgress.videos.find(v => v.videoId === videoId);
    return videoProgress?.watched || false;
  };

  const getFirstVideo = () => {
    if (!course?.modules || course.modules.length === 0) return null;
    
    const firstModule = course.modules[0];
    if (!firstModule.videos || firstModule.videos.length === 0) return null;
    
    return firstModule.videos[0];
  };

  const getNextUnwatchedVideo = () => {
    if (!course?.modules) return null;
    
    for (const module of course.modules) {
      if (!module.videos) continue;
      
      for (const video of module.videos) {
        if (!isVideoCompleted(video.id)) {
          return video;
        }
      }
    }
    
    // Se todos foram concluídos, retorna o primeiro
    return getFirstVideo();
  };

  const handleStartCourse = () => {
    const firstVideo = getFirstVideo();
    if (firstVideo) {
      router.push(`/student/courses/${course?.id}/watch/${firstVideo.id}`);
    }
  };

  const handleContinueCourse = () => {
    const nextVideo = getNextUnwatchedVideo();
    if (nextVideo) {
      router.push(`/student/courses/${course?.id}/watch/${nextVideo.id}`);
    }
  };

  const handleVideoClick = (videoId: string) => {
    router.push(`/student/courses/${course?.id}/watch/${videoId}`);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular progresso
  const totalVideos = courseProgress?.totalVideos || 
    course?.modules?.reduce((sum, m) => sum + (m.videos?.length || 0), 0) || 0;
  const completedVideos = courseProgress?.completedVideos || 0;
  const progress = courseProgress?.progressPercentage || 0;
  const hasStarted = completedVideos > 0 || (courseProgress?.watchedVideos || 0) > 0;

  // Mostrar loading enquanto aguarda hidratação
  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="container mx-auto">
          <Button variant="ghost" onClick={() => router.push('/student/my-courses')} className="text-white hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center py-12">
            <p className="text-red-500">{error || 'Curso não encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header com progresso */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-6 py-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/student/my-courses')} 
            className="mb-4 text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Cursos
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-gray-400 mb-4">{course.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.modules?.length || 0} módulos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Play className="h-4 w-4" />
                  <span>{totalVideos} aulas</span>
                </div>
              </div>
            </div>

            <div className="lg:w-80">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Seu Progresso</span>
                  <span className="text-sm font-bold text-white">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 mb-4 bg-gray-700" />
                <p className="text-xs text-gray-400 mb-4">
                  {completedVideos} de {totalVideos} aulas concluídas
                </p>
                
                {!hasStarted ? (
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700" 
                    size="lg"
                    onClick={handleStartCourse}
                    disabled={totalVideos === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Curso
                  </Button>
                ) : progress === 100 ? (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    size="lg"
                    onClick={handleStartCourse}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Curso Concluído - Rever
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700" 
                    size="lg"
                    onClick={handleContinueCourse}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Continuar Assistindo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo do curso */}
      <div className="container mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Conteúdo do Curso</h2>
        
        {!course.modules || course.modules.length === 0 ? (
          <div className="text-center py-12 border border-gray-800 rounded-lg bg-gray-900">
            <BookOpen className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">
              Este curso ainda não possui módulos cadastrados
            </p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={course.modules.map(m => m.id)} className="space-y-4">
            {course.modules.map((module, moduleIndex) => {
              const moduleVideos = module.videos || [];
              const moduleCompletedCount = moduleVideos.filter(v => isVideoCompleted(v.id)).length;
              const moduleProgress = moduleVideos.length > 0 
                ? Math.round((moduleCompletedCount / moduleVideos.length) * 100)
                : 0;

              return (
                <AccordionItem 
                  key={module.id} 
                  value={module.id}
                  className="border border-gray-800 rounded-lg px-4 bg-gray-900"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-sm font-semibold text-red-500">
                          {moduleIndex + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{module.title}</h3>
                          <p className="text-sm text-gray-400">
                            {moduleVideos.length} aulas • {moduleCompletedCount} concluídas
                          </p>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${moduleProgress === 100 ? 'text-green-500' : 'text-red-500'}`}>
                        {moduleProgress}%
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent>
                    {module.description && (
                      <p className="text-sm text-gray-400 mb-4 px-11">
                        {module.description}
                      </p>
                    )}
                    
                    {moduleVideos.length === 0 ? (
                      <p className="text-sm text-gray-400 px-11 py-4">
                        Nenhuma aula neste módulo
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {moduleVideos.map((video, videoIndex) => {
                          const completed = isVideoCompleted(video.id);
                          const watched = isVideoWatched(video.id);
                          const isPublished = video.isPublished;
                          
                          return (
                            <button
                              key={video.id}
                              onClick={() => isPublished ? handleVideoClick(video.id) : null}
                              disabled={!isPublished}
                              className={`
                                w-full flex items-center gap-3 px-11 py-3 rounded-lg transition-colors text-left
                                ${!isPublished 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : completed
                                    ? 'bg-green-600/10 hover:bg-green-600/20'
                                    : watched
                                      ? 'bg-yellow-600/10 hover:bg-yellow-600/20'
                                      : 'hover:bg-gray-800'
                                }
                              `}
                            >
                              <div className="flex-shrink-0">
                                {completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : watched ? (
                                  <Clock className="h-5 w-5 text-yellow-500" />
                                ) : isPublished ? (
                                  <Circle className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <Lock className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${completed ? 'text-green-400' : watched ? 'text-yellow-400' : 'text-white'}`}>
                                  {videoIndex + 1}. {video.title}
                                </p>
                                {video.description && (
                                  <p className="text-sm text-gray-400 truncate">
                                    {video.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Clock className="h-4 w-4" />
                                <span>{formatDuration(video.duration)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
