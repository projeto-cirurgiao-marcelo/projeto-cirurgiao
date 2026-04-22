import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { CaptionsJobPayload } from '../../shared/queue/processors/payloads';
import { CaptionsService } from './captions.service';

@Processor(QUEUE_NAMES.CAPTIONS)
export class CaptionsProcessor extends WorkerHost {
  private readonly logger = new Logger(CaptionsProcessor.name);

  constructor(private readonly captionsService: CaptionsService) {
    super();
  }

  async process(job: Job<CaptionsJobPayload>): Promise<{ resultRef?: string }> {
    const { videoId, language, userId } = job.data;
    this.logger.log(
      `Processing captions job ${job.id} — video=${videoId} lang=${language} user=${userId}`,
    );
    await job.updateProgress(10);
    const result = await this.captionsService.generateCaption(videoId, language as any);
    await job.updateProgress(100);
    return { resultRef: (result as any)?.label };
  }
}
