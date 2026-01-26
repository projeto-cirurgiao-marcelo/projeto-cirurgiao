import { apiClient } from './client';
import * as tus from 'tus-js-client';
import type {
  Video,
  CreateVideoDto,
  UpdateVideoDto,
  ReorderVideosDto,
  UploadUrlResponse,
} from '../types/course.types';

// Interface para resposta do upload direto
export interface DirectUploadResponse {
  uploadURL: string;
  uid: string;
  videoId: string;
  video: Video;
}

// Interface para dados de streaming (Cloudflare ou embed)
export interface StreamDataResponse {
  type: 'cloudflare' | 'embed';
  cloudflareId?: string;
  cloudflareUrl?: string;
  embedUrl?: string;
  videoSource?: 'youtube' | 'vimeo' | 'external' | 'cloudflare';
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

  /**
   * Obter URL de streaming do vídeo para o player
   * Suporta tanto vídeos Cloudflare quanto embeds externos
   */
  async getStreamUrl(id: string): Promise<StreamDataResponse> {
    const video = await this.findOne(id);
    
    console.log('[videosService.getStreamUrl] Video data:', {
      id: video.id,
      videoSource: video.videoSource,
      cloudflareId: video.cloudflareId,
      cloudflareUrl: video.cloudflareUrl,
      externalUrl: video.externalUrl,
    });
    
    if (!video.isPublished) {
      throw new Error('Este vídeo não está publicado');
    }
    
    // Prioridade 1: Se tem cloudflareId, é um vídeo Cloudflare
    if (video.cloudflareId) {
      console.log('[videosService.getStreamUrl] Retornando como Cloudflare (tem cloudflareId)');
      return {
        type: 'cloudflare',
        cloudflareId: video.cloudflareId,
        cloudflareUrl: video.cloudflareUrl || undefined,
        videoSource: 'cloudflare',
      };
    }
    
    // Prioridade 2: Se externalUrl contém cloudflarestream.com, é um vídeo Cloudflare
    if (video.externalUrl && video.externalUrl.includes('cloudflarestream.com')) {
      // Extrair o ID do Cloudflare da URL (pode ser de diferentes formatos)
      // Formato 1: https://customer-xxx.cloudflarestream.com/VIDEO_ID/...
      // Formato 2: https://iframe.cloudflarestream.com/VIDEO_ID
      // Formato 3: https://watch.cloudflarestream.com/VIDEO_ID
      let cloudflareId: string | null = null;
      
      // Tenta extrair de URLs como customer-xxx.cloudflarestream.com/VIDEO_ID/...
      const customerMatch = video.externalUrl.match(/cloudflarestream\.com\/([a-f0-9]{32})/);
      if (customerMatch) {
        cloudflareId = customerMatch[1];
      }
      
      // Se não encontrou, tenta outros padrões
      if (!cloudflareId) {
        const iframeMatch = video.externalUrl.match(/cloudflarestream\.com\/([a-f0-9]+)/);
        cloudflareId = iframeMatch ? iframeMatch[1] : null;
      }
      
      if (cloudflareId) {
        console.log('[videosService.getStreamUrl] Retornando como Cloudflare (externalUrl contém cloudflarestream.com), ID:', cloudflareId);
        return {
          type: 'cloudflare',
          cloudflareId: cloudflareId,
          cloudflareUrl: video.externalUrl,
          videoSource: 'cloudflare',
        };
      }
    }
    
    // Prioridade 3: Se tem externalUrl e videoSource diferente de cloudflare, é embed externo
    if (video.videoSource && video.videoSource !== 'cloudflare' && video.externalUrl) {
      console.log('[videosService.getStreamUrl] Retornando como embed externo');
      return {
        type: 'embed',
        embedUrl: video.externalUrl,
        videoSource: video.videoSource as 'youtube' | 'vimeo' | 'external',
      };
    }
    
    // Fallback: Se tem cloudflareUrl mas não cloudflareId
    if (video.cloudflareUrl) {
      // Tentar extrair o ID da URL
      const match = video.cloudflareUrl.match(/cloudflarestream\.com\/([a-f0-9]+)/);
      const cloudflareId = match ? match[1] : null;
      
      if (cloudflareId) {
        console.log('[videosService.getStreamUrl] Retornando como Cloudflare (extraído de cloudflareUrl)');
        return {
          type: 'cloudflare',
          cloudflareId: cloudflareId,
          cloudflareUrl: video.cloudflareUrl,
          videoSource: 'cloudflare',
        };
      }
    }
    
    throw new Error('Vídeo ainda não está disponível para streaming');
  },

  /**
   * Atualizar vídeo
   */
  async update(id: string, data: UpdateVideoDto): Promise<Video> {
    const response = await apiClient.patch<Video>(`/videos/${id}`, data);
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
      console.log('[TUS Direct] Starting upload');
      console.log('[TUS Direct] File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      // Fase 1: Obter URL TUS do backend (cria registro no banco e obtém URL autenticada)
      const { tusUploadUrl, uid, videoId, video } = await this.getTusUploadUrl(moduleId, {
        ...metadata,
        fileSize: file.size,
        filename: file.name,
      });

      console.log('[TUS Direct] TUS URL obtained:', tusUploadUrl);
      console.log('[TUS Direct] Video ID:', videoId, 'Cloudflare UID:', uid);

      // Fase 2: Upload TUS diretamente para Cloudflare
      onStatusChange?.('uploading', 'Enviando diretamente para Cloudflare...');

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
            console.log(`[TUS Direct] Progress: ${percentage.toFixed(2)}% (${uploadedMB.toFixed(2)}MB / ${sizeMB.toFixed(2)}MB)`);
            onProgress?.(percentage);
          },
          // Callback de sucesso
          onSuccess: () => {
            console.log('[TUS Direct] Upload completed successfully!');
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
            console.error('[TUS Direct] Upload error:', error);
            onStatusChange?.('error', error.message || 'Erro no upload TUS');
            reject(new Error(`Erro no upload TUS: ${error.message}`));
          },
        });

        // Iniciar upload
        console.log('[TUS Direct] Starting TUS upload...');
        upload.start();
      });
    } catch (error: any) {
      console.error('[TUS Direct] Error:', error);
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
