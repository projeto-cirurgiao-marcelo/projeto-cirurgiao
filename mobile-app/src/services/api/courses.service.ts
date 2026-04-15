/**
 * Serviço de Cursos - Migrado do frontend-web
 */

import { apiClient } from './client';
import { Course, Module, Video, PaginatedResponse } from '../../types';

export interface GetCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  isPublished?: boolean;
}

export const coursesService = {
  /**
   * Lista todos os cursos
   * A API pode retornar PaginatedResponse ou Course[] direto
   */
  async findAll(params?: GetCoursesParams): Promise<PaginatedResponse<Course> | Course[]> {
    const response = await apiClient.get('/courses', { params });
    return response.data;
  },

  /**
   * Busca um curso por ID
   */
  async getById(id: string): Promise<Course> {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data;
  },

  /**
   * Busca um curso por slug
   */
  async getBySlug(slug: string): Promise<Course> {
    const response = await apiClient.get(`/courses/slug/${slug}`);
    return response.data;
  },

  /**
   * Lista módulos de um curso
   */
  async getModules(courseId: string): Promise<Module[]> {
    const response = await apiClient.get(`/courses/${courseId}/modules`);
    return response.data;
  },

  /**
   * Busca um módulo por ID
   */
  async getModuleById(moduleId: string): Promise<Module> {
    const response = await apiClient.get(`/modules/${moduleId}`);
    return response.data;
  },

  /**
   * Lista vídeos de um módulo
   */
  async getModuleVideos(moduleId: string): Promise<Video[]> {
    const response = await apiClient.get(`/modules/${moduleId}/videos`);
    return response.data;
  },
};

export default coursesService;