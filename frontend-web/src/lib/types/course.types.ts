/**
 * Tipos relacionados a Cursos
 */

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  thumbnailUrl: string | null; // Deprecated - usar thumbnailHorizontal
  thumbnail: string | null; // Deprecated - manter para compatibilidade
  thumbnailVertical: string | null; // Thumbnail vertical (9:16)
  thumbnailHorizontal: string | null; // Thumbnail horizontal (16:9)
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
  thumbnail: string | null; // Deprecated - usar thumbnailHorizontal
  thumbnailVertical: string | null; // Thumbnail vertical (9:16)
  thumbnailHorizontal: string | null; // Thumbnail horizontal (16:9)
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
  videoSource: VideoSource;
  createdAt: string;
  updatedAt: string;
  module?: Module;
}

export interface CreateCourseDto {
  title: string;
  description?: string;
  price: number;
  thumbnailUrl?: string; // Deprecated
  thumbnail?: string; // Deprecated
  thumbnailVertical?: string;
  thumbnailHorizontal?: string;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  price?: number;
  thumbnailUrl?: string; // Deprecated
  thumbnail?: string; // Deprecated
  thumbnailVertical?: string;
  thumbnailHorizontal?: string;
  isPublished?: boolean;
}

export interface CreateModuleDto {
  title: string;
  description?: string;
  order: number;
}

export interface UpdateModuleDto {
  title?: string;
  description?: string;
  order?: number;
}

export interface ReorderModulesDto {
  modules: Array<{
    id: string;
    order: number;
  }>;
}

export interface CreateVideoDto {
  title: string;
  description?: string;
  cloudflareId?: string;
  cloudflareUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  order: number;
  isPublished?: boolean;
  uploadStatus?: VideoUploadStatus;
  uploadProgress?: number;
  uploadError?: string;
}

export interface UpdateVideoDto {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  order?: number;
  isPublished?: boolean;
}

export interface ReorderVideosDto {
  videoOrders: Array<{
    id: string;
    order: number;
  }>;
}

export interface UploadUrlResponse {
  uploadURL: string;
  uid: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
