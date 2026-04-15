/**
 * Tipos relacionados ao Estudante - Migrado do frontend-web
 */

import { Course, Video } from './course.types';

export interface Enrollment {
  id: string;
  enrolledAt: string;
  lastAccessedAt: string | null;
  completedAt: string | null;
  progress: number;
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
  courseId?: string;
  totalVideos: number;
  watchedVideos: number;
  completedVideos?: number;
  totalWatchTime?: number;
  progressPercentage?: number;
  percentage?: number;
  videos?: VideoProgressItem[];
  lastWatchedVideo?: {
    id: string;
    title: string;
    moduleTitle: string;
  };
}

export interface EnrolledCourse extends Course {
  enrollment: Enrollment;
  progress: CourseProgress;
}

export interface VideoProgress {
  id: string;
  videoId: string;
  userId: string;
  watchedAt: string;
  lastPosition: number;
  completed: boolean;
}

export interface VideoWithProgress extends Video {
  isWatched: boolean;
  watchProgress?: VideoProgress;
}

export interface SaveProgressDto {
  videoId: string;
  watchTime: number;
  completed: boolean;
}

export interface MarkCompletedDto {
  videoId: string;
}