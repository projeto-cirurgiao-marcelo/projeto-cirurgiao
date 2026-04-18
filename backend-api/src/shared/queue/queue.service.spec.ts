import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Queue } from 'bullmq';

import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue.constants';

/**
 * QueueService is the one surface AI controllers talk to. Tests cover:
 *   - feature flag off -> fallback runs inline, pseudo-jobId returned
 *   - feature flag off + fallback throws -> error bubbles up (callers keep
 *     their existing error shapes)
 *   - feature flag on -> queue.add() is called with the payload
 *   - getStatus works for inline ids and for real BullMQ ids
 */
describe('QueueService', () => {
  let summaryQueue: DeepMockProxy<Queue>;
  let quizQueue: DeepMockProxy<Queue>;
  let pdfQueue: DeepMockProxy<Queue>;
  let captionsQueue: DeepMockProxy<Queue>;

  function buildService(queueEnabled: boolean) {
    summaryQueue = mockDeep<Queue>();
    quizQueue = mockDeep<Queue>();
    pdfQueue = mockDeep<Queue>();
    captionsQueue = mockDeep<Queue>();

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'QUEUE_ENABLED') return queueEnabled ? 'true' : 'false';
        return undefined;
      }),
    } as unknown as ConfigService;

    return Test.createTestingModule({
      providers: [
        QueueService,
        { provide: ConfigService, useValue: configService },
        { provide: getQueueToken(QUEUE_NAMES.SUMMARY), useValue: summaryQueue },
        { provide: getQueueToken(QUEUE_NAMES.QUIZ), useValue: quizQueue },
        { provide: getQueueToken(QUEUE_NAMES.PDF_INGEST), useValue: pdfQueue },
        { provide: getQueueToken(QUEUE_NAMES.CAPTIONS), useValue: captionsQueue },
      ],
    }).compile();
  }

  describe('QUEUE_ENABLED=false (feature flag off)', () => {
    let service: QueueService;

    beforeEach(async () => {
      const module: TestingModule = await buildService(false);
      service = module.get(QueueService);
    });

    it('isEnabled() reports false', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('runs fallback inline and returns a synthetic inline- jobId', async () => {
      const fallback = jest.fn().mockResolvedValue({ resultRef: 'summary-1' });
      const result = await service.enqueue(
        QUEUE_NAMES.SUMMARY,
        {
          type: QUEUE_NAMES.SUMMARY,
          userId: 'u1',
          entityId: 'v1',
          videoId: 'v1',
          dto: {},
        } as any,
        { fallback },
      );

      expect(fallback).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('completed');
      expect(result.jobId).toMatch(/^inline-/);
      expect(result.resultRef).toBe('summary-1');
      expect(summaryQueue.add).not.toHaveBeenCalled();
    });

    it('propagates errors from the fallback', async () => {
      const fallback = jest
        .fn()
        .mockRejectedValue(new Error('transcription missing'));
      await expect(
        service.enqueue(
          QUEUE_NAMES.QUIZ,
          {
            type: QUEUE_NAMES.QUIZ,
            userId: 'u1',
            entityId: 'v1',
            videoId: 'v1',
            dto: {},
          } as any,
          { fallback },
        ),
      ).rejects.toThrow('transcription missing');
      expect(quizQueue.add).not.toHaveBeenCalled();
    });

    it('getStatus returns a synthetic completed DTO for inline- ids', async () => {
      const status = await service.getStatus('inline-abc');
      expect(status).not.toBeNull();
      expect(status?.status).toBe('completed');
      expect(status?.progress).toBe(100);
    });

    it('getStatus returns null for a non-inline id when queue is off', async () => {
      const status = await service.getStatus('bullmq-real-id');
      expect(status).toBeNull();
    });
  });

  describe('QUEUE_ENABLED=true (feature flag on)', () => {
    let service: QueueService;

    beforeEach(async () => {
      const module: TestingModule = await buildService(true);
      service = module.get(QueueService);
    });

    it('isEnabled() reports true', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('routes each QUEUE_NAMES entry to the right queue.add', async () => {
      summaryQueue.add.mockResolvedValue({ id: 'sum-1' } as any);
      quizQueue.add.mockResolvedValue({ id: 'quiz-1' } as any);
      pdfQueue.add.mockResolvedValue({ id: 'pdf-1' } as any);
      captionsQueue.add.mockResolvedValue({ id: 'cap-1' } as any);

      const fallback = jest.fn(); // should NEVER be called

      const s = await service.enqueue(
        QUEUE_NAMES.SUMMARY,
        { type: QUEUE_NAMES.SUMMARY, userId: 'u', entityId: 'v', videoId: 'v', dto: {} } as any,
        { fallback },
      );
      const q = await service.enqueue(
        QUEUE_NAMES.QUIZ,
        { type: QUEUE_NAMES.QUIZ, userId: 'u', entityId: 'v', videoId: 'v', dto: {} } as any,
        { fallback },
      );
      const p = await service.enqueue(
        QUEUE_NAMES.PDF_INGEST,
        { type: QUEUE_NAMES.PDF_INGEST, userId: 'u', entityId: 'd', documentId: 'd' } as any,
        { fallback },
      );
      const c = await service.enqueue(
        QUEUE_NAMES.CAPTIONS,
        {
          type: QUEUE_NAMES.CAPTIONS,
          userId: 'u',
          entityId: 'v',
          videoId: 'v',
          language: 'pt',
        } as any,
        { fallback },
      );

      expect(summaryQueue.add).toHaveBeenCalledTimes(1);
      expect(quizQueue.add).toHaveBeenCalledTimes(1);
      expect(pdfQueue.add).toHaveBeenCalledTimes(1);
      expect(captionsQueue.add).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
      expect([s.jobId, q.jobId, p.jobId, c.jobId]).toEqual([
        'sum-1',
        'quiz-1',
        'pdf-1',
        'cap-1',
      ]);
      expect(s.status).toBe('queued');
    });

    it('getStatus probes every queue and maps the found job to a DTO', async () => {
      summaryQueue.getJob.mockResolvedValue(null as any);
      quizQueue.getJob.mockResolvedValue({
        id: 'quiz-7',
        getState: jest.fn().mockResolvedValue('active'),
        progress: 42,
        returnvalue: null,
        timestamp: 1_700_000_000_000,
        processedOn: 1_700_000_001_000,
        finishedOn: null,
        failedReason: null,
      } as any);
      pdfQueue.getJob.mockResolvedValue(null as any);
      captionsQueue.getJob.mockResolvedValue(null as any);

      const status = await service.getStatus('quiz-7');
      expect(status).not.toBeNull();
      expect(status?.id).toBe('quiz-7');
      expect(status?.type).toBe(QUEUE_NAMES.QUIZ);
      expect(status?.status).toBe('active');
      expect(status?.progress).toBe(42);
    });

    it('getStatus returns null when no queue knows the id', async () => {
      summaryQueue.getJob.mockResolvedValue(null as any);
      quizQueue.getJob.mockResolvedValue(null as any);
      pdfQueue.getJob.mockResolvedValue(null as any);
      captionsQueue.getJob.mockResolvedValue(null as any);

      const status = await service.getStatus('never-heard-of-it');
      expect(status).toBeNull();
    });

    it('getAllJobCounts aggregates counts from each queue', async () => {
      summaryQueue.getJobCounts.mockResolvedValue({ waiting: 1 } as any);
      quizQueue.getJobCounts.mockResolvedValue({ waiting: 2 } as any);
      pdfQueue.getJobCounts.mockResolvedValue({ completed: 3 } as any);
      captionsQueue.getJobCounts.mockResolvedValue({ failed: 1 } as any);

      const counts = await service.getAllJobCounts();
      expect(counts[QUEUE_NAMES.SUMMARY]).toEqual({ waiting: 1 });
      expect(counts[QUEUE_NAMES.QUIZ]).toEqual({ waiting: 2 });
      expect(counts[QUEUE_NAMES.PDF_INGEST]).toEqual({ completed: 3 });
      expect(counts[QUEUE_NAMES.CAPTIONS]).toEqual({ failed: 1 });
    });
  });
});
