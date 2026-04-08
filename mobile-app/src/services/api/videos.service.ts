import { apiClient } from './client';
import { Video } from '../../types/course.types';

// Cloudflare Stream customer code
const CLOUDFLARE_CUSTOMER_CODE = 'mcykto8a2uaqo5xu';
const CLOUDFLARE_STREAM_BASE = `https://customer-${CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com`;

export interface StreamData {
  type: 'cloudflare' | 'embed' | 'none';
  hlsUrl?: string;
  cloudflareId?: string;
  embedUrl?: string;
}

export const videosService = {
  async getById(id: string): Promise<Video> {
    const response = await apiClient.get<Video>(`/videos/${id}`);
    return response.data;
  },

  /**
   * Resolve a URL de streaming do vídeo.
   * Constrói a URL HLS a partir do cloudflareId.
   */
  getStreamData(video: Video): StreamData {
    // Prioridade 0: HLS do R2 CDN (suporta 4K)
    if (video.hlsUrl) {
      return {
        type: 'cloudflare',
        hlsUrl: video.hlsUrl,
      };
    }

    // Prioridade 1: cloudflareId direto
    if (video.cloudflareId) {
      return {
        type: 'cloudflare',
        cloudflareId: video.cloudflareId,
        hlsUrl: `${CLOUDFLARE_STREAM_BASE}/${video.cloudflareId}/manifest/video.m3u8`,
      };
    }

    // Prioridade 2: cloudflareUrl contém o ID
    if (video.cloudflareUrl) {
      const match = video.cloudflareUrl.match(/cloudflarestream\.com\/([a-f0-9]{32})/);
      if (match) {
        const cfId = match[1];
        return {
          type: 'cloudflare',
          cloudflareId: cfId,
          hlsUrl: `${CLOUDFLARE_STREAM_BASE}/${cfId}/manifest/video.m3u8`,
        };
      }
      // Se a URL já é HLS (.m3u8), usar diretamente
      if (video.cloudflareUrl.includes('.m3u8')) {
        return {
          type: 'cloudflare',
          hlsUrl: video.cloudflareUrl,
        };
      }
    }

    // Prioridade 3: externalUrl com Cloudflare
    if (video.externalUrl && video.externalUrl.includes('cloudflarestream.com')) {
      const match = video.externalUrl.match(/cloudflarestream\.com\/([a-f0-9]{32})/);
      if (match) {
        const cfId = match[1];
        return {
          type: 'cloudflare',
          cloudflareId: cfId,
          hlsUrl: `${CLOUDFLARE_STREAM_BASE}/${cfId}/manifest/video.m3u8`,
        };
      }
    }

    // Prioridade 4: externalUrl genérica (YouTube, Vimeo, etc.)
    if (video.externalUrl) {
      return {
        type: 'embed',
        embedUrl: video.externalUrl,
      };
    }

    return { type: 'none' };
  },
};
