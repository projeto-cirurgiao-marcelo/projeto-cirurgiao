/**
 * Tipos relacionados à área do aluno
 */

import { Course, Module, Video } from './course.types';

export interface EnrolledCourse extends Course {
  enrollment: {
    id: string;
    enrolledAt: string;
    lastAccessedAt: string | null;
    completedAt: string | null;
    progress: number; // 0-100
  };
  progress: {
    totalVideos: number;
    watchedVideos: number;
    percentage: number;
    lastWatchedVideo?: {
      id: string;
      title: string;
      moduleTitle: string;
    };
  };
}

export interface CourseWithProgress extends Course {
  progress: {
    totalVideos: number;
    watchedVideos: number;
    percentage: number;
  };
  modules: ModuleWithProgress[];
}

export interface ModuleWithProgress extends Module {
  videos: VideoWithProgress[];
  progress: {
    totalVideos: number;
    watchedVideos: number;
    percentage: number;
  };
}

export interface VideoWithProgress extends Video {
  isWatched: boolean;
  watchProgress?: {
    watchedAt: string;
    lastPosition: number; // segundos
  };
}

export interface VideoProgress {
  videoId: string;
  userId: string;
  watchedAt: string;
  lastPosition: number;
  completed: boolean;
}

export interface MarkVideoWatchedDto {
  videoId: string;
  lastPosition?: number;
  completed?: boolean;
}
