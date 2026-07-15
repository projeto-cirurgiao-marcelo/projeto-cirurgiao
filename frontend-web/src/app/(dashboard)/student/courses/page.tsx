'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import { progressService } from '@/lib/api/progress.service';
import { getCourseWeightedPercent } from '@/lib/course-progress';
import { Library, Search, Filter, ArrowDownUp } from 'lucide-react';
import { Course } from '@/lib/types/course.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AtlasButton,
  AtlasCourseCard,
  AtlasEmptyState,
  AtlasFiltersRow,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasSkeletonCard,
  AtlasStatsInline,
  type AtlasCourseStatus,
  type AtlasCourseThumbVariant,
  type FilterChip,
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

function formatDuration(totalSeconds: number): string | undefined {
  if (!totalSeconds || totalSeconds <= 0) return undefined;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

interface CourseRow extends Course {
  enrollment: {
    id: string;
    enrolledAt: string;
    lastAccessedAt: string | null;
    completedAt: string | null;
    progress: number;
  } | null;
  progress: {
    totalVideos: number;
    watchedVideos: number;
    percentage: number;
  };
}

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'Todos' },
  { id: 'enrolled', label: 'Matriculados' },
  { id: 'available', label: 'Disponíveis' },
];

type StatusFilter = 'all' | 'in-progress' | 'completed' | 'not-started';
type SortBy = 'default' | 'title' | 'lessons' | 'progress';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'in-progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'not-started', label: 'Não iniciados' },
];

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'default', label: 'Ordem do catálogo' },
  { value: 'title', label: 'Título (A–Z)' },
  { value: 'lessons', label: 'Mais aulas' },
  { value: 'progress', label: 'Maior progresso' },
];

function courseStatus(course: CourseRow): StatusFilter {
  if (course.enrollment === null) return 'not-started';
  if (course.enrollment.completedAt || course.progress.percentage >= 100) {
    return 'completed';
  }
  return 'in-progress';
}

export default function CoursesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [allCourses, setAllCourses] = useState<CourseRow[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChip, setActiveChip] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('default');

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

      const allCoursesArray = Array.isArray(allCoursesData)
        ? allCoursesData
        : (allCoursesData as any).data || [];

      const enrolledMap = new Map(
        (enrolledData as any[]).map((c: any) => [c.id, c]),
      );
      const enrolledIdsSet = new Set<string>(
        Array.from(enrolledMap.keys()) as string[],
      );
      setEnrolledIds(enrolledIdsSet);

      const rows: CourseRow[] = allCoursesArray.map((course: Course) => {
        const enrolledCourse = enrolledMap.get(course.id);
        const isEnrolled = !!enrolledCourse;

        const totalVideos =
          course.modules?.reduce(
            (sum: number, m: any) => sum + (m.videos?.length || 0),
            0,
          ) || 0;

        return {
          ...course,
          enrollment:
            isEnrolled && enrolledCourse
              ? {
                  id: enrolledCourse.enrollment.id,
                  enrolledAt: enrolledCourse.enrollment.enrolledAt,
                  lastAccessedAt: enrolledCourse.enrollment.lastAccessAt,
                  completedAt: enrolledCourse.enrollment.completedAt,
                  progress: enrolledCourse.progress.percentage,
                }
              : null,
          progress:
            isEnrolled && enrolledCourse
              ? {
                  totalVideos: enrolledCourse.progress.totalVideos,
                  watchedVideos: enrolledCourse.progress.watchedVideos,
                  percentage: enrolledCourse.progress.percentage,
                  weightedPercentage: enrolledCourse.progress.weightedPercentage,
                }
              : {
                  totalVideos,
                  watchedVideos: 0,
                  percentage: 0,
                },
        };
      });

      setAllCourses(rows);
    } catch (error) {
      logger.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrolledCount = enrolledIds.size;
  const availableCount = Math.max(0, allCourses.length - enrolledCount);

  const filteredCourses = useMemo(() => {
    let list = allCourses;

    if (activeChip === 'enrolled') {
      list = list.filter((c) => c.enrollment !== null);
    } else if (activeChip === 'available') {
      list = list.filter((c) => c.enrollment === null);
    }

    if (statusFilter !== 'all') {
      list = list.filter((c) => courseStatus(c) === statusFilter);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term),
      );
    }

    if (sortBy !== 'default') {
      list = [...list].sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title, 'pt-BR');
          case 'lessons':
            return b.progress.totalVideos - a.progress.totalVideos;
          case 'progress':
            return getCourseWeightedPercent(b) - getCourseWeightedPercent(a);
        }
      });
    }

    return list;
  }, [allCourses, activeChip, searchTerm, statusFilter, sortBy]);

  const chips: FilterChip[] = useMemo(
    () => [
      { id: 'all', label: 'Todos', count: allCourses.length },
      { id: 'enrolled', label: 'Matriculados', count: enrolledCount },
      { id: 'available', label: 'Disponíveis', count: availableCount },
    ],
    [allCourses.length, enrolledCount, availableCount],
  );

  if (!hasHydrated || !user) {
    return (
      <main className="px-7 py-7">
        <AtlasLoadingBar />
      </main>
    );
  }

  return (
    <>
      <AtlasPageHeader
        metaLabel="Biblioteca · Catálogo"
        title="Todos os"
        titleEm="cursos disponíveis"
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AtlasButton
                  variant={statusFilter !== 'all' ? 'primary' : 'outline'}
                  size="md"
                >
                  <Filter strokeWidth={1.75} />
                  {statusFilter === 'all'
                    ? 'Filtros'
                    : STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
                </AtlasButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem key={o.value} value={o.value}>
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AtlasButton
                  variant={sortBy !== 'default' ? 'primary' : 'outline'}
                  size="md"
                >
                  <ArrowDownUp strokeWidth={1.75} />
                  {sortBy === 'default'
                    ? 'Ordenar'
                    : SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </AtlasButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortBy)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem key={o.value} value={o.value}>
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <AtlasStatsInline
          stats={[
            { value: String(allCourses.length), label: 'Cursos disponíveis' },
            {
              value: String(enrolledCount),
              total: `/ ${allCourses.length}`,
              label: 'Matriculados',
            },
            { value: String(availableCount), label: 'Não iniciados' },
            {
              value: '100%',
              format: 'mono',
              label: 'Acesso ao catálogo',
            },
          ]}
        />
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-5 sm:py-6">
        <AtlasFiltersRow
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar curso por título ou descrição..."
          chips={chips}
          activeChipId={activeChip}
          onChipClick={setActiveChip}
        />

        {loading ? (
          <>
            <AtlasLoadingBar className="mb-[18px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
              {Array.from({ length: 8 }).map((_, i) => (
                <AtlasSkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : filteredCourses.length === 0 ? (
          (() => {
            const hasActiveFilter =
              searchTerm.trim() !== '' ||
              statusFilter !== 'all' ||
              activeChip !== 'all';
            return (
              <AtlasEmptyState
                icon={hasActiveFilter ? Search : Library}
                title={
                  hasActiveFilter
                    ? 'Nenhum curso encontrado'
                    : 'Nenhum curso disponível'
                }
                description={
                  hasActiveFilter
                    ? 'Nenhum curso corresponde aos filtros atuais. Ajuste a busca ou os filtros.'
                    : 'Novos cursos serão adicionados em breve.'
                }
                action={
                  hasActiveFilter ? (
                    <AtlasButton
                      variant="outline"
                      size="md"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setActiveChip('all');
                      }}
                    >
                      Limpar filtros
                    </AtlasButton>
                  ) : undefined
                }
              />
            );
          })()
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
            {filteredCourses.map((course) => {
              const status: AtlasCourseStatus =
                course.enrollment === null
                  ? 'new'
                  : course.enrollment.completedAt ||
                      course.progress.percentage >= 100
                    ? 'completed'
                    : 'in-progress';

              const totalSeconds =
                course.modules?.reduce(
                  (sum, m: any) =>
                    sum +
                    (m.videos?.reduce(
                      (vsum: number, v: any) => vsum + (v.duration || 0),
                      0,
                    ) || 0),
                  0,
                ) || 0;

              return (
                <AtlasCourseCard
                  key={course.id}
                  href={`/student/courses/${course.id}`}
                  title={course.title}
                  category="Cirurgia veterinária"
                  instructor={course.instructor?.name}
                  lessonsCount={course.progress.totalVideos}
                  totalDuration={formatDuration(totalSeconds)}
                  status={status}
                  progressPercent={
                    status === 'new'
                      ? undefined
                      : getCourseWeightedPercent(course)
                  }
                  lessonsProgress={
                    status === 'new'
                      ? undefined
                      : `${course.progress.watchedVideos} / ${course.progress.totalVideos}`
                  }
                  thumbVariant={pickThumbVariant(course.id)}
                  thumbImageUrl={
                    course.thumbnailHorizontal ||
                    course.thumbnailVertical ||
                    course.thumbnail ||
                    undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
