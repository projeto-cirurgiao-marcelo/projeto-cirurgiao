'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import {
  progressService,
  EnrolledCourseWithProgress,
} from '@/lib/api/progress.service';
import { ArrowDownUp, Clock, ArrowRight } from 'lucide-react';
import {
  AtlasButton,
  AtlasCourseRow,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasSectionTabs,
  AtlasStatsInline,
  type AtlasCourseThumbVariant,
  type SectionTab,
} from '@/components/atlas';
import { logger } from '@/lib/logger';
import { getCourseWeightedPercent } from '@/lib/course-progress';

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

function formatLastAccess(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  try {
    const d = new Date(date);
    const months = [
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ];
    return `Acessado em ${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return undefined;
  }
}

function thumbLabel(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Curso';
  if (words.length === 1) return words[0];
  return words.slice(0, 2).join(' ');
}

const FOURTEEN_DAYS_MS = 14 * 24 * 3600 * 1000;

export default function InProgressPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [courses, setCourses] = useState<EnrolledCourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

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
    void loadInProgressCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, hasHydrated]);

  const loadInProgressCourses = async () => {
    try {
      const enrolledData = await progressService.getEnrolledCourses();

      const inProgress = enrolledData
        .filter(
          (course) =>
            getCourseWeightedPercent(course) > 0 &&
            course.progress.percentage < 100,
        )
        .sort((a, b) => {
          const dateA = new Date(
            a.enrollment.lastAccessAt || a.enrollment.enrolledAt,
          ).getTime();
          const dateB = new Date(
            b.enrollment.lastAccessAt || b.enrollment.enrolledAt,
          ).getTime();
          return dateB - dateA;
        });

      setCourses(inProgress);
    } catch (error) {
      logger.error('Erro ao carregar cursos em progresso:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = Date.now();

  const buckets = useMemo(() => {
    const recent: typeof courses = [];
    const almost: typeof courses = [];
    const paused: typeof courses = [];

    for (const c of courses) {
      const lastAccess = new Date(
        c.enrollment.lastAccessAt || c.enrollment.enrolledAt,
      ).getTime();
      const idle = now - lastAccess;

      if (getCourseWeightedPercent(c) >= 75) almost.push(c);
      if (idle <= 7 * 24 * 3600 * 1000) recent.push(c);
      if (idle >= FOURTEEN_DAYS_MS) paused.push(c);
    }
    return { recent, almost, paused };
  }, [courses, now]);

  const filtered = useMemo(() => {
    if (activeTab === 'recent') return buckets.recent;
    if (activeTab === 'almost') return buckets.almost;
    if (activeTab === 'paused') return buckets.paused;
    return courses;
  }, [activeTab, buckets, courses]);

  const totalLessons = courses.reduce(
    (sum, c) => sum + c.progress.totalVideos,
    0,
  );
  const watchedLessons = courses.reduce(
    (sum, c) => sum + c.progress.watchedVideos,
    0,
  );
  const avgProgress =
    courses.length === 0
      ? 0
      : Math.round(
          courses.reduce((sum, c) => sum + getCourseWeightedPercent(c), 0) /
            courses.length,
        );

  const tabs: SectionTab[] = [
    { id: 'all', label: 'Todos', count: courses.length },
    { id: 'recent', label: 'Recentes', count: buckets.recent.length },
    { id: 'almost', label: 'Quase lá', count: buckets.almost.length },
    { id: 'paused', label: 'Pausados', count: buckets.paused.length },
  ];

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
        metaLabel="Biblioteca · Acompanhamento"
        title="Em andamento"
        titleEm="— continue de onde parou"
        actions={
          <AtlasButton variant="outline" size="md">
            <ArrowDownUp strokeWidth={1.75} />
            Ordenar
          </AtlasButton>
        }
      >
        <AtlasStatsInline
          stats={[
            { value: String(courses.length), label: 'Cursos ativos' },
            {
              value: `${avgProgress}%`,
              format: 'mono',
              label: 'Progresso médio',
            },
            {
              value: String(watchedLessons),
              total: `/ ${totalLessons}`,
              label: 'Aulas assistidas',
            },
            {
              value: String(buckets.almost.length),
              label: 'Quase concluídos',
            },
          ]}
        />
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-5 sm:py-6">
        <AtlasSectionTabs
          tabs={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
        />

        {loading ? (
          <AtlasLoadingBar />
        ) : filtered.length === 0 ? (
          <AtlasEmptyState
            icon={Clock}
            title={
              activeTab === 'all'
                ? 'Nenhum curso em andamento'
                : 'Nada nesta categoria'
            }
            description={
              activeTab === 'all'
                ? 'Comece um curso para acompanhar seu progresso aqui.'
                : 'Mude para outra aba ou retome um curso novo.'
            }
            action={
              activeTab === 'all' ? (
                <AtlasButton
                  variant="primary"
                  size="md"
                  onClick={() => router.push('/student/courses')}
                >
                  Explorar catálogo
                  <ArrowRight strokeWidth={1.75} />
                </AtlasButton>
              ) : undefined
            }
          />
        ) : (
          <div className="bg-atlas-surface border border-atlas-line rounded-md overflow-hidden">
            {filtered.map((course) => (
              <AtlasCourseRow
                key={course.id}
                href={`/student/courses/${course.id}`}
                title={course.title}
                category="Cirurgia veterinária"
                instructor={course.instructor?.name}
                progressPercent={getCourseWeightedPercent(course)}
                lessonsProgress={`${course.progress.watchedVideos} / ${course.progress.totalVideos}`}
                lastMeta={formatLastAccess(course.enrollment.lastAccessAt)}
                thumbVariant={pickThumbVariant(course.id)}
                thumbLabel={thumbLabel(course.title)}
                thumbImageUrl={
                  course.thumbnailHorizontal ||
                  course.thumbnailVertical ||
                  course.thumbnail ||
                  undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
