/**
 * Serviço de Likes - Gerencia curtidas em vídeos
 */

import { apiClient } from './client';
import { logger } from '../../lib/logger';

export interface LikeStatus {
  liked: boolean;
  likesCount: number;
}

// Valor padrão para quando API não retorna dados válidos
const DEFAULT_STATUS: LikeStatus = { liked: false, likesCount: 0 };

export const likesService = {
  /**
   * Busca status de like de um vídeo
   */
  async getStatus(videoId: string): Promise<LikeStatus> {
    try {
      const response = await apiClient.get(`/videos/${videoId}/likes`);
      const data = response.data;

      // Backend retorna { totalLikes, userHasLiked } — mapear para interface local
      return {
        liked: Boolean(data?.userHasLiked ?? data?.liked),
        likesCount: typeof data?.totalLikes === 'number' ? data.totalLikes : (typeof data?.likesCount === 'number' ? data.likesCount : 0),
      };
    } catch (error) {
      logger.error('Erro ao buscar status de like:', error);
      return DEFAULT_STATUS;
    }
  },

  /**
   * Toggle like/unlike em um vídeo
   */
  async toggle(videoId: string): Promise<LikeStatus> {
    try {
      const response = await apiClient.post(`/videos/${videoId}/like/toggle`);
      const data = response.data;

      // Backend retorna { totalLikes, userHasLiked } — mapear para interface local
      return {
        liked: Boolean(data?.userHasLiked ?? data?.liked),
        likesCount: typeof data?.totalLikes === 'number' ? data.totalLikes : (typeof data?.likesCount === 'number' ? data.likesCount : 0),
      };
    } catch (error) {
      logger.error('Erro ao alternar like:', error);
      throw error;
    }
  },
};

export default likesService;
