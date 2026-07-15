import { apiClient } from './client';
import type {
  Course,
  CreateCourseDto,
  UpdateCourseDto,
  PaginatedResponse,
} from '../types/course.types';

export interface CatalogSearchResult {
  courses: Array<{
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    thumbnailHorizontal: string | null;
    thumbnailVertical: string | null;
    instructor: { name: string } | null;
    lessonsCount: number;
  }>;
  videos: Array<{
    id: string;
    title: string;
    duration: number;
    moduleTitle: string;
    courseId: string;
    courseTitle: string;
  }>;
}

/**
 * Serviço para gerenciamento de cursos
 */
export const coursesService = {
  /**
   * Busca de catálogo (cursos + aulas publicados) — topbar do aluno
   */
  async searchCatalog(q: string): Promise<CatalogSearchResult> {
    const response = await apiClient.get<CatalogSearchResult>('/courses/search', {
      params: { q },
    });
    return response.data;
  },

  /**
   * Criar um novo curso
   */
  async create(data: CreateCourseDto): Promise<Course> {
    const response = await apiClient.post<Course>('/courses', data);
    return response.data;
  },

  /**
   * Listar todos os cursos (com paginação)
   */
  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Course>> {
    const response = await apiClient.get<PaginatedResponse<Course>>('/courses', {
      params,
    });
    return response.data;
  },

  /**
   * Listar cursos do instrutor logado
   */
  async findMyCourses(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Course>> {
    const response = await apiClient.get<PaginatedResponse<Course>>('/courses/my-courses', {
      params,
    });
    return response.data;
  },

  /**
   * Buscar curso por ID
   */
  async findOne(id: string): Promise<Course> {
    const response = await apiClient.get<Course>(`/courses/${id}`);
    return response.data;
  },

  /**
   * Buscar curso por ID (alias para findOne)
   */
  async getById(id: string): Promise<Course> {
    return this.findOne(id);
  },

  /**
   * Buscar curso por slug
   */
  async findBySlug(slug: string): Promise<Course> {
    const response = await apiClient.get<Course>(`/courses/slug/${slug}`);
    return response.data;
  },

  /**
   * Atualizar curso
   */
  async update(id: string, data: UpdateCourseDto): Promise<Course> {
    const response = await apiClient.patch<Course>(`/courses/${id}`, data);
    return response.data;
  },

  /**
   * Deletar curso
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/courses/${id}`);
  },

  /**
   * Publicar/despublicar curso
   */
  async togglePublish(id: string): Promise<Course> {
    const response = await apiClient.patch<Course>(`/courses/${id}/toggle-publish`);
    return response.data;
  },

  /**
   * Reordenar cursos (admin-only). Backend ordena listing default por
   * position ASC, createdAt DESC — admin define ordem manual via drag-drop
   * em /admin/courses.
   */
  async reorder(courses: Array<{ id: string; position: number }>): Promise<Course[]> {
    const response = await apiClient.patch<Course[]>('/courses/reorder', {
      courses,
    });
    return response.data;
  },
};
