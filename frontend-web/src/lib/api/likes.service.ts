import { apiClient } from './client';

export interface LikeStatus {
  totalLikes: number;
  userHasLiked: boolean;
}

export const likesService = {
  /**
   * Obter status de likes de um vídeo
   */
  async getLikeStatus(videoId: string): Promise<LikeStatus> {
    const response = await apiClient.get<LikeStatus>(`/videos/${videoId}/likes`);
    return response.data;
  },

  /**
   * Curtir um vídeo
   */
  async likeVideo(videoId: string): Promise<LikeStatus> {
    const response = await apiClient.post<LikeStatus>(`/videos/${videoId}/like`);
    return response.data;
  },

  /**
   * Descurtir um vídeo
   */
  async unlikeVideo(videoId: string): Promise<LikeStatus> {
    const response = await apiClient.delete<LikeStatus>(`/videos/${videoId}/like`);
    return response.data;
  },

  /**
   * Toggle like (curtir/descurtir)
   */
  async toggleLike(videoId: string): Promise<LikeStatus> {
    const response = await apiClient.post<LikeStatus>(`/videos/${videoId}/like/toggle`);
    return response.data;
  },
};
