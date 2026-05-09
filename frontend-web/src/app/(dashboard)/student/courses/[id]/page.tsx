'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService, CourseProgress } from '@/lib/api/progress.service';
import {
  AtlasButton,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasModuleCard,
  AtlasPageHeader,
  AtlasSkeletonCard,
  AtlasStagesProgress,
  AtlasStatsInline,
  type AtlasCourseStatus,
  type AtlasCourseThumbVariant,
  type Stage,
  type StageStatus,
} from '@/components/atlas';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Play,
  AlertCircle,
} from 'lucide-react';
import { Course } from '@/lib/types/course.types';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const THUMB_VARIANTS: AtlasCourseThumbVariant[] = [
  'default',
  'alt',
  'alt2',
  'alt3',
  'alt4',
];

function pickThumbVariant(id: string): AtlasCourseThumbVariant {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % THUMB_VARIANTS.length;
  return THUMB_VARIANTS[idx];
}

function formatTotalDuration(totalSeconds: number): string | undefined {
  if (!totalSeconds || totalSeconds <= 0) return undefined;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [course, setCourse] = useState<Course | null>(null);
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
  }, [isAuthenticated, user, courseId, hasHydrated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [courseData, progressData] = await Promise.all([
        coursesService.getById(courseId),
        progressService.getCourseProgress(courseId).catch(() => null),
      ]);
      setCourse(courseData);
      setCourseProgress(progressData);
      setError(null);
    } catch (err: unknown) {
      setError('Erro ao carregar curso');
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isVideoCompleted = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const videoProgress = courseProgress.videos.find(
      (v) => v.videoId === videoId,
    );
    return videoProgress?.completed || false;
  };

  const isVideoWatched = (videoId: string): boolean => {
    if (!courseProgress) return false;
    const videoProgress = courseProgress.videos.find(
      (v) => v.videoId === videoId,
    );
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

  const handleBack = () => router.push('/student/my-courses');

  // Calcular progresso
  const totalVideos =
    courseProgress?.totalVideos ||
    course?.modules?.reduce((sum, m) => sum + (m.videos?.length || 0), 0) ||
    0;
  const completedVideos = courseProgress?.completedVideos || 0;
  const progress = courseProgress?.progressPercentage || 0;
  const hasStarted =
    completedVideos > 0 || (courseProgress?.watchedVideos || 0) > 0;

  const totalSeconds =
    course?.modules?.reduce(
      (sum, m) =>
        sum +
        (m.videos?.reduce(
          (vsum, v) => vsum + (v.duration || 0),
          0,
        ) || 0),
      0,
    ) || 0;
  const totalDuration = formatTotalDuration(totalSeconds);

  // Stages derivados dos módulos (mesma lógica usada no watch page)
  const stages: Stage[] = (course?.modules ?? []).map((mod, mi) => {
    const total = mod.videos?.length ?? 0;
    const done = mod.videos?.filter((v) => isVideoCompleted(v.id)).length ?? 0;
    const watched =
      mod.videos?.filter((v) => isVideoWatched(v.id)).length ?? 0;

    let status: StageStatus = 'future';
    let count = `${done} / ${total} pendente${total === 1 ? '' : 's'}`;

    if (total > 0 && done === total) {
      status = 'done';
      count = `${done} / ${total} concluída${total === 1 ? '' : 's'}`;
    } else if (watched > 0 || done > 0) {
      status = 'current';
      count = `${done} / ${total} em andamento`;
    }

    return {
      num: mi + 1,
      name: mod.title,
      count,
      status,
    };
  });

  if (!hasHydrated || loading) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-7">
        <AtlasLoadingBar className="mb-[18px]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <AtlasSkeletonCard key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-10">
        <div className="max-w-3xl mx-auto">
          <AtlasButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
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
              {error ?? 'Curso não encontrado'}
            </h2>
            <p className="text-atlas-muted text-[13px] max-w-[420px] mx-auto mb-[18px] leading-[1.55]">
              Verifique o link ou volte para a lista de cursos.
            </p>
            <AtlasButton variant="primary" size="md" onClick={handleBack}>
              Voltar aos cursos
            </AtlasButton>
          </div>
        </div>
      </main>
    );
  }

  const ctaLabel = !hasStarted
    ? 'Iniciar curso'
    : progress === 100
      ? 'Rever curso'
      : 'Continuar assistindo';
  const ctaIcon = progress === 100 ? CheckCircle2 : Play;
  const ctaHandler = !hasStarted
    ? handleStartCourse
    : progress === 100
      ? handleStartCourse
      : handleContinueCourse;
  const CtaIcon = ctaIcon;

  const courseThumbUrl =
    course.thumbnailHorizontal ||
    course.thumbnailVertical ||
    course.thumbnail ||
    null;

  return (
    <>
      {courseThumbUrl && (
        <div
          className={cn(
            'relative w-full overflow-hidden border-b border-atlas-line bg-atlas-surface-2',
            'aspect-[16/7] sm:aspect-[21/7] lg:aspect-[6/1]',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={courseThumbUrl}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient sutil pra integração com bg do header */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-atlas-bg/40"
          />
        </div>
      )}

      <AtlasPageHeader
        metaLabel="Curso · Conteúdo"
        title={course.title}
        actions={
          <AtlasButton
            variant="primary"
            size="md"
            onClick={ctaHandler}
            disabled={totalVideos === 0}
          >
            <CtaIcon strokeWidth={1.75} />
            {ctaLabel}
          </AtlasButton>
        }
      >
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-atlas-muted hover:text-atlas-ink transition-colors mt-1 mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Voltar aos cursos
        </button>

        {course.description && (
          <p className="text-[13.5px] text-atlas-muted leading-[1.55] max-w-[640px] mt-2">
            {course.description}
          </p>
        )}

        <AtlasStatsInline
          className="mt-4"
          stats={[
            {
              value: String(course.modules?.length ?? 0),
              label: 'Módulos',
            },
            {
              value: String(totalVideos),
              label: 'Aulas',
            },
            {
              value: String(completedVideos),
              total: totalVideos > 0 ? `/ ${totalVideos}` : undefined,
              label: 'Aulas concluídas',
            },
            ...(totalDuration
              ? [
                  {
                    value: totalDuration,
                    format: 'mono' as const,
                    label: 'Duração total',
                  },
                ]
              : [
                  {
                    value: `${progress}%`,
                    format: 'mono' as const,
                    label: 'Progresso',
                  },
                ]),
          ]}
        />

        {stages.length > 1 && <AtlasStagesProgress stages={stages} />}
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-6">
        <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-[14px]">
          Módulos do curso
        </h2>

        {!course.modules || course.modules.length === 0 ? (
          <AtlasEmptyState
            icon={BookOpen}
            title="Nenhum módulo cadastrado"
            description="Este curso ainda não possui módulos. Volte em breve."
          />
        ) : (() => {
          // Hierarquia: filtra modulos raiz; cards agregam contagem de
          // videos diretos + videos de submodulos filhos.
          const allModules = course.modules ?? [];
          const rootModules = allModules.filter((m) => !m.parentModuleId);
          const childrenByParent = new Map<string, typeof allModules>();
          for (const m of allModules) {
            if (m.parentModuleId) {
              const arr = childrenByParent.get(m.parentModuleId) ?? [];
              arr.push(m);
              childrenByParent.set(m.parentModuleId, arr);
            }
          }

          if (rootModules.length === 0) {
            return (
              <AtlasEmptyState
                icon={BookOpen}
                title="Nenhum módulo cadastrado"
                description="Este curso ainda não possui módulos. Volte em breve."
              />
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
              {rootModules.map((module, moduleIndex) => {
                const directVideos = module.videos || [];
                const children = childrenByParent.get(module.id) ?? [];
                const childVideos = children.flatMap((c) => c.videos || []);
                const allVideos = [...directVideos, ...childVideos];

                const moduleCompleted = allVideos.filter((v) =>
                  isVideoCompleted(v.id),
                ).length;
                const moduleProgress =
                  allVideos.length > 0
                    ? Math.round(
                        (moduleCompleted / allVideos.length) * 100,
                      )
                    : 0;
                const moduleWatched = allVideos.some((v) =>
                  isVideoWatched(v.id),
                );
                const status: AtlasCourseStatus =
                  moduleProgress === 100
                    ? 'completed'
                    : moduleWatched || moduleCompleted > 0
                      ? 'in-progress'
                      : 'new';
                const thumbImageUrl =
                  module.thumbnailHorizontal ||
                  module.thumbnailVertical ||
                  module.thumbnail ||
                  undefined;

                return (
                  <AtlasModuleCard
                    key={module.id}
                    href={`/student/courses/${course.id}/modules/${module.id}`}
                    moduleIndex={moduleIndex + 1}
                    title={module.title}
                    description={
                      children.length > 0
                        ? `${children.length} submódulo${children.length === 1 ? '' : 's'}${module.description ? ' · ' + module.description : ''}`
                        : module.description
                    }
                    totalLessons={allVideos.length}
                    completedLessons={moduleCompleted}
                    progressPercent={moduleProgress}
                    status={status}
                    thumbVariant={pickThumbVariant(module.id)}
                    thumbImageUrl={thumbImageUrl}
                  />
                );
              })}
            </div>
          );
        })()}
      </div>
    </>
  );
}
