import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { SummaryJobPayload } from '../../shared/queue/processors/payloads';
import { AiSummariesService } from './ai-summaries.service';

/**
 * Consumes jobs enqueued by POST /videos/:videoId/summaries/generate
 * when QUEUE_ENABLED=true. Delegates straight to AiSummariesService so
 * the business logic stays in one place.
 */
@Processor(QUEUE_NAMES.SUMMARY)
export class SummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(SummaryProcessor.name);

  constructor(private readonly summariesService: AiSummariesService) {
    super();
  }

  async process(job: Job<SummaryJobPayload>): Promise<{ resultRef?: string }> {
    const { videoId, userId, dto } = job.data;
    this.logger.log(`Processing summary job ${job.id} — video=${videoId} user=${userId}`);
    await job.updateProgress(10);
    const summary = await this.summariesService.generateSummary(
      videoId,
      userId,
      dto as any,
    );
    await job.updateProgress(100);
    return { resultRef: summary?.id };
  }
}
