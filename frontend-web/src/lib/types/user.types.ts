export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentEnrollmentInfo {
  courseId: string;
  courseTitle: string;
  progress: number;
  lastAccessAt: string | null;
}

export interface StudentWithStats extends User {
  enrollmentCount: number;
  averageProgress: number;
  lastAccessAt: string | null;
  enrollments: StudentEnrollmentInfo[];
}

export interface StudentsOverviewStats {
  totalStudents: number;
  activeStudents30d: number;
  averageProgress: number;
  newStudents30d: number;
}

export interface TopCourseInfo {
  courseId: string;
  title: string;
  enrollmentCount: number;
}

export interface RecentStudent {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface StudentsOverviewResponse {
  stats: StudentsOverviewStats;
  students: StudentWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  recentStudents: RecentStudent[];
  topCourses: TopCourseInfo[];
}

export interface StudentEnrollmentDetail {
  id: string;
  courseId: string;
  courseTitle: string;
  courseDescription: string | null;
  courseThumbnail: string | null;
  courseModules: number;
  courseVideos: number;
  progress: number;
  lastAccessAt: string | null;
  enrolledAt: string;
}

export interface StudentQuizResult {
  id: string;
  quizTitle: string;
  videoTitle: string | null;
  moduleTitle: string | null;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  attemptedAt: string;
}

export interface StudentDetailResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  enrollmentCount: number;
  averageProgress: number;
  lastAccessAt: string | null;
  quizAverageScore: number | null;
  totalQuizAttempts: number;
  enrollments: StudentEnrollmentDetail[];
  recentQuizzes: StudentQuizResult[];
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}
