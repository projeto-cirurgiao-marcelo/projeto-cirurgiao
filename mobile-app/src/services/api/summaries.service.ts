/**
 * Serviço de Resumos - Gerencia resumos de vídeos gerados por IA
 */

import { apiClient } from './client';
import { logger } from '../../lib/logger';

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

interface JobDescriptor {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  resultRef?: string;
  error?: string;
}

const JOB_POLL_INTERVAL_MS = 1500;
const JOB_POLL_TIMEOUT_MS = 90_000;

async function pollJobUntilComplete(jobId: string): Promise<JobDescriptor> {
  const start = Date.now();
  while (Date.now() - start < JOB_POLL_TIMEOUT_MS) {
    const { data } = await apiClient.get<JobDescriptor>(`/jobs/${jobId}`);
    if (data.status === 'completed') return data;
    if (data.status === 'failed') {
      throw new Error(data.error || 'Job de geração de resumo falhou');
    }
    await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
  }
  throw new Error('Timeout aguardando geração do resumo');
}

export const summariesService = {
  /**
   * Listar todos os resumos do usuário para um vídeo
   */
  async listSummaries(videoId: string): Promise<SummariesListResponse> {
    try {
      const response = await apiClient.get<SummariesListResponse>(
        `/videos/${videoId}/summaries`
      );
      return response.data;
    } catch (error) {
      logger.error('[summariesService] Erro ao listar resumos:', error);
      return { summaries: [], count: 0, maxAllowed: 3, remainingGenerations: 3 };
    }
  },

  /**
   * Obter o resumo mais recente de um vídeo (helper)
   */
  async getByVideoId(videoId: string): Promise<VideoSummary | null> {
    try {
      const response = await this.listSummaries(videoId);
      if (response.summaries && response.summaries.length > 0) {
        // Retorna o resumo mais recente
        return response.summaries[0];
      }
      return null;
    } catch (error) {
      logger.error('[summariesService] Erro ao buscar resumo:', error);
      return null;
    }
  },

  /**
   * Gerar um novo resumo com IA.
   * Backend usa BullMQ async (sempre 202 + jobId). Em modo síncrono retorna
   * inline-completed; em modo async precisa polling. Após resolver job,
   * busca summary completo via GET /videos/:videoId/summaries/:summaryId.
   */
  async generateSummary(
    videoId: string,
    additionalInstructions?: string
  ): Promise<GenerateSummaryResponse> {
    const response = await apiClient.post<GenerateSummaryResponse | JobDescriptor>(
      `/videos/${videoId}/summaries/generate`,
      { additionalInstructions }
    );
    const payload = response.data as any;

    if (payload && 'jobId' in payload) {
      let job = payload as JobDescriptor;
      if (job.status !== 'completed' && job.status !== 'failed') {
        job = await pollJobUntilComplete(job.jobId);
      }
      if (job.status === 'failed' || !job.resultRef) {
        throw new Error(job.error || 'Resumo nao foi gerado (sem resultRef)');
      }
      const { data: summary } = await apiClient.get<VideoSummary>(
        `/videos/${videoId}/summaries/${job.resultRef}`
      );
      const remaining = await this.getRemainingGenerations(videoId);
      return { ...summary, remainingGenerations: remaining.remaining };
    }

    return payload as GenerateSummaryResponse;
  },

  /**
   * Obter um resumo específico
   */
  async getSummary(videoId: string, summaryId: string): Promise<VideoSummary> {
    const response = await apiClient.get<VideoSummary>(
      `/videos/${videoId}/summaries/${summaryId}`
    );
    return response.data;
  },

  /**
   * Verificar quantos resumos ainda podem ser gerados
   */
  async getRemainingGenerations(videoId: string): Promise<RemainingGenerationsResponse> {
    try {
      const response = await apiClient.get<RemainingGenerationsResponse>(
        `/videos/${videoId}/summaries/remaining`
      );
      return response.data;
    } catch (error) {
      logger.error('[summariesService] Erro ao verificar gerações restantes:', error);
      return { used: 0, remaining: 3, maxAllowed: 3 };
    }
  },

  /**
   * Deletar um resumo
   */
  async deleteSummary(videoId: string, summaryId: string): Promise<void> {
    await apiClient.delete(`/videos/${videoId}/summaries/${summaryId}`);
  },
};

export default summariesService;
