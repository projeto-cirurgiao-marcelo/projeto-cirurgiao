import { apiClient } from './client';

// Tipos
export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface Transcript {
  id: string;
  videoId: string;
  language: string;
  fullText?: string;
  segments: TranscriptSegment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTranscriptDto {
  language?: string;
  fullText?: string;
  segments: TranscriptSegment[];
}

export interface TranscriptExistsResponse {
  hasTranscript: boolean;
}

// Serviço de Transcrições
export const transcriptsService = {
  /**
   * Obter transcrição de um vídeo
   */
  async getByVideoId(videoId: string): Promise<Transcript | null> {
    try {
      const response = await apiClient.get<Transcript | { message: string }>(`/videos/${videoId}/transcript`);
      const data = response.data;
      
      // Se retornou mensagem de "não disponível", retorna null
      if ('message' in data) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar transcrição:', error);
      return null;
    }
  },

  /**
   * Verificar se um vídeo tem transcrição
   */
  async hasTranscript(videoId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<TranscriptExistsResponse>(`/videos/${videoId}/transcript/exists`);
      return response.data.hasTranscript;
    } catch (error) {
      console.error('Erro ao verificar transcrição:', error);
      return false;
    }
  },

  /**
   * Criar ou atualizar transcrição (admin)
   */
  async createOrUpdate(videoId: string, data: CreateTranscriptDto): Promise<Transcript> {
    const response = await apiClient.post<Transcript>(`/videos/${videoId}/transcript`, data);
    return response.data;
  },

  /**
   * Upload de transcrição do AWS Transcribe (admin)
   */
  async uploadAWSTranscript(videoId: string, awsJson: any): Promise<Transcript> {
    const response = await apiClient.post<Transcript>(`/videos/${videoId}/transcript/aws`, {
      awsTranscriptJson: awsJson,
    });
    return response.data;
  },

  /**
   * Remover transcrição (admin)
   */
  async remove(videoId: string): Promise<void> {
    await apiClient.delete(`/videos/${videoId}/transcript`);
  },
};
