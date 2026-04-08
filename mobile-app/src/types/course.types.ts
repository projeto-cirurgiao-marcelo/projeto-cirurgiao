/**
 * Tipos relacionados a Cursos - Migrado do frontend-web
 */

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  thumbnailUrl: string | null;
  thumbnail: string | null;
  thumbnailVertical: string | null;
  thumbnailHorizontal: string | null;
  isPublished: boolean;
  instructorId: string;
  createdAt: string;
  updatedAt: string;
  instructor?: {
    id: string;
    name: string;
    email: string;
  };
  modules?: Module[];
  _count?: {
    modules: number;
    enrollments: number;
  };
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  thumbnailVertical: string | null;
  thumbnailHorizontal: string | null;
  order: number;
  courseId: string;
  createdAt: string;
  updatedAt: string;
  course?: Course;
  videos?: Video[];
  _count?: {
    videos: number;
  };
}

export type VideoUploadStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR';

export type VideoSource = 'cloudflare' | 'youtube' | 'vimeo' | 'external';

export interface Video {
  id: string;
  title: string;
  description: string | null;
  cloudflareId: string | null;
  cloudflareUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  order: number;
  isPublished: boolean;
  moduleId: string;
  uploadStatus: VideoUploadStatus;
  uploadProgress: number;
  uploadError: string | null;
  externalUrl: string | null;
  hlsUrl: string | null;
  videoSource: VideoSource;
  createdAt: string;
  updatedAt: string;
  module?: Module;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}