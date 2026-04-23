import { apiClient } from './client';
import { logger } from '@/lib/logger';
import type {
  Video,
  CreateVideoDto,
  UpdateVideoDto,
  ReorderVideosDto,
  UploadUrlResponse,
} from '../types/course.types';
import type { CreateVideoFromR2HlsRequest } from '@/types/api-shared';

// Interface para resposta do upload direto
export interface DirectUploadResponse {
  uploadURL: string;
  uid: string;
  videoId: string;
  video: Video;
}

// Interface para dados de streaming (embed externo ou HLS R2)
export interface StreamDataResponse {
  type: 'embed' | 'hls';
  embedUrl?: string;
  hlsUrl?: string;
  videoSource?: 'youtube' | 'vimeo' | 'external' | 'r2_hls';
}

// Interface para status de upload
export interface UploadStatusResponse {
  id: string;
  uploadStatus: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR';
  uploadProgress: number;
  uploadError: string | null;
  cloudflareId: string | null;
  cloudflareUrl: string | null;
  readyToStream: boolean;
}

/**
 * Serviço para gerenciamento de vídeos
 */
export const videosService = {
  /**
   * Criar um novo vídeo
   */
  async create(moduleId: string, data: CreateVideoDto): Promise<Video> {
    const response = await apiClient.post<Video>(`/modules/${moduleId}/videos`, data);
    return response.data;
  },

  /**
   * Criar vídeo a partir de URL externa
   * O Cloudflare irá baixar e processar o vídeo automaticamente
   * @param moduleId ID do módulo
   * @param url URL do vídeo (link direto para arquivo .mp4, etc)
   * @param metadata Título, descrição e ordem
   */
  async createFromUrl(
    moduleId: string,
    url: string,
    metadata: { title: string; description?: string; order: number }
  ): Promise<Video> {
    const response = await apiClient.post<Video>(`/modules/${moduleId}/videos/from-url`, {
      url,
      ...metadata,
    });
    return response.data;
  },

  /**
   * Criar vídeo a partir de embed externo (YouTube, Vimeo, etc)
   * Apenas salva a URL - não faz upload para Cloudflare
   * @param moduleId ID do módulo
   * @param embedUrl URL do embed (YouTube, Vimeo, ou outro)
   * @param metadata Título, descrição, ordem e fonte
   */
  async createFromEmbed(
    moduleId: string,
    embedUrl: string,
    metadata: { title: string; description?: string; order: number; videoSource?: 'youtube' | 'vimeo' | 'external' }
  ): Promise<Video> {
    const response = await apiClient.post<Video>(`/modules/${moduleId}/videos/from-embed`, {
      embedUrl,
      ...metadata,
    });
    return response.data;
  },

  /**
   * Registra video que ja saiu do pipeline externo (FFmpeg + Whisper
   * em R2 HLS). Backend nao processa nada — so grava o master
   * playlist. Video vai pra `uploadStatus: READY` direto.
   *
   * Contrato: docs API-CHANGES-SPRINT.md §"POST /modules/:moduleId/
   * videos/from-r2-hls".
   *
   * @returns Video & { playback } — player consome `playback.kind`
   *          pra decidir renderizacao.
   */
  async createFromR2Hls(
    moduleId: string,
    body: CreateVideoFromR2HlsRequest,
  ): Promise<Video> {
    const response = await apiClient.post<Video>(
      `/modules/${moduleId}/videos/from-r2-hls`,
      body,
    );
    return response.data;
  },

  /**
   * Listar vídeos de um módulo
   */
  async findAll(moduleId: string): Promise<Video[]> {
    const response = await apiClient.get<Video[]>(`/modules/${moduleId}/videos`);
    return response.data;
  },

  /**
   * Listar vídeos de um módulo (alias para findAll)
   */
  async list(moduleId: string): Promise<Video[]> {
    return this.findAll(moduleId);
  },

  /**
   * Obter URL de upload do Cloudflare Stream
   */
  async getUploadUrl(): Promise<UploadUrlResponse> {
    const response = await apiClient.post<UploadUrlResponse>('/videos/upload-url');
    return response.data;
  },

  /**
   * Upload de vídeo via backend (streaming para Cloudflare)
   * O arquivo é enviado para o backend que faz streaming para o Cloudflare
   * Isso evita problemas de CORS e suporta arquivos grandes
   */
  async uploadFile(
    moduleId: string,
    file: File,
    metadata: {
      title: string;
      description?: string;
      order: number;
    },
    onProgress?: (progress: number) => void
  ): Promise<Video> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    formData.append('order', metadata.order.toString());

    const response = await apiClient.post<Video>(
      `/modules/${moduleId}/videos/upload-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }
    );
    return response.data;
  },

  /**
   * Obter próxima ordem disponível para um módulo
   */
  async getNextOrder(moduleId: string): Promise<{ nextOrder: number }> {
    const response = await apiClient.get<{ nextOrder: number }>(
      `/modules/${moduleId}/videos/next-order`
    );
    return response.data;
  },

  /**
   * Reordenar vídeos de um módulo
   */
  async reorder(moduleId: string, data: ReorderVideosDto): Promise<Video[]> {
    const response = await apiClient.patch<Video[]>(
      `/modules/${moduleId}/videos/reorder`,
      data
    );
    return response.data;
  },

  /**
   * Buscar vídeo por ID
   */
  async findOne(id: string): Promise<Video> {
    const response = await apiClient.get<Video>(`/videos/${id}`);
    return response.data;
  },

  getStreamDataFromVideo(video: Video): StreamDataResponse {
    logger.log('[videosService.getStreamDataFromVideo] Video data:', {
      id: video.id,
      videoSource: video.videoSource,
      hlsUrl: (video as any).hlsUrl,
    });

    // Prioridade 0: hlsUrl explícito (R2 HLS — suporta 4K)
    if ((video as any).hlsUrl) {
      logger.log('[videosService] Retornando como HLS R2 (tem hlsUrl)');
      return { type: 'hls', hlsUrl: (video as any).hlsUrl, videoSource: 'r2_hls' };
    }

    // Prioridade 1: externalUrl aponta para .m3u8 (HLS no R2/CDN)
    if (video.externalUrl && video.externalUrl.includes('.m3u8')) {
      logger.log('[videosService] Retornando como HLS (externalUrl contém .m3u8)');
      return { type: 'hls', hlsUrl: video.externalUrl, videoSource: 'r2_hls' };
    }

    // Prioridade 2: embed externo (YouTube, Vimeo, external)
    if (
      video.videoSource &&
      video.videoSource !== 'cloudflare' &&
      video.videoSource !== 'r2_hls' &&
      video.externalUrl
    ) {
      return {
        type: 'embed',
        embedUrl: video.externalUrl,
        videoSource: video.videoSource as 'youtube' | 'vimeo' | 'external',
      };
    }

    throw new Error('Vídeo ainda não está disponível para streaming');
  },

  async getStreamUrl(id: string): Promise<StreamDataResponse> {
    const video = await this.findOne(id);

    if (!video.isPublished) {
      throw new Error('Este vídeo não está publicado');
    }

    return this.getStreamDataFromVideo(video);
  },

  /**
   * Atualizar vídeo
   */
  async update(id: string, data: UpdateVideoDto): Promise<Video> {
    const response = await apiClient.patch<Video>(`/videos/${id}`, data);
    return response.data;
  },

  /**
   * Mover vídeo para outro módulo
   */
  async moveToModule(videoId: string, targetModuleId: string): Promise<Video> {
    const response = await apiClient.post<Video>(`/videos/${videoId}/move`, { targetModuleId });
    return response.data;
  },

  /**
   * Deletar vídeo
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/videos/${id}`);
  },

  /**
   * Publicar/despublicar vídeo
   */
  async togglePublish(id: string): Promise<Video> {
    const response = await apiClient.patch<Video>(`/videos/${id}/toggle-publish`);
    return response.data;
  },

  /**
   * Sincronizar metadados do vídeo com Cloudflare
   */
  async sync(id: string): Promise<Video> {
    const response = await apiClient.post<Video>(`/videos/${id}/sync`);
    return response.data;
  },

  /**
   * Verificar status de upload de um vídeo
   */
  async getUploadStatus(id: string): Promise<UploadStatusResponse> {
    const response = await apiClient.get<UploadStatusResponse>(`/videos/${id}/upload-status`);
    return response.data;
  },

  /**
   * Obter URL de upload direto para TUS
   * Cria o registro do vídeo no banco e retorna a URL de upload direta do Cloudflare
   */
  async getDirectUploadUrl(
    moduleId: string,
    metadata: { title: string; description?: string; order: number }
  ): Promise<DirectUploadResponse> {
    const response = await apiClient.post<DirectUploadResponse>(
      `/modules/${moduleId}/videos/upload-url-direct`,
      metadata
    );
    return response.data;
  },

  /**
   * Obter URL de upload TUS direto para Cloudflare (para arquivos grandes)
   * O backend gera uma URL TUS autenticada, o frontend faz upload direto para Cloudflare
   */
  async getTusUploadUrl(
    moduleId: string,
    metadata: { title: string; description?: string; order: number; fileSize: number; filename: string }
  ): Promise<{ tusUploadUrl: string; uid: string; videoId: string; video: Video }> {
    const response = await apiClient.post<{ tusUploadUrl: string; uid: string; videoId: string; video: Video }>(
      `/modules/${moduleId}/videos/tus-upload-url`,
      metadata
    );
    return response.data;
  },

  /**
   * Upload de vídeo via TUS direto para Cloudflare (SEM PASSAR PELO BACKEND!)
   * O arquivo é enviado diretamente do navegador para o Cloudflare usando TUS protocol
   * Ideal para arquivos grandes - sem limite de tamanho!
   */
  async uploadVideoTusDirect(
    moduleId: string,
    file: File,
    metadata: { title: string; description?: string; order: number },
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: 'preparing' | 'uploading' | 'processing' | 'done' | 'error', message?: string) => void
  ): Promise<Video> {
    try {
      onStatusChange?.('preparing', 'Preparando upload TUS...');
      logger.log('[TUS Direct] Starting upload');
      logger.log('[TUS Direct] File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      // Fase 1: Obter URL TUS do backend (cria registro no banco e obtém URL autenticada)
      const { tusUploadUrl, uid, videoId, video } = await this.getTusUploadUrl(moduleId, {
        ...metadata,
        fileSize: file.size,
        filename: file.name,
      });

      // NOTE: tusUploadUrl contains a signed Cloudflare upload token —
      // never log it (even gated). If you need to debug TUS upload,
      // add a temporary `logger.debug` inline and remove before merge.
      logger.log('[TUS Direct] Video ID:', videoId, 'Cloudflare UID:', uid);

      // Fase 2: Upload TUS diretamente para Cloudflare
      onStatusChange?.('uploading', 'Enviando diretamente para Cloudflare...');

      const tus = await import('tus-js-client');

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          // URL TUS autenticada obtida do backend
          uploadUrl: tusUploadUrl,
          // Chunk de ~50MB (52.4MB é múltiplo de 256KiB, recomendado pelo Cloudflare)
          chunkSize: 52428800,
          // Retries em caso de falha
          retryDelays: [0, 3000, 5000, 10000, 20000],
          // Metadata
          metadata: {
            filename: file.name,
            filetype: file.type || 'video/mp4',
          },
          // Callback de progresso
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            const sizeMB = bytesTotal / (1024 * 1024);
            const uploadedMB = bytesUploaded / (1024 * 1024);
            logger.log(`[TUS Direct] Progress: ${percentage.toFixed(2)}% (${uploadedMB.toFixed(2)}MB / ${sizeMB.toFixed(2)}MB)`);
            onProgress?.(percentage);
          },
          // Callback de sucesso
          onSuccess: () => {
            logger.log('[TUS Direct] Upload completed successfully!');
            onStatusChange?.('processing', 'Upload concluído! Cloudflare processando...');
            onProgress?.(100);
            resolve({
              ...video,
              uploadStatus: 'PROCESSING' as const,
              uploadProgress: 100,
            });
          },
          // Callback de erro
          onError: (error) => {
            logger.error('[TUS Direct] Upload error:', error);
            onStatusChange?.('error', error.message || 'Erro no upload TUS');
            reject(new Error(`Erro no upload TUS: ${error.message}`));
          },
        });

        // Iniciar upload
        logger.log('[TUS Direct] Starting TUS upload...');
        upload.start();
      });
    } catch (error: any) {
      logger.error('[TUS Direct] Error:', error);
      onStatusChange?.('error', error.message);
      throw error;
    }
  },

  /**
   * Polling de status de upload até completar ou falhar
   * @param id ID do vídeo
   * @param onProgress Callback chamado a cada atualização de progresso
   * @param intervalMs Intervalo entre verificações (padrão: 2000ms)
   * @param maxAttempts Número máximo de tentativas (padrão: 300 = 10 minutos)
   */
  async pollUploadStatus(
    id: string,
    onProgress?: (status: UploadStatusResponse) => void,
    intervalMs = 2000,
    maxAttempts = 300
  ): Promise<UploadStatusResponse> {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          attempts++;
          const status = await this.getUploadStatus(id);
          
          // Chamar callback de progresso
          if (onProgress) {
            onProgress(status);
          }
          
          // Verificar se completou ou falhou
          if (status.uploadStatus === 'READY') {
            resolve(status);
            return;
          }
          
          if (status.uploadStatus === 'ERROR') {
            reject(new Error(status.uploadError || 'Erro no upload do vídeo'));
            return;
          }
          
          // Verificar limite de tentativas
          if (attempts >= maxAttempts) {
            reject(new Error('Timeout: Upload demorou muito para completar'));
            return;
          }
          
          // Continuar polling
          setTimeout(checkStatus, intervalMs);
        } catch (error) {
          reject(error);
        }
      };
      
      // Iniciar polling
      checkStatus();
    });
  },
};
