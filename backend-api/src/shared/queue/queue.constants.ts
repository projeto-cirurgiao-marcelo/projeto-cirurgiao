/**
 * Queue names shared between producers (controllers/services) and
 * consumers (processors). Keep in sync with docs/DEPLOY.md queue section.
 */
export const QUEUE_NAMES = {
  SUMMARY: 'ai-summary',
  QUIZ: 'ai-quiz',
  PDF_INGEST: 'library-pdf-ingest',
  CAPTIONS: 'cloudflare-captions',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Envelope every processor can rely on finding in job.data so JobsService
 * can link a job back to its owner and the thing it is acting on. Extend
 * per queue with additional typed fields in each processor.
 */
export interface BaseJobPayload {
  userId: string;
  entityId: string;
  type: QueueName;
}

/**
 * DB-side fields we track for jobs. BullMQ only persists state in Redis,
 * but we expose a stable `GET /jobs/:id` contract that outlives the
 * Redis TTL via the DTO shape below.
 */
export interface JobStatusDto {
  id: string;
  type: QueueName;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'unknown';
  progress: number;
  /** Opaque pointer to the produced artifact (e.g. summary id, quiz id). */
  resultRef?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
