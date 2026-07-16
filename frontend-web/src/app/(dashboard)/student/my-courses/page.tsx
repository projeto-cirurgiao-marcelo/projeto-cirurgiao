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

/**
 * Divisões fixas da home do aluno (pedido do dono, jul/2026).
 * Matching por título de curso — se renomearem cursos no admin, atualizar
 * aqui (upgrade path: campo `category` no Course).
 * "Treinamentos Premium" agrupa visualmente dentro de "Tecidos moles";
 * cursos sem match (ex: Pós-graduação, Ciclo Avançado) ficam fora da home
 * (seguem acessíveis via busca/URL direta).
 */
const HOME_DIVISIONS: { title: string; match: RegExp }[] = [
  { title: 'Comece por aqui', match: /comece por aqui/i },
  { title: 'Posicionamento e atração', match: /posicionamento/i },
  { title: 'Tecidos moles', match: /tecidos moles|treinamentos premium/i },
  { title: 'Ortopedia e Neurocirurgia', match: /ortopedia|neurocirurgia/i },
];

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
  // Ordem oficial do catálogo (Course.position) — ordena os cards nas divisões
  const [catalogIds, setCatalogIds] = useState<string[]>([]);
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
      setCatalogIds(allCoursesArray.map((c) => c.id));

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

  const completedCountMemo = useMemo(
    () => enrolled.filter((c) => c.status === 'completed').length,
    [enrolled],
  );

  // Divisões fixas: todos os cursos (matriculado ou não) em ordem de catálogo,
  // agrupados por HOME_DIVISIONS. Matriculados mostram progresso; novos, badge.
  const divisions = useMemo(() => {
    const rowById = new Map<string, EnrolledCourseRow | NewCourseRow>();
    enrolled.forEach((r) => rowById.set(r.id, r));
    available.forEach((r) => {
      if (!rowById.has(r.id)) rowById.set(r.id, r);
    });
    const ordered = catalogIds
      .map((id) => rowById.get(id))
      .filter((r): r is EnrolledCourseRow | NewCourseRow => !!r);
    return HOME_DIVISIONS.map((d) => ({
      title: d.title,
      rows: ordered.filter((r) => d.match.test(r.title)),
    })).filter((d) => d.rows.length > 0);
  }, [enrolled, available, catalogIds]);

  if (!hasHydrated || !user) {
    return (
      <main className="px-7 py-7">
        <AtlasLoadingBar />
      </main>
    );
  }

  const enrolledCount = enrolled.length;
  const inProgressCount = inProgress.length;
  const completedCount = completedCountMemo;
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
              >
                {inProgress.slice(0, 3).map((c) => (
                  <CourseRowCard key={c.id} row={c} />
                ))}
              </Section>
            )}

            {divisions.map((d) => (
              <Section key={d.title} title={d.title}>
                {d.rows.map((r) => (
                  <CourseRowCard key={r.id} row={r} />
                ))}
              </Section>
            ))}
          </>
        )}
      </div>
    </>
  );
}

/** Card unificado — linha matriculada (com progresso) ou curso novo */
function CourseRowCard({ row }: { row: EnrolledCourseRow | NewCourseRow }) {
  const thumbImageUrl =
    row.thumbnailHorizontal || row.thumbnailVertical || row.thumbnail || undefined;

  if (row.kind === 'enrolled') {
    return (
      <AtlasCourseCard
        href={`/student/courses/${row.id}`}
        title={row.title}
        category="Cirurgia veterinária"
        instructor={row.instructor?.name}
        lessonsCount={row.total}
        status={row.status}
        progressPercent={row.status === 'completed' ? 100 : row.progressPercent}
        lessonsProgress={
          row.status === 'new' ? undefined : `${row.watched} / ${row.total}`
        }
        completedAt={
          row.status === 'completed'
            ? formatCompletedDate(row.completedAt)
            : undefined
        }
        thumbVariant={pickThumbVariant(row.id)}
        thumbImageUrl={thumbImageUrl}
      />
    );
  }

  return (
    <AtlasCourseCard
      href={`/student/courses/${row.id}`}
      title={row.title}
      category="Cirurgia veterinária"
      instructor={row.instructor?.name}
      lessonsCount={row.totalVideos}
      status="new"
      thumbVariant={pickThumbVariant(row.id)}
      thumbImageUrl={thumbImageUrl}
    />
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
  /** Opcional — a home do aluno não usa links de catálogo (pedido do dono) */
  linkLabel?: string;
  linkHref?: string;
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
        {linkLabel && linkHref && (
          <Link
            href={linkHref}
            className="text-xs font-medium text-atlas-primary-2 hover:text-atlas-primary inline-flex items-center gap-1 shrink-0 self-start sm:self-auto"
          >
            {linkLabel}
            <ArrowRight className="size-3" strokeWidth={2} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
        {children}
      </div>
    </section>
  );
}
