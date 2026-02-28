'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, CheckCircle2, BookOpen, Loader2 } from 'lucide-react';
import { Course } from '@/lib/types/course.types';
import { ModuleCard } from '@/components/student/module-card';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const { isStudentView } = useViewModeStore();
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

    if (user?.role === 'ADMIN' && !isStudentView) {
      router.push('/admin/courses');
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, courseId, hasHydrated, isStudentView]);

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="container mx-auto">
          <Button variant="ghost" onClick={() => router.push('/student/my-courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center py-12">
            <p className="text-red-600 font-semibold">{error || 'Curso não encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com progresso */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/student/my-courses')} 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Cursos
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 text-gray-900 tracking-tight">{course.title}</h1>
              {course.description && (
                <p className="text-gray-600 mb-4 text-lg">{course.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
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
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Seu Progresso</span>
                  <span className="text-lg font-bold text-blue-600">{progress}%</span>
                </div>
                {/* Progress bar com gradiente */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                    style={{width: `${progress}%`}}
                  />
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  {completedVideos} de {totalVideos} aulas concluídas
                </p>
                
                {!hasStarted ? (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleStartCourse}
                    disabled={totalVideos === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Curso
                  </Button>
                ) : progress === 100 ? (
                  <Button 
                    variant="success"
                    className="w-full" 
                    size="lg"
                    onClick={handleStartCourse}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Curso Concluído - Rever
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
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

      {/* Conteúdo do curso - Grid de Módulos */}
      <div className="container mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold mb-6 text-gray-900 tracking-tight">Módulos do Curso</h2>
        
        {!course.modules || course.modules.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="p-6 bg-gray-100 rounded-2xl inline-block mb-4">
              <BookOpen className="h-16 w-16 mx-auto text-gray-400" />
            </div>
            <p className="text-gray-600">
              Este curso ainda não possui módulos cadastrados
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {course.modules.map((module, moduleIndex) => {
              const moduleVideos = module.videos || [];
              const moduleCompletedCount = moduleVideos.filter(v => isVideoCompleted(v.id)).length;
              const moduleProgress = moduleVideos.length > 0 
                ? Math.round((moduleCompletedCount / moduleVideos.length) * 100)
                : 0;

              return (
                <ModuleCard
                  key={module.id}
                  module={module}
                  courseId={course.id}
                  moduleIndex={moduleIndex}
                  completedVideos={moduleCompletedCount}
                  totalVideos={moduleVideos.length}
                  progressPercentage={moduleProgress}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
