import { apiClient } from './client';
import type {
  Module,
  CreateModuleDto,
  UpdateModuleDto,
  ReorderModulesDto,
} from '../types/course.types';

/**
 * Serviço para gerenciamento de módulos
 */
export const modulesService = {
  /**
   * Criar um novo módulo
   */
  async create(courseId: string, data: CreateModuleDto): Promise<Module> {
    const response = await apiClient.post<Module>(`/courses/${courseId}/modules`, data);
    return response.data;
  },

  /**
   * Listar módulos de um curso
   */
  async findAll(courseId: string): Promise<Module[]> {
    const response = await apiClient.get<Module[]>(`/courses/${courseId}/modules`);
    return response.data;
  },

  /**
   * Listar módulos de um curso (alias para findAll)
   */
  async list(courseId: string): Promise<Module[]> {
    return this.findAll(courseId);
  },

  /**
   * Obter próxima ordem disponível para um curso
   */
  async getNextOrder(courseId: string): Promise<{ nextOrder: number }> {
    const response = await apiClient.get<{ nextOrder: number }>(
      `/courses/${courseId}/modules/next-order`
    );
    return response.data;
  },

  /**
   * Reordenar módulos de um curso
   */
  async reorder(courseId: string, data: ReorderModulesDto): Promise<Module[]> {
    const response = await apiClient.patch<Module[]>(
      `/courses/${courseId}/modules/reorder`,
      data
    );
    return response.data;
  },

  /**
   * Buscar módulo por ID
   */
  async findOne(id: string): Promise<Module> {
    const response = await apiClient.get<Module>(`/modules/${id}`);
    return response.data;
  },

  /**
   * Atualizar módulo
   */
  async update(id: string, data: UpdateModuleDto): Promise<Module> {
    const response = await apiClient.patch<Module>(`/modules/${id}`, data);
    return response.data;
  },

  /**
   * Deletar módulo
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/modules/${id}`);
  },
};
