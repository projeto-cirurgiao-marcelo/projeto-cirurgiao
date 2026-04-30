'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  GraduationCap,
  Loader2,
  Activity,
  Plus,
  Edit,
  CheckCircle2,
  Award,
  PlayCircle,
} from 'lucide-react';
import { coursesService } from '@/lib/api/courses.service';
import { adminDashboardService } from '@/lib/api/admin-dashboard.service';
import { Course } from '@/lib/types/course.types';
import { AtlasButton, AtlasPageHeader } from '@/components/atlas';
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from '@/components/shared/page-transition';
import { EnrollmentsChart } from '@/components/admin/dashboard/enrollments-chart';
import type {
  ActivityItem,
  DashboardStats,
  EnrollmentsChartBucket,
  TopCourseItem,
} from '@/types/admin-dashboard.types';

import { logger } from '@/lib/logger';

type ChartGranularity = 'day' | 'week' | 'month';

const RELATIVE_TIME_THRESHOLDS: Array<{ limit: number; divisor: number; suffix: string }> = [
  { limit: 60_000, divisor: 1, suffix: '' },
  { limit: 3_600_000, divisor: 60_000, suffix: 'min atrás' },
  { limit: 86_400_000, divisor: 3_600_000, suffix: 'h atrás' },
  { limit: 604_800_000, divisor: 86_400_000, suffix: 'd atrás' },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'agora';
  for (const t of RELATIVE_TIME_THRESHOLDS) {
    if (diff < t.limit) return `${Math.floor(diff / t.divisor)} ${t.suffix}`;
  }
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

const ACTION_LABELS: Record<ActivityItem['action'], { verb: string; icon: typeof GraduationCap }> = {
  enrolled: { verb: 'matriculou-se em', icon: GraduationCap },
  completed_video: { verb: 'concluiu o vídeo', icon: PlayCircle },
  completed_quiz: { verb: 'finalizou o quiz', icon: Award },
  completed_course: { verb: 'completou o curso', icon: CheckCircle2 },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [chartBuckets, setChartBuckets] = useState<EnrollmentsChartBucket[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartGranularity, setChartGranularity] =
    useState<ChartGranularity>('month');
  const [topCourses, setTopCourses] = useState<TopCourseItem[]>([]);
  const [topCoursesLoading, setTopCoursesLoading] = useState(true);

  useEffect(() => {
    loadCourses();
    loadStats();
    loadActivity();
    loadTopCourses();
  }, []);

  useEffect(() => {
    loadChart(chartGranularity);
  }, [chartGranularity]);

  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await coursesService.findAll();
      setCourses(response.data || []);
    } catch (err) {
      logger.error('Erro ao carregar cursos:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const data = await adminDashboardService.getStats();
      setStats(data);
    } catch (err) {
      logger.error('Erro ao carregar stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      setActivityLoading(true);
      const data = await adminDashboardService.getActivity(10);
      setActivity(data);
    } catch (err) {
      logger.error('Erro ao carregar atividade:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadTopCourses = async () => {
    try {
      setTopCoursesLoading(true);
      const data = await adminDashboardService.getTopCourses(5);
      setTopCourses(data);
    } catch (err) {
      logger.error('Erro ao carregar top cursos:', err);
    } finally {
      setTopCoursesLoading(false);
    }
  };

  const loadChart = async (granularity: ChartGranularity) => {
    try {
      setChartLoading(true);
      const range = granularity === 'day' ? '30d' : granularity === 'week' ? '6m' : '6m';
      const data = await adminDashboardService.getEnrollmentsChart(
        range,
        granularity,
      );
      setChartBuckets(data.buckets);
    } catch (err) {
      logger.error('Erro ao carregar chart:', err);
      setChartBuckets([]);
    } finally {
      setChartLoading(false);
    }
  };

  const formatTrend = (pct: number | null): { value: number; label: string } | undefined => {
    if (pct === null) return undefined;
    return { value: pct, label: 'vs 30 dias' };
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-atlas-bg">
        <AtlasPageHeader
          metaLabel="ADMIN · OPERAÇÃO"
          title="Dashboard"
          titleEm={user?.name ? `· ${user.name}` : undefined}
        >
          <p className="text-[13px] text-atlas-muted">
            Resumo da plataforma. Acompanhe matrículas, cursos e atividade
            recente em um só lugar.
          </p>
        </AtlasPageHeader>

        <div className="px-5 sm:px-7 py-6 sm:py-8 mx-auto max-w-7xl space-y-6">
          {/* Stats Grid */}
          <StaggerContainer className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StaggerItem>
              <StatCard
                title="Total de Alunos"
                value={statsLoading ? '...' : (stats?.totalStudents ?? 0).toLocaleString()}
                icon={Users}
                trend={!statsLoading && stats ? formatTrend(stats.totalStudentsTrendPct) : undefined}
                color="primary"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Cursos Publicados"
                value={statsLoading ? '...' : (stats?.totalCourses ?? 0).toString()}
                icon={BookOpen}
                trend={!statsLoading && stats ? formatTrend(stats.totalCoursesTrendPct) : undefined}
                color="success"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Horas de Conteúdo"
                value={statsLoading ? '...' : `${stats?.totalHours ?? 0}h`}
                icon={Clock}
                trend={!statsLoading && stats ? formatTrend(stats.totalHoursTrendPct) : undefined}
                color="warning"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Taxa Média de Progresso"
                value={statsLoading ? '...' : `${Math.round(stats?.completionRate ?? 0)}%`}
                icon={TrendingUp}
                trend={!statsLoading && stats ? formatTrend(stats.completionRateTrendPct) : undefined}
                color="secondary"
              />
            </StaggerItem>
          </StaggerContainer>

          {/* Charts & Activity Row */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chart */}
            <div className="lg:col-span-3 bg-atlas-surface rounded-sm border border-atlas-line overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-atlas-line flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-serif text-[17px] font-medium tracking-[-0.01em] text-atlas-ink">
                    Matrículas
                  </h3>
                  <div className="atlas-caps text-atlas-muted-2 mt-0.5">
                    {chartGranularity === 'month' ? 'Últimos 6 meses' : chartGranularity === 'week' ? 'Últimos 6 meses (semanal)' : 'Últimos 30 dias'}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-atlas-surface-2 rounded-sm p-0.5">
                  {(['month', 'week', 'day'] as ChartGranularity[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setChartGranularity(g)}
                      className={
                        chartGranularity === g
                          ? 'px-2.5 py-1 rounded-sm text-[11.5px] font-medium bg-atlas-surface text-atlas-ink shadow-sm'
                          : 'px-2.5 py-1 rounded-sm text-[11.5px] font-medium text-atlas-muted hover:text-atlas-ink-2'
                      }
                    >
                      {g === 'month' ? 'Mensal' : g === 'week' ? 'Semanal' : 'Diário'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5 sm:p-6">
                {chartLoading ? (
                  <div className="h-48 md:h-64 flex items-center justify-center">
                    <Loader2 className="size-7 animate-spin text-atlas-primary" />
                  </div>
                ) : (
                  <EnrollmentsChart
                    buckets={chartBuckets}
                    granularity={chartGranularity}
                  />
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="lg:col-span-2 bg-atlas-surface rounded-sm border border-atlas-line overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-atlas-line flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-serif text-[17px] font-medium tracking-[-0.01em] text-atlas-ink">
                    Atividade Recente
                  </h3>
                  <div className="atlas-caps text-atlas-muted-2 mt-0.5">
                    Últimas ações
                  </div>
                </div>
                <Activity className="w-4 h-4 text-atlas-muted" strokeWidth={1.5} />
              </div>
              <div className="divide-y divide-atlas-line">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-atlas-primary" />
                  </div>
                ) : activity.length === 0 ? (
                  <div className="text-center py-12 px-5 text-[12.5px] text-atlas-muted-2">
                    Sem atividade recente.
                  </div>
                ) : (
                  activity.map((item) => {
                    const config = ACTION_LABELS[item.action];
                    const Icon = config.icon;
                    return (
                      <div
                        key={item.id}
                        className="px-5 sm:px-6 py-3.5 hover:bg-atlas-surface-2 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 size-8 rounded-sm bg-atlas-primary-soft flex items-center justify-center mt-0.5">
                            <Icon
                              className="size-4 text-atlas-primary"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-atlas-ink-2 leading-snug">
                              <span className="font-medium text-atlas-ink">
                                {item.user.name}
                              </span>{' '}
                              {config.verb}{' '}
                              <span className="font-medium text-atlas-primary">
                                {item.target.title}
                              </span>
                            </p>
                            <p className="text-[11.5px] text-atlas-muted-2 mt-0.5">
                              {formatRelativeTime(item.occurredAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Top Cursos */}
          <div className="bg-atlas-surface rounded-sm border border-atlas-line overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-atlas-line flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-serif text-[17px] font-medium tracking-[-0.01em] text-atlas-ink">
                  Top Cursos
                </h3>
                <div className="atlas-caps text-atlas-muted-2 mt-0.5">
                  Por número de matrículas
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/courses')}
                className="text-[12.5px] text-atlas-primary hover:text-atlas-primary-2 font-medium transition-colors"
              >
                Ver todos
              </button>
            </div>
            {topCoursesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-7 animate-spin text-atlas-primary" />
              </div>
            ) : topCourses.length === 0 ? (
              <div className="text-center py-12 px-5 text-[12.5px] text-atlas-muted-2">
                Nenhum curso com matrículas ainda.
              </div>
            ) : (
              <div className="divide-y divide-atlas-line">
                {topCourses.map((course, idx) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-4 px-5 sm:px-6 py-3.5 hover:bg-atlas-surface-2 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                  >
                    <div className="flex-shrink-0 size-7 rounded-sm bg-atlas-surface-2 border border-atlas-line flex items-center justify-center">
                      <span className="text-[11.5px] font-medium text-atlas-muted">
                        {idx + 1}
                      </span>
                    </div>
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="flex-shrink-0 w-16 h-10 rounded-sm object-cover border border-atlas-line"
                      />
                    ) : (
                      <div className="flex-shrink-0 w-16 h-10 rounded-sm bg-atlas-surface-2 border border-atlas-line flex items-center justify-center">
                        <BookOpen
                          className="size-4 text-atlas-muted-2"
                          strokeWidth={1.5}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-atlas-ink truncate">
                        {course.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11.5px] text-atlas-muted-2">
                          {course.enrollmentsCount}{' '}
                          {course.enrollmentsCount === 1
                            ? 'matrícula'
                            : 'matrículas'}
                        </span>
                        <span className="text-[11.5px] text-atlas-muted-2">·</span>
                        <span className="text-[11.5px] text-atlas-muted-2">
                          {course.completionsCount} concluído
                          {course.completionsCount !== 1 ? 's' : ''}
                        </span>
                        {!course.isPublished && (
                          <>
                            <span className="text-[11.5px] text-atlas-muted-2">·</span>
                            <span className="text-[11px] font-medium text-amber-700">
                              Rascunho
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-medium text-atlas-ink">
                          {Math.round(course.averageProgress)}%
                        </span>
                      </div>
                      <span className="text-[11px] text-atlas-muted-2">
                        progresso médio
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Courses Table */}
          <div className="bg-atlas-surface rounded-sm border border-atlas-line overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-atlas-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-[17px] font-medium tracking-[-0.01em] text-atlas-ink">
                  Cursos Cadastrados
                </h3>
                <div className="atlas-caps text-atlas-muted-2 mt-0.5">
                  {loadingCourses
                    ? 'Carregando...'
                    : `${courses.length} cursos na plataforma`}
                </div>
              </div>
              <AtlasButton
                variant="primary"
                size="sm"
                onClick={() => router.push('/admin/courses/new')}
              >
                <Plus className="size-3.5" />
                Novo Curso
              </AtlasButton>
            </div>

            {loadingCourses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-7 animate-spin text-atlas-primary" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12 px-5">
                <BookOpen
                  className="size-11 mx-auto mb-3 text-atlas-muted-2"
                  strokeWidth={1.5}
                />
                <p className="text-atlas-ink-2 font-medium text-[14px]">
                  Nenhum curso cadastrado
                </p>
                <p className="text-[12.5px] text-atlas-muted mt-1">
                  Comece criando seu primeiro curso
                </p>
                <div className="mt-4 flex justify-center">
                  <AtlasButton
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/admin/courses/new')}
                  >
                    <Plus className="size-3.5" />
                    Criar Primeiro Curso
                  </AtlasButton>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-atlas-surface-2">
                      <th className="px-3 md:px-6 py-3 text-left atlas-caps text-atlas-muted-2">
                        Curso
                      </th>
                      <th className="px-3 md:px-6 py-3 text-left atlas-caps text-atlas-muted-2">
                        Alunos
                      </th>
                      <th className="px-3 md:px-6 py-3 text-left atlas-caps text-atlas-muted-2">
                        Módulos
                      </th>
                      <th className="px-3 md:px-6 py-3 text-left atlas-caps text-atlas-muted-2">
                        Status
                      </th>
                      <th className="px-3 md:px-6 py-3 text-right atlas-caps text-atlas-muted-2">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-atlas-line">
                    {courses.map((course) => (
                      <tr
                        key={course.id}
                        className="hover:bg-atlas-surface-2 transition-colors"
                      >
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <p className="text-[13.5px] font-medium text-atlas-ink">
                            {course.title}
                          </p>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <span className="text-[13px] text-atlas-ink-2">
                            {course._count?.enrollments || 0}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <span className="text-[13px] text-atlas-ink-2">
                            {course._count?.modules || 0}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium ${
                              course.isPublished
                                ? 'bg-atlas-primary-soft text-atlas-primary-2 border border-atlas-primary/20'
                                : 'bg-atlas-surface-2 text-atlas-muted border border-atlas-line-strong'
                            }`}
                          >
                            {course.isPublished ? 'Publicado' : 'Rascunho'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                          <button
                            onClick={() =>
                              router.push(`/admin/courses/${course.id}/edit`)
                            }
                            className="inline-flex items-center gap-1 text-[12.5px] text-atlas-primary hover:text-atlas-primary-2 font-medium transition-colors"
                          >
                            <Edit className="size-3.5" strokeWidth={1.5} />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
