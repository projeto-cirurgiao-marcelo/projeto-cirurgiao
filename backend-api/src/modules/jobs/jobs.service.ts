import { Injectable, NotFoundException } from '@nestjs/common';
import { QueueService } from '../../shared/queue/queue.service';
import { JobStatusDto } from '../../shared/queue/queue.constants';

@Injectable()
export class JobsService {
  constructor(private readonly queueService: QueueService) {}

  async getStatus(jobId: string): Promise<JobStatusDto> {
    const status = await this.queueService.getStatus(jobId);
    if (!status) {
      throw new NotFoundException(`Job ${jobId} não encontrado`);
    }
    return status;
  }

  async getCounts() {
    return this.queueService.getAllJobCounts();
  }
}
