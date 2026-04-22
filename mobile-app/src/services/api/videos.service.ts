import { apiClient } from './client';
import { Video } from '../../types/course.types';

/**
 * Serviço de videos.
 *
 * Backend entrega `video.playback: VideoPlaybackUrls` com `kind` +
 * `playbackUrl` ja resolvido (ver docs/API-CHANGES-SPRINT.md §"Video
 * payload com playback URLs"). Consumidores leem `playback.playbackUrl`
 * direto e switcham por `playback.kind`.
 */
export const videosService = {
  async getById(id: string): Promise<Video> {
    const response = await apiClient.get<Video>(`/videos/${id}`);
    return response.data;
  },
};
