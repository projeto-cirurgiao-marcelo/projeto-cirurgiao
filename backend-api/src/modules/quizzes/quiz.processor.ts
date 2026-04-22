import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { QuizJobPayload } from '../../shared/queue/processors/payloads';
import { QuizzesService } from './quizzes.service';

@Processor(QUEUE_NAMES.QUIZ)
export class QuizProcessor extends WorkerHost {
  private readonly logger = new Logger(QuizProcessor.name);

  constructor(private readonly quizzesService: QuizzesService) {
    super();
  }

  async process(job: Job<QuizJobPayload>): Promise<{ resultRef?: string }> {
    const { videoId, dto, userId } = job.data;
    this.logger.log(`Processing quiz job ${job.id} — video=${videoId} user=${userId}`);
    await job.updateProgress(10);
    const quiz = await this.quizzesService.generateQuiz(videoId, dto as any);
    await job.updateProgress(100);
    return { resultRef: (quiz as any)?.id };
  }
}
