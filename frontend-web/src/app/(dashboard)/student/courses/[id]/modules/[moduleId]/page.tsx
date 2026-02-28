'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, CheckCircle2, Circle, Lock, Clock, Loader2, Video } from 'lucide-react';
import { Course, Module } from '@/lib/types/course.types';
import Image from 'next/image';

export default function ModuleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const { isStudentView } = useViewModeStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [isAuthenticated, user, courseId, moduleId, hasHydrated, isStudentView]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [courseData, progressData] = await Promise.all([
        coursesService.getById(courseId),
        progressService.getCourseProgress(courseId).catch(() => null),
      ]);
      
      setCourse(courseData);
      setCourseProgress(progressData);
      
      // Encontrar o módulo específico
      const foundModule = courseData.modules?.find(m => m.id === moduleId);
      if (!foundModule) {
        setError('Módulo não encontrado');
      } else {
        setModule(foundModule);
      }
      
      setError(null);
    } catch (err: any) {
      setError('Erro ao carregar módulo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isVideoCompleted = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const videoProgress = courseProgress.videos.find(v => v.videoId === videoId);
    return videoProgress?.completed || false;
  };

  const isVideoWatched = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const videoProgress = courseProgress.videos.find(v => v.videoId === videoId);
    return videoProgress?.watched || false;
  };

  const handleVideoClick = (videoId: string) => {
    router.push(`/student/courses/${courseId}/watch/${videoId}`);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModuleIndex = () => {
    if (!course?.modules || !module) return 0;
    return course.modules.findIndex(m => m.id === module.id);
  };

  if (!hasHydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !course || !module) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="container mx-auto">
          <Button variant="ghost" onClick={() => router.push(`/student/courses/${courseId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Curso
          </Button>
          <div className="text-center py-12">
            <p className="text-red-600 font-semibold">{error || 'Módulo não encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  const moduleVideos = module.videos || [];
  const moduleCompletedCount = moduleVideos.filter(v => isVideoCompleted(v.id)).length;
  const moduleProgress = moduleVideos.length > 0 
    ? Math.round((moduleCompletedCount / moduleVideos.length) * 100)
    : 0;
  const moduleIndex = getModuleIndex();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header do Módulo */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/student/courses/${courseId}`)} 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Curso
          </Button>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Thumbnail do Módulo */}
            {(module.thumbnailHorizontal || module.thumbnailVertical || module.thumbnail) && (
              <div className="lg:w-80 flex-shrink-0">
                <div className="relative aspect-video rounded-lg overflow-hidden shadow-md">
                  <Image
                    src={module.thumbnailHorizontal || module.thumbnailVertical || module.thumbnail || ''}
                    alt={module.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-full font-bold text-sm shadow-sm border border-gray-200">
                    Módulo {moduleIndex + 1}
                  </div>
                </div>
              </div>
            )}

            {/* Informações do Módulo */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-blue-600">
                  Módulo {moduleIndex + 1} de {course.modules?.length || 0}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 tracking-tight">
                {module.title}
              </h1>
              {module.description && (
                <p className="text-gray-600 mb-4 text-lg">{module.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  <span>{moduleVideos.length} aulas</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{moduleCompletedCount} concluídas</span>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Progresso do Módulo</span>
                  <span className="text-lg font-bold text-blue-600">{moduleProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      moduleProgress === 100 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{width: `${moduleProgress}%`}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Aulas */}
      <div className="container mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Aulas do Módulo</h2>
        
        {moduleVideos.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 rounded-lg bg-white shadow-sm">
            <Video className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma aula neste módulo</p>
          </div>
        ) : (
          <div className="space-y-3">
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
                    w-full flex items-center gap-4 p-4 rounded-lg transition-all duration-200 text-left border
                    ${!isPublished 
                      ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
                      : completed
                        ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:shadow-md'
                        : watched
                          ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:shadow-md'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Ícone de Status */}
                  <div className="flex-shrink-0">
                    {completed ? (
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                    ) : watched ? (
                      <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                    ) : isPublished ? (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Informações da Aula */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-500">
                        Aula {videoIndex + 1}
                      </span>
                      {!isPublished && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Em breve
                        </span>
                      )}
                    </div>
                    <h3 className={`font-semibold text-lg mb-1 ${
                      completed ? 'text-green-700' : 
                      watched ? 'text-amber-700' : 
                      'text-gray-900'
                    }`}>
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                  </div>

                  {/* Duração */}
                  <div className="flex-shrink-0 flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(video.duration)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}