import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  ActivityItem,
  DashboardStatsResponse,
  EnrollmentsChartBucket,
  EnrollmentsChartResponse,
  TopCourseItem,
} from './dto/dashboard-stats.dto';

const TTL = {
  STATS_MS: 5 * 60_000,
  ACTIVITY_MS: 30_000,
  CHART_MS: 15 * 60_000,
  TOP_COURSES_MS: 5 * 60_000,
} as const;

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private async withCache<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
  ): Promise<{ value: T; cacheHit: boolean }> {
    const hit = await this.cache.get<T>(key);
    if (hit !== undefined && hit !== null) {
      return { value: hit, cacheHit: true };
    }
    const value = await fetcher();
    await this.cache.set(key, value, ttlMs);
    return { value, cacheHit: false };
  }

  /**
   * Retorna métricas agregadas + trends (% vs 30 dias atrás).
   * Cache TTL 5min em memória — fase 3 do plano substituirá por DashboardSnapshot.
   */
  async getStats(): Promise<DashboardStatsResponse> {
    const { value, cacheHit } = await this.withCache(
      'admin:dashboard:stats',
      TTL.STATS_MS,
      () => this.computeStats(),
    );
    return { ...value, cacheHit };
  }

  private async computeStats(): Promise<DashboardStatsResponse> {
    const now = new Date();
    const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      totalStudentsBefore,
      totalCourses,
      totalCoursesBefore,
      totalDurationRow,
      totalDurationBeforeRow,
      completionRate,
      completionRateBefore,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: 'STUDENT' },
      }),
      this.prisma.user.count({
        where: { role: 'STUDENT', createdAt: { lt: cutoff30d } },
      }),
      this.prisma.course.count({
        where: { isPublished: true },
      }),
      this.prisma.course.count({
        where: { isPublished: true, createdAt: { lt: cutoff30d } },
      }),
      this.prisma.video.aggregate({
        _sum: { duration: true },
        where: { isPublished: true },
      }),
      this.prisma.video.aggregate({
        _sum: { duration: true },
        where: { isPublished: true, createdAt: { lt: cutoff30d } },
      }),
      this.computeCompletionRate(undefined),
      this.computeCompletionRate(cutoff30d),
    ]);

    const totalHours = Math.round(
      (totalDurationRow._sum.duration ?? 0) / 3600,
    );
    const totalHoursBefore = Math.round(
      (totalDurationBeforeRow._sum.duration ?? 0) / 3600,
    );

    return {
      totalStudents,
      totalStudentsTrendPct: pctTrend(totalStudentsBefore, totalStudents),
      totalCourses,
      totalCoursesTrendPct: pctTrend(totalCoursesBefore, totalCourses),
      totalHours,
      totalHoursTrendPct: pctTrend(totalHoursBefore, totalHours),
      completionRate: round(completionRate, 1),
      completionRateTrendPct: pctTrend(completionRateBefore, completionRate),
      generatedAt: now.toISOString(),
      cacheHit: false,
    };
  }

  /**
   * Feed de atividade recente unindo enrollments + progress + quiz attempts.
   * Cache TTL 30s — eventos são quase real-time.
   */
  async getActivity(limit: number): Promise<ActivityItem[]> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const { value } = await this.withCache(
      `admin:dashboard:activity:${safeLimit}`,
      TTL.ACTIVITY_MS,
      () => this.computeActivity(safeLimit),
    );
    return value;
  }

  private async computeActivity(safeLimit: number): Promise<ActivityItem[]> {
    type ActivityRow = {
      kind: 'enrolled' | 'completed_video' | 'completed_quiz' | 'completed_course';
      occurred_at: Date;
      user_id: string;
      user_name: string;
      target_id: string;
      target_title: string;
    };

    const rows = await this.prisma.$queryRaw<ActivityRow[]>`
      (
        SELECT
          'enrolled' AS kind,
          e."enrolledAt" AS occurred_at,
          u.id AS user_id,
          u.name AS user_name,
          c.id AS target_id,
          c.title AS target_title
        FROM enrollments e
        JOIN users u ON u.id = e."userId"
        JOIN courses c ON c.id = e."courseId"
      )
      UNION ALL
      (
        SELECT
          'completed_course' AS kind,
          e."completedAt" AS occurred_at,
          u.id AS user_id,
          u.name AS user_name,
          c.id AS target_id,
          c.title AS target_title
        FROM enrollments e
        JOIN users u ON u.id = e."userId"
        JOIN courses c ON c.id = e."courseId"
        WHERE e."completedAt" IS NOT NULL
      )
      UNION ALL
      (
        SELECT
          'completed_video' AS kind,
          p."completedAt" AS occurred_at,
          u.id AS user_id,
          u.name AS user_name,
          v.id AS target_id,
          v.title AS target_title
        FROM video_progress p
        JOIN users u ON u.id = p."userId"
        JOIN videos v ON v.id = p."videoId"
        WHERE p.completed = true AND p."completedAt" IS NOT NULL
      )
      UNION ALL
      (
        SELECT
          'completed_quiz' AS kind,
          qa."completedAt" AS occurred_at,
          u.id AS user_id,
          u.name AS user_name,
          q.id AS target_id,
          q.title AS target_title
        FROM quiz_attempts qa
        JOIN users u ON u.id = qa."userId"
        JOIN quizzes q ON q.id = qa."quizId"
      )
      ORDER BY occurred_at DESC
      LIMIT ${safeLimit};
    `;

    return rows.map((row) => ({
      id: `${row.kind}:${row.user_id}:${row.target_id}:${row.occurred_at.toISOString()}`,
      user: { id: row.user_id, name: row.user_name, avatarUrl: null },
      action: row.kind,
      target: {
        type:
          row.kind === 'completed_video'
            ? 'video'
            : row.kind === 'completed_quiz'
              ? 'quiz'
              : 'course',
        id: row.target_id,
        title: row.target_title,
      },
      occurredAt: row.occurred_at.toISOString(),
    }));
  }

  /**
   * Buckets temporais de matrículas (e completions) pra chart.
   * range: 7d | 30d | 6m | 1y; granularity: day | week | month.
   * Cache TTL 15min — buckets agregados são estáveis.
   */
  async getEnrollmentsChart(
    range: string,
    granularity: string,
  ): Promise<EnrollmentsChartResponse> {
    const safeRange = ['7d', '30d', '6m', '1y'].includes(range) ? range : '6m';
    const safeGranularity = ['day', 'week', 'month'].includes(granularity)
      ? granularity
      : 'month';

    const { value } = await this.withCache(
      `admin:dashboard:chart:${safeRange}:${safeGranularity}`,
      TTL.CHART_MS,
      () => this.computeChart(safeRange, safeGranularity),
    );
    return value;
  }

  private async computeChart(
    safeRange: string,
    safeGranularity: string,
  ): Promise<EnrollmentsChartResponse> {
    const intervalMap: Record<string, string> = {
      '7d': '7 days',
      '30d': '30 days',
      '6m': '6 months',
      '1y': '1 year',
    };

    type BucketRow = { period: Date; enrollments: bigint; completions: bigint };

    const interval = intervalMap[safeRange];
    const trunc = safeGranularity;

    const rows = await this.prisma.$queryRawUnsafe<BucketRow[]>(`
      SELECT
        DATE_TRUNC('${trunc}', "enrolledAt") AS period,
        COUNT(*) AS enrollments,
        COUNT(*) FILTER (WHERE "completedAt" IS NOT NULL) AS completions
      FROM enrollments
      WHERE "enrolledAt" >= NOW() - INTERVAL '${interval}'
      GROUP BY period
      ORDER BY period ASC;
    `);

    const buckets: EnrollmentsChartBucket[] = rows.map((row) => ({
      period: row.period.toISOString(),
      enrollments: Number(row.enrollments),
      completions: Number(row.completions),
    }));

    return { buckets, range: safeRange, granularity: safeGranularity };
  }

  /**
   * Top N cursos por número de matrículas (com completions e progresso médio).
   * Cache TTL 5min.
   */
  async getTopCourses(limit: number): Promise<TopCourseItem[]> {
    const safeLimit = Math.min(Math.max(1, limit), 20);
    const { value } = await this.withCache(
      `admin:dashboard:top-courses:${safeLimit}`,
      TTL.TOP_COURSES_MS,
      () => this.computeTopCourses(safeLimit),
    );
    return value;
  }

  private async computeTopCourses(safeLimit: number): Promise<TopCourseItem[]> {
    type Row = {
      id: string;
      title: string;
      thumbnail: string | null;
      thumbnail_horizontal: string | null;
      is_published: boolean;
      enrollments_count: bigint;
      completions_count: bigint;
      avg_progress: number | null;
    };

    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        c.id,
        c.title,
        c.thumbnail,
        c."thumbnailHorizontal" AS thumbnail_horizontal,
        c."isPublished" AS is_published,
        COUNT(e.id) AS enrollments_count,
        COUNT(e.id) FILTER (WHERE e."completedAt" IS NOT NULL) AS completions_count,
        AVG(e.progress)::float AS avg_progress
      FROM courses c
      LEFT JOIN enrollments e ON e."courseId" = c.id
      GROUP BY c.id
      ORDER BY enrollments_count DESC, c."createdAt" DESC
      LIMIT ${safeLimit};
    `;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      thumbnailUrl: row.thumbnail_horizontal ?? row.thumbnail ?? null,
      enrollmentsCount: Number(row.enrollments_count),
      completionsCount: Number(row.completions_count),
      averageProgress: round(row.avg_progress ?? 0, 1),
      isPublished: row.is_published,
    }));
  }

  /**
   * Calcula a média % de progresso entre enrollments criadas até `until`.
   * Quando until=undefined, considera todas as enrollments existentes.
   * Retorna 0 quando não há enrollments.
   */
  private async computeCompletionRate(until?: Date): Promise<number> {
    const where = until ? { enrolledAt: { lt: until } } : {};
    const result = await this.prisma.enrollment.aggregate({
      _avg: { progress: true },
      where,
    });
    return result._avg.progress ?? 0;
  }
}

function pctTrend(before: number, after: number): number | null {
  if (before === 0) return after === 0 ? 0 : null;
  return round(((after - before) / before) * 100, 1);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
