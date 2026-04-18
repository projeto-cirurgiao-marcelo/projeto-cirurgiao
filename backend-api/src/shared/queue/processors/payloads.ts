import { BaseJobPayload, QUEUE_NAMES } from '../queue.constants';

export interface SummaryJobPayload extends BaseJobPayload {
  type: typeof QUEUE_NAMES.SUMMARY;
  videoId: string;
  /** Mirrors the HTTP DTO so the processor can re-invoke the service. */
  dto: Record<string, unknown>;
}

export interface QuizJobPayload extends BaseJobPayload {
  type: typeof QUEUE_NAMES.QUIZ;
  videoId: string;
  dto: Record<string, unknown>;
}

export interface PdfIngestJobPayload extends BaseJobPayload {
  type: typeof QUEUE_NAMES.PDF_INGEST;
  documentId: string;
}

export interface CaptionsJobPayload extends BaseJobPayload {
  type: typeof QUEUE_NAMES.CAPTIONS;
  videoId: string;
  language: string;
}
