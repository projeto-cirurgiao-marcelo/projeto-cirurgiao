import { apiClient } from './client';
import { logger } from '../../lib/logger';
import type {
  Quiz,
  GenerateQuizDto,
  SubmitQuizDto,
  QuizResult,
  QuizAttempt,
  QuizStats,
} from '../../types/quiz.types';

/**
 * Job status DTO returned by GET /jobs/:id.
 * Contract mirrors backend `JobStatusDto` in
 * `backend-api/src/shared/queue/queue.constants.ts`.
 */
export interface JobStatus {
  id: string;
  type: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'unknown';
  progress: number;
  /** Opaque pointer to produced artifact — for quiz jobs this is the quizId. */
  resultRef?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Async-quiz generation enqueue response. Backend returns 202 with this shape
 * when the queue is enabled, or `status: 'completed'` immediately when the
 * inline fallback path runs (QUEUE_ENABLED=false) — same envelope either way.
 */
export interface EnqueueQuizJobResponse {
  jobId: string;
  status: 'queued' | 'completed';
  resultRef?: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // ~120s total

export const quizzesService = {
  /**
   * Enfileira a geração de um quiz e retorna imediatamente o jobId
   * (202 Accepted). Use `pollJob` ou `generateQuizAsync` para acompanhar.
   */
  async enqueueQuizGeneration(
    videoId: string,
    dto?: GenerateQuizDto,
  ): Promise<EnqueueQuizJobResponse> {
    const response = await apiClient.post<EnqueueQuizJobResponse>(
      `/videos/${videoId}/quizzes/generate`,
      dto || {},
    );
    return response.data;
  },

  /**
   * Polling do GET /jobs/:id até `completed`/`failed` ou timeout.
   * `onProgress` recebe o status corrente a cada tick.
   */
  async pollJob(
    jobId: string,
    onProgress?: (status: JobStatus['status']) => void,
    options?: { intervalMs?: number; maxAttempts?: number },
  ): Promise<JobStatus> {
    const intervalMs = options?.intervalMs ?? POLL_INTERVAL_MS;
    const maxAttempts = options?.maxAttempts ?? MAX_POLL_ATTEMPTS;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      const response = await apiClient.get<JobStatus>(`/jobs/${jobId}`);
      const job = response.data;
      onProgress?.(job.status);
      if (job.status === 'completed') {
        return job;
      }
      if (job.status === 'failed') {
        throw new Error(job.error ?? 'Quiz generation failed');
      }
    }
    throw new Error('Quiz generation timed out (>120s)');
  },

  /**
   * Fluxo completo: enfileira a geração, faz polling até completar e
   * retorna o quiz pronto. Resolve o caso `inline` (QUEUE_ENABLED=false)
   * onde o backend já volta `status: 'completed'` na resposta inicial.
   */
  async generateQuizAsync(
    videoId: string,
    dto?: GenerateQuizDto,
    onProgress?: (status: JobStatus['status']) => void,
  ): Promise<Quiz> {
    const enqueued = await this.enqueueQuizGeneration(videoId, dto);

    // Caminho inline (queue desabilitada): backend já executou o trabalho.
    if (enqueued.status === 'completed' && enqueued.resultRef) {
      onProgress?.('completed');
      return this.getById(enqueued.resultRef);
    }

    onProgress?.('queued');
    const finalStatus = await this.pollJob(enqueued.jobId, onProgress);
    const quizId = finalStatus.resultRef;
    if (!quizId) {
      throw new Error('Job completed but quizId missing in resultRef');
    }
    return this.getById(quizId);
  },

  /**
   * @deprecated Backend é assíncrono e retorna 202 + jobId; use
   * `generateQuizAsync` para poll até a geração concluir.
   */
  async generateQuiz(videoId: string, dto?: GenerateQuizDto): Promise<Quiz> {
    return this.generateQuizAsync(videoId, dto);
  },

  async listByVideo(videoId: string): Promise<Quiz[]> {
    try {
      const response = await apiClient.get<Quiz[]>(`/videos/${videoId}/quizzes`);
      return response.data;
    } catch (error) {
      logger.error('[quizzesService] Erro ao listar quizzes:', error);
      return [];
    }
  },

  async getById(quizId: string): Promise<Quiz> {
    const response = await apiClient.get<Quiz>(`/quizzes/${quizId}`);
    logger.log('[quizzesService.getById] raw keys:', Object.keys(response.data ?? {}));
    logger.log('[quizzesService.getById] questions length:', (response.data as any)?.questions?.length);
    return response.data;
  },

  async submit(quizId: string, dto: SubmitQuizDto): Promise<QuizResult> {
    const response = await apiClient.post<QuizResult>(
      `/quizzes/${quizId}/submit`,
      dto
    );
    return response.data;
  },

  /**
   * Verifica server-side se uma resposta está correta — retorna apenas boolean
   * (sem revelar o gabarito). Usado pra disparar feedback visual contextual
   * (LottieFeedback correct/wrong) imediato.
   */
  async checkAnswer(
    quizId: string,
    questionId: string,
    answer: number,
  ): Promise<{ isCorrect: boolean }> {
    const response = await apiClient.post<{ isCorrect: boolean }>(
      `/quizzes/${quizId}/check-answer`,
      { questionId, answer },
    );
    return response.data;
  },

  async listAttempts(quizId: string): Promise<QuizAttempt[]> {
    try {
      const response = await apiClient.get<QuizAttempt[]>(
        `/quizzes/${quizId}/attempts`
      );
      return response.data;
    } catch (error) {
      logger.error('[quizzesService] Erro ao listar tentativas:', error);
      return [];
    }
  },

  async getStats(quizId: string): Promise<QuizStats | null> {
    try {
      const response = await apiClient.get<QuizStats>(
        `/quizzes/${quizId}/stats`
      );
      return response.data;
    } catch (error) {
      logger.error('[quizzesService] Erro ao obter stats:', error);
      return null;
    }
  },
};

export default quizzesService;
