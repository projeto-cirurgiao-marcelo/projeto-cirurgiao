'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import {
  AtlasButton,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasSkeletonCard,
  AtlasStatsInline,
} from '@/components/atlas';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Lock,
  Play,
  AlertCircle,
  Video,
} from 'lucide-react';
import { Course, Module } from '@/lib/types/course.types';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTotalDuration(totalSeconds: number): string | undefined {
  if (!totalSeconds || totalSeconds <= 0) return undefined;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function ModuleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, courseId, moduleId, hasHydrated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [courseData, progressData] = await Promise.all([
        coursesService.getById(courseId),
        progressService.getCourseProgress(courseId).catch(() => null),
      ]);

      setCourse(courseData);
      setCourseProgress(progressData);

      const foundModule = courseData.modules?.find((m) => m.id === moduleId);
      if (!foundModule) {
        setError('Módulo não encontrado');
      } else {
        setModule(foundModule);
      }

      setError(null);
    } catch (err: unknown) {
      setError('Erro ao carregar módulo');
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isVideoCompleted = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const v = courseProgress.videos.find((vp) => vp.videoId === videoId);
    return v?.completed || false;
  };

  const isVideoWatched = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const v = courseProgress.videos.find((vp) => vp.videoId === videoId);
    return v?.watched || false;
  };

  const handleVideoClick = (videoId: string) => {
    router.push(`/student/courses/${courseId}/watch/${videoId}`);
  };

  const handleBackToCourse = () => {
    // Se este modulo e submodulo, "voltar" vai pro modulo pai. Senao,
    // vai pra lista de modulos do curso.
    if (module?.parentModuleId) {
      router.push(`/student/courses/${courseId}/modules/${module.parentModuleId}`);
      return;
    }
    router.push(`/student/courses/${courseId}`);
  };

  // Estado: quais submodulos estao expandidos inline. Substituiu navegacao
  // pra detalhe do submodulo — usuario expande/recolhe sem sair da pagina.
  const [expandedSubmodules, setExpandedSubmodules] = useState<Set<string>>(new Set());
  const toggleSubmodule = (id: string) => {
    setExpandedSubmodules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moduleVideos = useMemo(() => module?.videos || [], [module]);

  // Submodulos (filhos): se este modulo for raiz e tem filhos, renderiza
  // section abaixo dos videos diretos. Se este e submodulo, fica vazio.
  const childModules = useMemo(() => {
    if (!course?.modules || !module) return [] as Module[];
    return course.modules.filter((m) => m.parentModuleId === module.id);
  }, [course, module]);
  const moduleCompletedCount = moduleVideos.filter((v) =>
    isVideoCompleted(v.id),
  ).length;
  const moduleProgress =
    moduleVideos.length > 0
      ? Math.round((moduleCompletedCount / moduleVideos.length) * 100)
      : 0;
  const moduleIndex =
    course?.modules?.findIndex((m) => m.id === moduleId) ?? 0;
  const totalSeconds = moduleVideos.reduce(
    (sum, v) => sum + (v.duration || 0),
    0,
  );
  const totalDuration = formatTotalDuration(totalSeconds);

  const hasStarted =
    moduleCompletedCount > 0 ||
    moduleVideos.some((v) => isVideoWatched(v.id));

  const nextVideo = useMemo(() => {
    for (const v of moduleVideos) {
      if (v.isPublished && !isVideoCompleted(v.id)) return v;
    }
    return moduleVideos.find((v) => v.isPublished) ?? null;
  }, [moduleVideos, courseProgress]);

  const handleStartOrContinue = () => {
    if (nextVideo) handleVideoClick(nextVideo.id);
  };

  if (!hasHydrated || loading) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-7">
        <AtlasLoadingBar className="mb-[18px]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px] sm:gap-[18px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <AtlasSkeletonCard key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (error || !course || !module) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-10">
        <div className="max-w-3xl mx-auto">
          <AtlasButton
            variant="ghost"
            size="sm"
            onClick={handleBackToCourse}
            className="mb-5"
          >
            <ArrowLeft strokeWidth={1.75} />
            Voltar ao curso
          </AtlasButton>
          <div className="bg-atlas-surface border border-dashed border-atlas-line rounded-md px-7 pt-14 pb-16 text-center">
            <div className="size-12 mx-auto mb-[18px] text-atlas-accent flex items-center justify-center">
              <AlertCircle className="size-12" strokeWidth={1.25} />
            </div>
            <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-1.5">
              {error ?? 'Módulo não encontrado'}
            </h2>
            <p className="text-atlas-muted text-[13px] max-w-[420px] mx-auto mb-[18px] leading-[1.55]">
              Verifique o link ou volte para o curso.
            </p>
            <AtlasButton
              variant="primary"
              size="md"
              onClick={handleBackToCourse}
            >
              Voltar ao curso
            </AtlasButton>
          </div>
        </div>
      </main>
    );
  }

  const moduleThumbUrl =
    module.thumbnailHorizontal ||
    module.thumbnailVertical ||
    module.thumbnail ||
    null;

  const ctaLabel = !hasStarted
    ? 'Iniciar módulo'
    : moduleProgress === 100
      ? 'Rever módulo'
      : 'Continuar assistindo';
  const CtaIcon = moduleProgress === 100 ? CheckCircle2 : Play;

  return (
    <>
      {moduleThumbUrl && (
        <div
          className={cn(
            'relative w-full overflow-hidden border-b border-atlas-line bg-atlas-surface-2',
            'aspect-[16/7] sm:aspect-[21/7] lg:aspect-[6/1]',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={moduleThumbUrl}
            alt={module.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-atlas-bg/40"
          />
        </div>
      )}

      <AtlasPageHeader
        metaLabel={`${course.title} · Módulo ${String(moduleIndex + 1).padStart(2, '0')} de ${String(course.modules?.length ?? 0).padStart(2, '0')}`}
        title={module.title}
        actions={
          nextVideo ? (
            <AtlasButton
              variant="primary"
              size="md"
              onClick={handleStartOrContinue}
              disabled={moduleVideos.length === 0}
            >
              <CtaIcon strokeWidth={1.75} />
              {ctaLabel}
            </AtlasButton>
          ) : undefined
        }
      >
        <button
          type="button"
          onClick={handleBackToCourse}
          className="inline-flex items-center gap-1.5 text-xs text-atlas-muted hover:text-atlas-ink transition-colors mt-1 mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Voltar ao curso
        </button>

        {module.description && (
          <p className="text-[13.5px] text-atlas-muted leading-[1.55] max-w-[640px] mt-2">
            {module.description}
          </p>
        )}

        <AtlasStatsInline
          className="mt-4"
          stats={[
            { value: String(moduleVideos.length), label: 'Aulas' },
            {
              value: String(moduleCompletedCount),
              total:
                moduleVideos.length > 0
                  ? `/ ${moduleVideos.length}`
                  : undefined,
              label: 'Aulas concluídas',
            },
            {
              value: `${moduleProgress}%`,
              format: 'mono',
              label: 'Progresso',
            },
            ...(totalDuration
              ? [
                  {
                    value: totalDuration,
                    format: 'mono' as const,
                    label: 'Duração total',
                  },
                ]
              : []),
          ]}
        />
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-6">
        {(() => {
          /**
           * Helper inline pra render de aula. Usado pra videos diretos
           * do modulo e pra videos de submodulos expandidos inline.
           * Mostra thumbnail (fallback Video icon) + status como texto
           * abaixo do titulo.
           */
          const renderVideoItem = (video: typeof moduleVideos[number], index: number) => {
            const completed = isVideoCompleted(video.id);
            const watched = isVideoWatched(video.id);
            const isPublished = video.isPublished;
            const statusLabel = !isPublished
              ? 'Em breve'
              : completed
                ? 'Concluída'
                : watched
                  ? 'Em progresso'
                  : 'Iniciar agora';
            const statusColor = !isPublished
              ? 'text-atlas-muted-2'
              : completed
                ? 'text-atlas-success'
                : watched
                  ? 'text-atlas-warn-deep'
                  : 'text-atlas-primary-2';

            return (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() =>
                    isPublished ? handleVideoClick(video.id) : undefined
                  }
                  disabled={!isPublished}
                  className={cn(
                    'group w-full text-left grid grid-cols-[68px_1fr_auto] sm:grid-cols-[88px_1fr_auto] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors duration-150',
                    !isPublished && 'opacity-60 cursor-not-allowed',
                    isPublished && 'hover:bg-atlas-surface-2',
                  )}
                >
                  {/* Thumbnail (16:9). Fallback = bloco com icone Video. */}
                  <div
                    className={cn(
                      'aspect-video rounded-md overflow-hidden shrink-0 border bg-atlas-surface-2 border-atlas-line relative',
                      completed && 'opacity-70',
                    )}
                  >
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-atlas-muted-2">
                        <Video className="size-5" aria-hidden />
                      </div>
                    )}
                    {!isPublished && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                        <Lock className="size-3.5" aria-hidden />
                      </div>
                    )}
                    {completed && (
                      <div className="absolute top-1 right-1 size-4 rounded-full bg-atlas-success text-white flex items-center justify-center">
                        <CheckCircle2 className="size-3" aria-hidden />
                      </div>
                    )}
                  </div>

                  {/* Title + status text */}
                  <div className="min-w-0">
                    <div className="atlas-mono text-[10px] text-atlas-muted-2 tracking-[0.05em] uppercase mb-0.5">
                      Aula {String(index + 1).padStart(2, '0')}
                    </div>
                    <h3
                      className={cn(
                        'font-serif text-[15px] font-medium tracking-[-0.005em] leading-[1.3] line-clamp-2',
                        completed ? 'text-atlas-muted' : 'text-atlas-ink',
                      )}
                    >
                      {video.title}
                    </h3>
                    <p className={cn('text-[11.5px] mt-0.5', statusColor)}>
                      {statusLabel}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="atlas-mono text-[11.5px] text-atlas-muted shrink-0 flex items-center gap-1.5 atlas-num">
                    <Circle
                      className="size-1 fill-atlas-muted-2 stroke-atlas-muted-2"
                      aria-hidden
                    />
                    {formatDuration(video.duration)}
                  </div>
                </button>
              </li>
            );
          };

          return (
            <>
              <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-[14px]">
                Aulas do módulo
              </h2>

              {moduleVideos.length === 0 && childModules.length === 0 ? (
                <AtlasEmptyState
                  icon={Video}
                  title="Nenhuma aula neste módulo"
                  description="O módulo ainda não possui aulas publicadas."
                />
              ) : moduleVideos.length === 0 ? null : (
                <ul className="bg-atlas-surface border border-atlas-line rounded-md overflow-hidden divide-y divide-atlas-line">
                  {moduleVideos.map((video, videoIndex) => renderVideoItem(video, videoIndex))}
                </ul>
              )}

              {/* Submodulos: accordion inline. Cada submodulo expande
                  pra mostrar suas aulas SEM sair da pagina. */}
              {childModules.length > 0 && (
                <div className={cn(moduleVideos.length > 0 && 'mt-6', 'space-y-2')}>
                  {childModules.map((sub) => {
                    const subVideos = sub.videos || [];
                    const subCompleted = subVideos.filter((v) =>
                      isVideoCompleted(v.id),
                    ).length;
                    const isExpanded = expandedSubmodules.has(sub.id);
                    return (
                      <div
                        key={sub.id}
                        className="bg-atlas-surface border border-atlas-line rounded-md overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSubmodule(sub.id)}
                          className="w-full text-left grid grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-5 py-3 transition-colors hover:bg-atlas-surface-2"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Video className="size-4 text-atlas-primary-2 shrink-0" aria-hidden />
                            <h3 className="text-[14px] sm:text-[15px] font-medium leading-tight text-atlas-ink truncate">
                              {sub.title}
                            </h3>
                          </div>
                          <div className="atlas-mono text-[11px] text-atlas-muted shrink-0 flex items-center gap-2">
                            <span>
                              {subVideos.length}{' '}
                              {subVideos.length === 1 ? 'aula' : 'aulas'}
                              {subVideos.length > 0 &&
                                ` · ${subCompleted} concluída${subCompleted === 1 ? '' : 's'}`}
                            </span>
                            <ChevronDown
                              className={cn(
                                'size-4 text-atlas-muted-2 transition-transform',
                                isExpanded && 'rotate-180',
                              )}
                              aria-hidden
                            />
                          </div>
                        </button>
                        {isExpanded && subVideos.length > 0 && (
                          <ul className="border-t border-atlas-line divide-y divide-atlas-line">
                            {subVideos.map((video, idx) => renderVideoItem(video, idx))}
                          </ul>
                        )}
                        {isExpanded && subVideos.length === 0 && (
                          <p className="border-t border-atlas-line px-4 py-3 text-[12px] text-atlas-muted">
                            Sem aulas neste submódulo.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </>
  );
}
