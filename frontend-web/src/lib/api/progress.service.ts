import { apiClient } from './client';

// Interfaces
export interface SaveProgressDto {
  videoId: string;
  watchTime: number;
  completed?: boolean;
}

export interface VideoProgress {
  id: string;
  userId: string;
  videoId: string;
  watched: boolean;
  watchedAt: string | null;
  watchTime: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoProgressItem {
  videoId: string;
  videoTitle: string;
  moduleId: string;
  moduleTitle: string;
  watched: boolean;
  completed: boolean;
  watchTime: number;
  videoDuration: number;
}

export interface CourseProgress {
  courseId: string;
  totalVideos: number;
  watchedVideos: number;
  completedVideos: number;
  totalWatchTime: number;
  progressPercentage: number;
  videos: VideoProgressItem[];
}

export interface UserProgressSummary {
  totalCourses: number;
  coursesInProgress: number;
  coursesCompleted: number;
  totalWatchTime: number;
}

/**
 * Serviço para gerenciar progresso de vídeos
 */
export const progressService = {
  /**
   * Salvar progresso de um vídeo
   */
  async saveProgress(data: SaveProgressDto): Promise<VideoProgress> {
    const response = await apiClient.post<VideoProgress>('/progress', data);
    return response.data;
  },

  /**
   * Buscar progresso de um vídeo específico
   */
  async getVideoProgress(videoId: string): Promise<VideoProgress | { watched: boolean; completed: boolean; watchTime: number }> {
    const response = await apiClient.get<VideoProgress>(`/progress/video/${videoId}`);
    return response.data;
  },

  /**
   * Buscar progresso de todos os vídeos de um curso
   */
  async getCourseProgress(courseId: string): Promise<CourseProgress> {
    const response = await apiClient.get<CourseProgress>(`/progress/course/${courseId}`);
    return response.data;
  },

  /**
   * Marcar vídeo como completo
   */
  async markAsCompleted(videoId: string): Promise<VideoProgress> {
    const response = await apiClient.post<VideoProgress>(`/progress/video/${videoId}/complete`);
    return response.data;
  },

  /**
   * Marcar vídeo como incompleto
   */
  async markAsIncomplete(videoId: string): Promise<VideoProgress> {
    const response = await apiClient.post<VideoProgress>(`/progress/video/${videoId}/incomplete`);
    return response.data;
  },

  /**
   * Obter resumo de progresso do usuário
   */
  async getUserProgressSummary(): Promise<UserProgressSummary> {
    const response = await apiClient.get<UserProgressSummary>('/progress/summary');
    return response.data;
  },

  /**
   * Buscar cursos em que o usuário está matriculado
   */
  async getEnrolledCourses(): Promise<EnrolledCourseWithProgress[]> {
    const response = await apiClient.get<EnrolledCourseWithProgress[]>('/progress/enrolled-courses');
    return response.data;
  },
};

export interface EnrolledCourseWithProgress {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  isPublished: boolean;
  price: number;
  instructor: {
    id: string;
    name: string;
  };
  modules: any[];
  enrollment: {
    id: string;
    enrolledAt: string;
    lastAccessAt: string;
    completedAt: string | null;
    progress: number;
  };
  progress: {
    totalVideos: number;
    watchedVideos: number;
    completedVideos: number;
    percentage: number;
  };
}
