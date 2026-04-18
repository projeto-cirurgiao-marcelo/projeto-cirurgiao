import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { randomUUID } from 'crypto';
import {
  BaseJobPayload,
  JobStatusDto,
  QUEUE_NAMES,
  QueueName,
} from './queue.constants';
import { isQueueEnabled } from './queue.config';

/**
 * Façade used by AI controllers to enqueue work. Keeps callers ignorant
 * of BullMQ specifics and honours the `QUEUE_ENABLED` flag.
 *
 * When the flag is off, `enqueue()` executes the provided `fallback`
 * synchronously and fabricates a pseudo-job id so the HTTP response
 * shape stays identical — frontends do not have to branch on whether
 * the queue is live.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly enabled: boolean;
  private readonly queues: Record<QueueName, Queue>;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.SUMMARY) summaryQueue: Queue,
    @InjectQueue(QUEUE_NAMES.QUIZ) quizQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PDF_INGEST) pdfIngestQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CAPTIONS) captionsQueue: Queue,
  ) {
    this.enabled = isQueueEnabled(this.configService);
    this.queues = {
      [QUEUE_NAMES.SUMMARY]: summaryQueue,
      [QUEUE_NAMES.QUIZ]: quizQueue,
      [QUEUE_NAMES.PDF_INGEST]: pdfIngestQueue,
      [QUEUE_NAMES.CAPTIONS]: captionsQueue,
    };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enqueue a job. Returns a jobId the client can poll via GET /jobs/:id.
   *
   * When the feature flag is off, runs `fallback()` inline and returns a
   * synthetic jobId. Callers see the same response shape regardless.
   */
  async enqueue<T extends BaseJobPayload>(
    name: QueueName,
    payload: T,
    opts: {
      /** Ran synchronously when the queue is disabled (QUEUE_ENABLED=false). */
      fallback: () => Promise<{ resultRef?: string }>;
      bullOptions?: JobsOptions;
    },
  ): Promise<{ jobId: string; status: 'queued' | 'completed'; resultRef?: string }> {
    if (!this.enabled) {
      this.logger.debug(
        `QUEUE_ENABLED=false — running ${name} inline for user=${payload.userId} entity=${payload.entityId}`,
      );
      try {
        const result = await opts.fallback();
        return {
          jobId: `inline-${randomUUID()}`,
          status: 'completed',
          resultRef: result.resultRef,
        };
      } catch (err) {
        this.logger.error(`Inline fallback for ${name} failed`, err as any);
        throw err;
      }
    }

    const queue = this.queues[name];
    const job = await queue.add(name, payload, opts.bullOptions);
    this.logger.log(`Enqueued ${name} job ${job.id} for user=${payload.userId}`);
    return { jobId: String(job.id), status: 'queued' };
  }

  /**
   * Look up a job's state across all queues. BullMQ indexes jobs by id
   * inside a specific queue, so we probe each one. For inline fallback
   * jobs (id prefix `inline-`) we return a completed-static DTO.
   */
  async getStatus(jobId: string): Promise<JobStatusDto | null> {
    if (jobId.startsWith('inline-')) {
      const now = new Date();
      return {
        id: jobId,
        type: QUEUE_NAMES.SUMMARY, // Unknown at lookup time; callers should rely on the original 202 response if they need the type.
        status: 'completed',
        progress: 100,
        createdAt: now,
        updatedAt: now,
      };
    }
    if (!this.enabled) {
      return null;
    }

    for (const [name, queue] of Object.entries(this.queues) as Array<
      [QueueName, Queue]
    >) {
      const job = await queue.getJob(jobId);
      if (!job) continue;
      const state = await job.getState();
      const status = this.mapState(state);
      return {
        id: String(job.id),
        type: name,
        status,
        progress: typeof job.progress === 'number' ? job.progress : 0,
        resultRef:
          job.returnvalue && typeof job.returnvalue === 'object'
            ? (job.returnvalue as any).resultRef
            : undefined,
        error: job.failedReason || undefined,
        createdAt: new Date(job.timestamp),
        updatedAt: new Date(
          job.finishedOn ?? job.processedOn ?? job.timestamp,
        ),
      };
    }

    return null;
  }

  /**
   * getJobCounts across all queues — used by the dev dashboard / smoke
   * tests to sanity-check the queue is wired.
   */
  async getAllJobCounts(): Promise<Record<QueueName, Record<string, number>>> {
    if (!this.enabled) {
      return {
        [QUEUE_NAMES.SUMMARY]: { disabled: 1 },
        [QUEUE_NAMES.QUIZ]: { disabled: 1 },
        [QUEUE_NAMES.PDF_INGEST]: { disabled: 1 },
        [QUEUE_NAMES.CAPTIONS]: { disabled: 1 },
      };
    }
    const entries = await Promise.all(
      (Object.entries(this.queues) as Array<[QueueName, Queue]>).map(
        async ([name, queue]) => [name, await queue.getJobCounts()] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<QueueName, Record<string, number>>;
  }

  private mapState(
    state: string,
  ): 'queued' | 'active' | 'completed' | 'failed' | 'unknown' {
    switch (state) {
      case 'waiting':
      case 'delayed':
      case 'waiting-children':
      case 'prioritized':
        return 'queued';
      case 'active':
        return 'active';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'unknown';
    }
  }
}
