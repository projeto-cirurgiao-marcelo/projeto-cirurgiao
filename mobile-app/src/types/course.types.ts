/**
 * Tipos relacionados a Cursos - Migrado do frontend-web
 */

import type { VideoPlaybackUrls } from './api-shared';

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

export type VideoSource = 'cloudflare' | 'youtube' | 'vimeo' | 'external' | 'r2_hls';

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
  /**
   * Contrato unificado de playback (backend resolve URL + decide kind de render).
   * Campos legados acima (cloudflareUrl, hlsUrl, externalUrl, cloudflareId)
   * continuam presentes por aditividade — preferir ler `playback` nos consumidores.
   * Opcional hoje porque algumas rotas antigas podem nao ter atualizado ainda.
   */
  playback?: VideoPlaybackUrls;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}