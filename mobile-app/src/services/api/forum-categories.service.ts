/**
 * Servico de API de Categorias do Forum
 * Alinhado com backend NestJS endpoints
 */

import { apiClient } from './client';
import { ForumCategory } from '../../types';

export const forumCategoriesService = {
  /** Lista todas as categorias */
  async getAll(): Promise<ForumCategory[]> {
    const response = await apiClient.get('/forum-categories');
    return response.data;
  },

  /** Busca categoria por ID */
  async getById(id: string): Promise<ForumCategory> {
    const response = await apiClient.get(`/forum-categories/${id}`);
    return response.data;
  },
};

export default forumCategoriesService;
