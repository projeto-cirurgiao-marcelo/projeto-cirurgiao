/**
 * Service de gestão de usuários/alunos para o painel administrativo
 */

import { apiClient, getErrorMessage } from './client';
import type {
  StudentsOverviewResponse,
  StudentDetailResponse,
  UpdateUserDto,
  User,
} from '../types/user.types';

export const usersService = {
  /**
   * Busca overview completo de alunos com KPIs, lista paginada e métricas
   */
  async getStudentsOverview(params?: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    sort?: 'recent' | 'name' | 'progress';
    page?: number;
    limit?: number;
  }): Promise<StudentsOverviewResponse> {
    const { data } = await apiClient.get('/users/students/overview', {
      params,
    });
    return data;
  },

  /**
   * Busca detalhes completos de um aluno (matriculas, progresso, quizzes)
   */
  async getStudentDetail(id: string): Promise<StudentDetailResponse> {
    const { data } = await apiClient.get(`/users/students/${id}`);
    return data;
  },

  /**
   * Atualiza dados de um usuário (ex: ativar/desativar)
   */
  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const { data } = await apiClient.put(`/users/${id}`, dto);
    return data;
  },
};

export { getErrorMessage };
