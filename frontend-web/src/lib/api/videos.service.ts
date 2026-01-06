import { apiClient } from './client';
import type {
  Video,
  CreateVideoDto,
  UpdateVideoDto,
  ReorderVideosDto,
  UploadUrlResponse,
} from '../types/course.types';

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
   */
  async getStreamUrl(id: string): Promise<{ cloudflareId: string; cloudflareUrl: string }> {
    const video = await this.findOne(id);
    
    if (!video.cloudflareId || !video.cloudflareUrl) {
      throw new Error('Vídeo ainda não está disponível para streaming');
    }
    
    if (!video.isPublished) {
      throw new Error('Este vídeo não está publicado');
    }
    
    return {
      cloudflareId: video.cloudflareId,
      cloudflareUrl: video.cloudflareUrl,
    };
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
