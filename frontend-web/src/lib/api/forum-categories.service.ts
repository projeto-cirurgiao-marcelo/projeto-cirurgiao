import { apiClient } from './client';
import type { ForumCategory } from '../types/forum.types';

export const forumCategoriesService = {
  /**
   * Listar todas as categorias
   */
  async getAll(): Promise<ForumCategory[]> {
    const response = await apiClient.get<ForumCategory[]>('/forum-categories');
    return response.data;
  },

  /**
   * Buscar categoria por ID
   */
  async getById(id: string): Promise<ForumCategory> {
    const response = await apiClient.get<ForumCategory>(`/forum-categories/${id}`);
    return response.data;
  },

  /**
   * Criar nova categoria (ADMIN apenas)
   */
  async create(data: {
    name: string;
    description?: string;
    slug: string;
    order: number;
  }): Promise<ForumCategory> {
    const response = await apiClient.post<ForumCategory>('/forum-categories', data);
    return response.data;
  },

  /**
   * Atualizar categoria (ADMIN apenas)
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      slug: string;
      order: number;
    }>
  ): Promise<ForumCategory> {
    const response = await apiClient.patch<ForumCategory>(`/forum-categories/${id}`, data);
    return response.data;
  },

  /**
   * Deletar categoria (ADMIN apenas)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/forum-categories/${id}`);
  },
};
