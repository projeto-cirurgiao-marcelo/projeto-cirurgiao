export interface DashboardStatsResponse {
  totalStudents: number;
  totalStudentsTrendPct: number | null;
  totalCourses: number;
  totalCoursesTrendPct: number | null;
  totalHours: number;
  totalHoursTrendPct: number | null;
  completionRate: number;
  completionRateTrendPct: number | null;
  generatedAt: string;
  cacheHit: boolean;
}

export interface ActivityItem {
  id: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  action:
    | 'enrolled'
    | 'completed_video'
    | 'completed_quiz'
    | 'completed_course';
  target: { type: 'course' | 'video' | 'quiz'; id: string; title: string };
  occurredAt: string;
}

export interface EnrollmentsChartBucket {
  period: string;
  enrollments: number;
  completions: number;
}

export interface EnrollmentsChartResponse {
  buckets: EnrollmentsChartBucket[];
  range: string;
  granularity: string;
}

export interface TopCourseItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  enrollmentsCount: number;
  completionsCount: number;
  averageProgress: number;
  isPublished: boolean;
}
