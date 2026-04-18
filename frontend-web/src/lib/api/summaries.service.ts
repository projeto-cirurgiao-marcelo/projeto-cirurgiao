import { apiClient } from './client';
import {
  isEnqueuedJob,
  waitForJob,
  type WaitForJobOptions,
} from './waitForJob';
import type { EnqueuedJobResponse } from '@/types/api-shared';

export interface VideoSummary {
  id: string;
  videoId: string;
  userId: string;
  content: string;
  version: number;
  tokenCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SummariesListResponse {
  summaries: VideoSummary[];
  count: number;
  maxAllowed: number;
  remainingGenerations: number;
}

export interface RemainingGenerationsResponse {
  used: number;
  remaining: number;
  maxAllowed: number;
}

export interface GenerateSummaryResponse extends VideoSummary {
  remainingGenerations: number;
}

export const summariesService = {
  /**
   * Gera um resumo do video. Suporta dois shapes de resposta do backend:
   *
   * 1. Legacy (QUEUE_ENABLED=false, prod atual): retorna o
   *    `GenerateSummaryResponse` direto com status 201. `waitForJob`
   *    nao eh acionado.
   * 2. Async (QUEUE_ENABLED=true, Memorystore provisionado): retorna
   *    `EnqueuedJobResponse` com status 202. `waitForJob` faz polling
   *    ate `completed` e retorna o `resultRef` (summary id). Depois
   *    fazemos GET pelo objeto real.
   *
   * Callers nao precisam saber qual modo esta ativo. Passe `jobOpts`
   * pra customizar polling (onProgress pra UI, AbortSignal, etc.).
   */
  async generateSummary(
    videoId: string,
    additionalInstructions?: string,
    jobOpts?: WaitForJobOptions,
  ): Promise<GenerateSummaryResponse> {
    const response = await apiClient.post<
      GenerateSummaryResponse | EnqueuedJobResponse
    >(`/videos/${videoId}/summaries/generate`, { additionalInstructions });

    if (isEnqueuedJob(response.data)) {
      const summaryId = await waitForJob<string>(response.data, jobOpts);
      // Fetch do objeto real. `remainingGenerations` nao vem do GET
      // simples (que retorna `VideoSummary`), entao buscamos a cota
      // separadamente pra manter o shape compativel com quem ja usa
      // `GenerateSummaryResponse`.
      const [summary, remainingRes] = await Promise.all([
        this.getSummary(videoId, summaryId),
        this.getRemainingGenerations(videoId).catch(() => null),
      ]);
      return {
        ...summary,
        remainingGenerations: remainingRes?.remaining ?? 0,
      };
    }

    return response.data;
  },

  async listSummaries(videoId: string): Promise<SummariesListResponse> {
    const response = await apiClient.get<SummariesListResponse>(`/videos/${videoId}/summaries`);
    return response.data;
  },

  async getSummary(videoId: string, summaryId: string): Promise<VideoSummary> {
    const response = await apiClient.get<VideoSummary>(`/videos/${videoId}/summaries/${summaryId}`);
    return response.data;
  },

  async updateSummary(videoId: string, summaryId: string, content: string): Promise<VideoSummary> {
    const response = await apiClient.put<VideoSummary>(`/videos/${videoId}/summaries/${summaryId}`, { content });
    return response.data;
  },

  async deleteSummary(videoId: string, summaryId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/videos/${videoId}/summaries/${summaryId}`);
    return response.data;
  },

  async getRemainingGenerations(videoId: string): Promise<RemainingGenerationsResponse> {
    const response = await apiClient.get<RemainingGenerationsResponse>(`/videos/${videoId}/summaries/remaining`);
    return response.data;
  },

  async downloadSummary(videoId: string, summaryId: string): Promise<void> {
    const response = await apiClient.get(`/videos/${videoId}/summaries/${summaryId}/download`, { responseType: 'blob' });
    const contentDisposition = response.headers['content-disposition'];
    let filename = `resumo-${summaryId}.md`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }
    const blob = new Blob([response.data], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
