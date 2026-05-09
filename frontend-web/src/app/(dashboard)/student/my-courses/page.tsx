'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { getCourseWeightedPercent } from '@/lib/course-progress';
import {
  progressService,
  EnrolledCourseWithProgress,
} from '@/lib/api/progress.service';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Course } from '@/lib/types/course.types';
import {
  AtlasButton,
  AtlasCourseCard,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasSkeletonCard,
  AtlasStatsInline,
  type AtlasCourseStatus,
  type AtlasCourseThumbVariant,
} from '@/components/atlas';
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

function formatCompletedDate(date: string | null): string | undefined {
  if (!date) return undefined;
  try {
    const d = new Date(date);
    const months = [
      'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
      'jul', 'ago', 'set', 'out', 'nov', 'dez',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return undefined;
  }
}

interface NewCourseRow {
  kind: 'new';
  id: string;
  title: string;
  thumbnail: string | null;
  thumbnailHorizontal: string | null;
  thumbnailVertical: string | null;
  instructor?: { name: string } | undefined;
  totalVideos: number;
}

interface EnrolledCourseRow {
  kind: 'enrolled';
  id: string;
  title: string;
  thumbnail: string | null;
  thumbnailHorizontal: string | null;
  thumbnailVertical: string | null;
  instructor?: { name: string } | undefined;
  status: AtlasCourseStatus;
  progressPercent: number;
  watched: number;
  total: number;
  lastAccessAt: string | null;
  completedAt: string | null;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [enrolled, setEnrolled] = useState<EnrolledCourseRow[]>([]);
  const [available, setAvailable] = useState<NewCourseRow[]>([]);
  const [totalCatalog, setTotalCatalog] = useState(0);
  const [loading, setLoading] = useState(true);

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
    void loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, hasHydrated]);

  const loadCourses = async () => {
    try {
      const [enrolledData, allCoursesData] = await Promise.all([
        progressService.getEnrolledCourses().catch(() => []),
        coursesService.findAll({ page: 1, limit: 100 }),
      ]);

      const allCoursesArray: Course[] = Array.isArray(allCoursesData)
        ? (allCoursesData as Course[])
        : ((allCoursesData as any).data as Course[]) || [];

      setTotalCatalog(allCoursesArray.length);

      const enrolledIds = new Set(
        (enrolledData as EnrolledCourseWithProgress[]).map((c) => c.id),
      );

      const enrolledRows: EnrolledCourseRow[] = (
        enrolledData as EnrolledCourseWithProgress[]
      ).map((c) => {
        const binaryPct = c.progress.percentage;
        const weightedPct = getCourseWeightedPercent(c);
        // Status decide via binary (completion oficial); barra usa weighted.
        const status: AtlasCourseStatus =
          c.enrollment.completedAt || binaryPct >= 100
            ? 'completed'
            : weightedPct === 0
              ? 'new'
              : 'in-progress';
        return {
          kind: 'enrolled',
          id: c.id,
          title: c.title,
          thumbnail: c.thumbnail,
          thumbnailHorizontal: c.thumbnailHorizontal,
          thumbnailVertical: c.thumbnailVertical,
          instructor: c.instructor,
          status,
          progressPercent: weightedPct,
          watched: c.progress.watchedVideos,
          total: c.progress.totalVideos,
          lastAccessAt: c.enrollment.lastAccessAt,
          completedAt: c.enrollment.completedAt,
        };
      });

      const availableRows: NewCourseRow[] = allCoursesArray
        .filter((course) => !enrolledIds.has(course.id))
        .map((course) => {
          const totalVideos =
            course.modules?.reduce(
              (sum: number, m: any) => sum + (m.videos?.length || 0),
              0,
            ) || 0;
          return {
            kind: 'new',
            id: course.id,
            title: course.title,
            thumbnail: course.thumbnail,
            thumbnailHorizontal: course.thumbnailHorizontal,
            thumbnailVertical: course.thumbnailVertical,
            instructor: course.instructor,
            totalVideos,
          };
        });

      setEnrolled(enrolledRows);
      setAvailable(availableRows);
    } catch (error) {
      logger.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const inProgress = useMemo(
    () =>
      enrolled
        .filter((c) => c.status === 'in-progress')
        .sort((a, b) => {
          const dA = new Date(a.lastAccessAt || 0).getTime();
          const dB = new Date(b.lastAccessAt || 0).getTime();
          return dB - dA;
        }),
    [enrolled],
  );

  const awaitingStart = useMemo(
    () => enrolled.filter((c) => c.status === 'new'),
    [enrolled],
  );

  const recentlyCompleted = useMemo(
    () =>
      enrolled
        .filter((c) => c.status === 'completed')
        .sort((a, b) => {
          const dA = new Date(a.completedAt || 0).getTime();
          const dB = new Date(b.completedAt || 0).getTime();
          return dB - dA;
        }),
    [enrolled],
  );

  if (!hasHydrated || !user) {
    return (
      <main className="px-7 py-7">
        <AtlasLoadingBar />
      </main>
    );
  }

  const enrolledCount = enrolled.length;
  const inProgressCount = inProgress.length;
  const completedCount = recentlyCompleted.length;
  const availableCount = available.length;

  const showEmpty =
    !loading && enrolledCount === 0 && availableCount === 0;

  return (
    <>
      <AtlasPageHeader
        metaLabel="Biblioteca"
        title="Meus"
        titleEm="cursos"
      >
        <AtlasStatsInline
          stats={[
            {
              value: String(enrolledCount),
              total: totalCatalog > 0 ? `/ ${totalCatalog}` : undefined,
              label: 'Matriculados',
            },
            { value: String(inProgressCount), label: 'Em andamento' },
            { value: String(completedCount), label: 'Concluídos' },
            { value: String(availableCount), label: 'Disponíveis pra começar' },
          ]}
        />
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-8 sm:space-y-10">
        {loading ? (
          <>
            <AtlasLoadingBar className="mb-[18px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <AtlasSkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : showEmpty ? (
          <AtlasEmptyState
            icon={BookOpen}
            title="Nenhum curso disponível"
            description="Novos cursos serão adicionados em breve. Volte em alguns dias."
          />
        ) : (
          <>
            {inProgress.length > 0 && (
              <Section
                title="Continue de onde parou"
                hint="Retome os cursos que você começou"
                linkLabel="Ver todos em andamento"
                linkHref="/student/in-progress"
              >
                {inProgress.slice(0, 3).map((c) => (
                  <AtlasCourseCard
                    key={c.id}
                    href={`/student/courses/${c.id}`}
                    title={c.title}
                    category="Cirurgia veterinária"
                    instructor={c.instructor?.name}
                    lessonsCount={c.total}
                    status="in-progress"
                    progressPercent={c.progressPercent}
                    lessonsProgress={`${c.watched} / ${c.total}`}
                    thumbVariant={pickThumbVariant(c.id)}
                    thumbImageUrl={
                      c.thumbnailHorizontal ||
                      c.thumbnailVertical ||
                      c.thumbnail ||
                      undefined
                    }
                  />
                ))}
              </Section>
            )}

            {awaitingStart.length > 0 && (
              <Section
                title="Aguardando início"
                hint="Matriculados que ainda não começaram"
                linkLabel="Explorar catálogo"
                linkHref="/student/courses"
              >
                {awaitingStart.slice(0, 4).map((c) => (
                  <AtlasCourseCard
                    key={c.id}
                    href={`/student/courses/${c.id}`}
                    title={c.title}
                    category="Cirurgia veterinária"
                    instructor={c.instructor?.name}
                    lessonsCount={c.total}
                    status="new"
                    thumbVariant={pickThumbVariant(c.id)}
                    thumbImageUrl={
                      c.thumbnailHorizontal ||
                      c.thumbnailVertical ||
                      c.thumbnail ||
                      undefined
                    }
                  />
                ))}
              </Section>
            )}

            {recentlyCompleted.length > 0 && (
              <Section
                title="Concluídos recentemente"
                hint="Sua trajetória até aqui"
                linkLabel="Ver histórico completo"
                linkHref="/student/completed"
              >
                {recentlyCompleted.slice(0, 4).map((c) => (
                  <AtlasCourseCard
                    key={c.id}
                    href={`/student/courses/${c.id}`}
                    title={c.title}
                    category="Cirurgia veterinária"
                    instructor={c.instructor?.name}
                    lessonsCount={c.total}
                    status="completed"
                    progressPercent={100}
                    lessonsProgress={`${c.total} / ${c.total}`}
                    completedAt={formatCompletedDate(c.completedAt)}
                    thumbVariant={pickThumbVariant(c.id)}
                    thumbImageUrl={
                      c.thumbnailHorizontal ||
                      c.thumbnailVertical ||
                      c.thumbnail ||
                      undefined
                    }
                  />
                ))}
              </Section>
            )}

            {inProgress.length === 0 &&
              awaitingStart.length === 0 &&
              recentlyCompleted.length === 0 &&
              available.length > 0 && (
                <Section
                  title="Comece por aqui"
                  hint="Você ainda não está matriculado em nenhum curso"
                  linkLabel="Ver catálogo completo"
                  linkHref="/student/courses"
                >
                  {available.slice(0, 4).map((c) => (
                    <AtlasCourseCard
                      key={c.id}
                      href={`/student/courses/${c.id}`}
                      title={c.title}
                      category="Cirurgia veterinária"
                      instructor={c.instructor?.name}
                      lessonsCount={c.totalVideos}
                      status="new"
                      thumbVariant={pickThumbVariant(c.id)}
                      thumbImageUrl={
                        c.thumbnailHorizontal ||
                        c.thumbnailVertical ||
                        c.thumbnail ||
                        undefined
                      }
                    />
                  ))}
                </Section>
              )}
          </>
        )}
      </div>
    </>
  );
}

function Section({
  title,
  hint,
  linkLabel,
  linkHref,
  children,
}: {
  title: string;
  hint?: string;
  linkLabel: string;
  linkHref: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4 mb-[14px]">
        <div className="min-w-0">
          <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink">
            {title}
          </h2>
          {hint && (
            <p className="text-xs text-atlas-muted mt-0.5">{hint}</p>
          )}
        </div>
        <Link
          href={linkHref}
          className="text-xs font-medium text-atlas-primary-2 hover:text-atlas-primary inline-flex items-center gap-1 shrink-0 self-start sm:self-auto"
        >
          {linkLabel}
          <ArrowRight className="size-3" strokeWidth={2} />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
        {children}
      </div>
    </section>
  );
}
