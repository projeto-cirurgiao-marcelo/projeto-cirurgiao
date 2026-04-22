/**
 * Serviço de Progresso - Migrado do frontend-web
 */

import { apiClient } from './client';
import { logger } from '../../lib/logger';
import { EnrolledCourse, CourseProgress, SaveProgressDto } from '../../types';

export const progressService = {
  /**
   * Lista cursos matriculados do usuário
   */
  async getEnrolledCourses(): Promise<EnrolledCourse[]> {
    const response = await apiClient.get('/progress/enrolled-courses');
    return response.data;
  },

  /**
   * Busca progresso de um curso específico
   */
  async getCourseProgress(courseId: string): Promise<CourseProgress> {
    const response = await apiClient.get(`/progress/course/${courseId}`);
    return response.data;
  },

  /**
   * Salva progresso de um vídeo
   */
  async saveProgress(data: SaveProgressDto): Promise<void> {
    await apiClient.post('/progress', data);
  },

  /**
   * Marca vídeo como concluído
   */
  async markAsCompleted(videoId: string): Promise<void> {
    await apiClient.post(`/progress/video/${videoId}/complete`);
  },

  /**
   * Desmarca vídeo como concluído
   */
  async markAsIncomplete(videoId: string): Promise<void> {
    await apiClient.post(`/progress/video/${videoId}/incomplete`);
  },

  /**
   * Busca último vídeo assistido de um curso
   */
  async getLastWatched(courseId: string): Promise<{ videoId: string; position: number } | null> {
    try {
      const response = await apiClient.get(`/progress/course/${courseId}/last-watched`);
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Busca progresso completo de um vídeo (watched, completed, watchTime)
   */
  async getVideoProgress(videoId: string): Promise<{ watched: boolean; completed: boolean; watchTime: number } | null> {
    try {
      const response = await apiClient.get(`/progress/video/${videoId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Busca posição salva de um vídeo (watchTime)
   */
  async getVideoPosition(videoId: string): Promise<number> {
    try {
      const response = await apiClient.get(`/progress/video/${videoId}`);
      // A API retorna watchTime, não position
      const watchTime = response.data?.watchTime;
      logger.log(`[progressService] watchTime carregado para ${videoId}: ${watchTime}`);
      return typeof watchTime === 'number' ? watchTime : 0;
    } catch (error) {
      logger.log(`[progressService] Nenhum progresso encontrado para ${videoId}`);
      return 0;
    }
  },
};

export default progressService;