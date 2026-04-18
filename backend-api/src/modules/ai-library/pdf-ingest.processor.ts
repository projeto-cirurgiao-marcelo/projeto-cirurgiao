import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { PdfIngestJobPayload } from '../../shared/queue/processors/payloads';
import { KnowledgeIngestionService } from './services/knowledge-ingestion.service';

/**
 * Heavier processor — parses a PDF, chunks it, and generates Vertex
 * embeddings for every chunk. Kept off the request thread so the admin
 * ingest endpoint can return quickly.
 */
@Processor(QUEUE_NAMES.PDF_INGEST)
export class PdfIngestProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfIngestProcessor.name);

  constructor(private readonly ingestionService: KnowledgeIngestionService) {
    super();
  }

  async process(job: Job<PdfIngestJobPayload>): Promise<{ resultRef?: string }> {
    const { documentId, userId } = job.data;
    this.logger.log(
      `Processing PDF ingest job ${job.id} — document=${documentId} user=${userId}`,
    );
    await job.updateProgress(10);
    await this.ingestionService.processDocument(documentId);
    await job.updateProgress(100);
    return { resultRef: documentId };
  }
}
