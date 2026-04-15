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
      const response = await apiClient.get<{ hasTranscript: boolean }>(`/videos/${videoId}/transcript/exists`);
      return response.data.hasTranscript;
    } catch (error) {
      console.error('Erro ao verificar transcrição:', error);
      return false;
    }
  },
};
