'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { getCourseWeightedPercent } from '@/lib/course-progress';
import {
  progressService,
  EnrolledCourseWithProgress,
} from '@/lib/api/progress.service';
import { BookOpen } from 'lucide-react';
import { Course } from '@/lib/types/course.types';
import {
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
const HOME_DIVISIONS: {
  title: string;
  match: RegExp;
  href: string;
  /** Prioridade de qual curso empresta a arte do card de área —
      sem isso, a ordem de catálogo escolhia a imagem errada
      (ex: banner do Treinamentos Premium no card Tecidos Moles) */
  thumbFrom: RegExp[];
}[] = [
  {
    title: 'Posicionamento e atração',
    match: /posicionamento/i,
    href: '/student/areas/posicionamento-atracao',
    thumbFrom: [/posicionamento/i],
  },
  {
    title: 'Tecidos Moles',
    match: /tecidos moles|treinamentos premium/i,
    href: '/student/areas/tecidos-moles',
    thumbFrom: [/^tecidos\s+moles\s+na\s+pr[aá]tica/i, /aprofundamento\s+tecidos/i],
  },
  {
    title: 'Ortopedia e Neurocirurgia',
    match: /ortopedia|neurocirurgia/i,
    href: '/student/areas/ortopedia-neurocirurgia',
    thumbFrom: [/aprofundamento\s+ortopedia/i, /^neurocirurgia/i, /^ortopedia/i],
  },
];

const THUMB_VARIANTS: AtlasCourseThumbVariant[] = [
  'default',
  'alt',
  'alt2',
  'alt3',
  'alt4',
];

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
    return HOME_DIVISIONS.map((d) => {
      const rows = ordered.filter((r) => d.match.test(r.title));
      const rowThumb = (r: (typeof rows)[number]) =>
        r.thumbnailHorizontal || r.thumbnailVertical || r.thumbnail;
      // Arte do card: segue a prioridade thumbFrom; fallback = qualquer curso da divisão
      const preferred = d.thumbFrom
        .map((re) => rows.find((r) => re.test(r.title) && rowThumb(r)))
        .find(Boolean);
      const thumbImageUrl =
        (preferred && rowThumb(preferred)) ||
        rows.map(rowThumb).find(Boolean) ||
        undefined;
      return { title: d.title, href: d.href, rows, thumbImageUrl };
    }).filter((d) => d.rows.length > 0);
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
            {/* Home enxuta (pedido do dono): só os 3 cards de área, lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] sm:gap-[18px]">
              {divisions.map((d, i) => (
                <AtlasCourseCard
                  key={d.title}
                  href={d.href}
                  title={d.title}
                  category="Área completa"
                  lessonsCount={d.rows.reduce(
                    (sum, r) =>
                      sum + (r.kind === 'enrolled' ? r.total : r.totalVideos),
                    0,
                  )}
                  status="new"
                  thumbVariant={THUMB_VARIANTS[i % THUMB_VARIANTS.length]}
                  thumbImageUrl={d.thumbImageUrl}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
