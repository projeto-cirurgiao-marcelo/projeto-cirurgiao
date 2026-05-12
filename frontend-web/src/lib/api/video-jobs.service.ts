/**
 * Video pipeline jobs (R2 inbox/ → Cloud Run encode → R2 videos/).
 * Reads from NestJS /api/v1/jobs/video-processing (admin only).
 */
import { apiClient } from './client';

export interface VideoProcessingJob {
  id: string;
  sourceKey: string;
  destinationKey: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  profiles: string[];
  durationSec: number | null;
  filesUploaded: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listVideoJobs(limit = 50): Promise<VideoProcessingJob[]> {
  const res = await apiClient.get<VideoProcessingJob[]>('/jobs/video-processing', {
    params: { limit },
  });
  return res.data;
}

export async function deleteVideoJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/video-processing/${id}`);
}

export async function deleteFailedVideoJobs(): Promise<{ deleted: number }> {
  const res = await apiClient.delete<{ deleted: number }>(
    '/jobs/video-processing/failed',
  );
  return res.data;
}
