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
      throw new Error(data.error || 'Job de geração de quiz falhou');
    }
    await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
  }
  throw new Error('Timeout aguardando geração do quiz');
}

export const quizzesService = {
  async generateQuiz(videoId: string, dto?: GenerateQuizDto): Promise<Quiz> {
    const response = await apiClient.post<Quiz | JobDescriptor>(
      `/videos/${videoId}/quizzes/generate`,
      dto || {}
    );
    const payload = response.data as any;

    if (payload && 'jobId' in payload) {
      let job = payload as JobDescriptor;
      if (job.status !== 'completed' && job.status !== 'failed') {
        job = await pollJobUntilComplete(job.jobId);
      }
      if (job.status === 'failed' || !job.resultRef) {
        throw new Error(job.error || 'Quiz nao foi gerado (sem resultRef)');
      }
      const { data: quiz } = await apiClient.get<Quiz>(`/quizzes/${job.resultRef}`);
      return quiz;
    }

    return payload as Quiz;
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
    return response.data;
  },

  async submit(quizId: string, dto: SubmitQuizDto): Promise<QuizResult> {
    const response = await apiClient.post<QuizResult>(
      `/quizzes/${quizId}/submit`,
      dto
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
