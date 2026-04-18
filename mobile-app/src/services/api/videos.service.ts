import { apiClient } from './client';
import { Video } from '../../types/course.types';

/**
 * Serviço de videos.
 *
 * Nota importante: o backend (contrato unificado publicado por C em
 * docs/API-CHANGES-SPRINT.md §"Video payload com playback URLs") agora
 * entrega `video.playback: VideoPlaybackUrls` com `kind` + `playbackUrl`
 * ja resolvido. O cliente **nao deriva URL** — le `playback.playbackUrl`
 * direto. Os campos legados (`cloudflareUrl`/`hlsUrl`/`externalUrl`/
 * `cloudflareId`) continuam na payload por aditividade, mas nao devem
 * mais ser lidos aqui.
 *
 * A antiga funcao `getStreamData(video)` + constante `CLOUDFLARE_CUSTOMER_CODE`
 * foram removidas nesta migracao (commit ref `feat(mobile): consume unified
 * playback contract`). Consumidores (ex: `app/course/[id]/watch/[videoId].tsx`)
 * agora switcham por `video.playback.kind`.
 */
export const videosService = {
  async getById(id: string): Promise<Video> {
    const response = await apiClient.get<Video>(`/videos/${id}`);
    return response.data;
  },
};
