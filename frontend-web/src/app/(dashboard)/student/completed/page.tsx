'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import {
  progressService,
  EnrolledCourseWithProgress,
} from '@/lib/api/progress.service';
import { Award, ArrowRight, FileDown } from 'lucide-react';
import {
  AtlasButton,
  AtlasCompletionStrip,
  AtlasCourseCard,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasSkeletonCard,
  AtlasStatsInline,
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
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return undefined;
  }
}

const RECOGNITION_DISMISS_KEY = 'atlas:completed:recognition-dismissed-at';

export default function CompletedPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [courses, setCourses] = useState<EnrolledCourseWithProgress[]>([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recognitionDismissed, setRecognitionDismissed] = useState(false);

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

    if (typeof window !== 'undefined') {
      const dismissedAt = window.localStorage.getItem(RECOGNITION_DISMISS_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < 7 * 24 * 3600 * 1000) {
          setRecognitionDismissed(true);
        }
      }
    }

    void loadCompletedCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, hasHydrated]);

  const loadCompletedCourses = async () => {
    try {
      const enrolledData = await progressService.getEnrolledCourses();
      setEnrolledCount(enrolledData.length);
      const completed = enrolledData
        .filter((course) => course.progress.percentage === 100)
        .sort((a, b) => {
          const dateA = new Date(
            a.enrollment.completedAt ||
              a.enrollment.lastAccessAt ||
              a.enrollment.enrolledAt,
          ).getTime();
          const dateB = new Date(
            b.enrollment.completedAt ||
              b.enrollment.lastAccessAt ||
              b.enrollment.enrolledAt,
          ).getTime();
          return dateB - dateA;
        });
      setCourses(completed);
    } catch (error) {
      logger.error('Erro ao carregar cursos concluídos:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalLessons = useMemo(
    () => courses.reduce((sum, c) => sum + c.progress.totalVideos, 0),
    [courses],
  );

  const completionRate =
    enrolledCount === 0
      ? 0
      : Math.round((courses.length / enrolledCount) * 100);

  const dismissRecognition = () => {
    setRecognitionDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        RECOGNITION_DISMISS_KEY,
        String(Date.now()),
      );
    }
  };

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
        metaLabel="Biblioteca · Histórico"
        title="Concluídos"
        titleEm="— sua trajetória até aqui"
        actions={
          courses.length > 0 ? (
            <AtlasButton variant="outline" size="md">
              <FileDown strokeWidth={1.75} />
              Exportar certificados
            </AtlasButton>
          ) : undefined
        }
      >
        <AtlasStatsInline
          stats={[
            {
              value: String(courses.length),
              total: enrolledCount > 0 ? `/ ${enrolledCount}` : undefined,
              label: 'Cursos concluídos',
            },
            { value: String(totalLessons), label: 'Aulas finalizadas' },
            {
              value: `${completionRate}%`,
              format: 'mono',
              label: 'Taxa de conclusão',
            },
            {
              value: String(courses.length),
              label: 'Certificados emitidos',
            },
          ]}
        />
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-5 sm:py-6">
        {courses.length > 0 && !recognitionDismissed && (
          <AtlasCompletionStrip
            title={`Boa! Você concluiu ${courses.length} ${
              courses.length === 1 ? 'curso' : 'cursos'
            }.`}
            description="Os certificados ficam disponíveis para download por tempo indeterminado em cada curso."
            onDismiss={dismissRecognition}
          />
        )}

        {loading ? (
          <>
            <AtlasLoadingBar className="mb-[18px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <AtlasSkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : courses.length === 0 ? (
          <AtlasEmptyState
            icon={Award}
            title="Nenhum curso concluído ainda"
            description="Conclua um curso para vê-lo aqui e acessar o certificado em PDF."
            action={
              <AtlasButton
                variant="primary"
                size="md"
                onClick={() => router.push('/student/in-progress')}
              >
                Ver cursos em andamento
                <ArrowRight strokeWidth={1.75} />
              </AtlasButton>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
            {courses.map((course) => (
              <AtlasCourseCard
                key={course.id}
                href={`/student/courses/${course.id}`}
                title={course.title}
                category="Cirurgia veterinária"
                instructor={course.instructor?.name}
                lessonsCount={course.progress.totalVideos}
                status="completed"
                progressPercent={100}
                lessonsProgress={`${course.progress.totalVideos} / ${course.progress.totalVideos}`}
                completedAt={formatCompletedDate(course.enrollment.completedAt)}
                thumbVariant={pickThumbVariant(course.id)}
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
