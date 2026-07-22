import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import {
  AiSummariesService,
  INCOMPLETE_SUMMARY_MESSAGE,
} from './ai-summaries.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { VertexAiService, SUMMARY_COMPLETE_SENTINEL } from './vertex-ai.service';
import { VttTextService } from '../../shared/vtt/vtt-text.service';

/** Resultado Vertex válido (STOP + sentinela) — base dos testes felizes. */
const completeResult = (content = 'summary text') => ({
  content: `${content}\n${SUMMARY_COMPLETE_SENTINEL}`,
  finishReason: 'STOP',
  tokenCount: 100,
  totalTokenCount: 100,
  promptTokenCount: 80,
  candidatesTokenCount: 20,
  modelName: 'gemini-2.5-flash',
});

describe('AiSummariesService', () => {
  let service: AiSummariesService;
  let prisma: DeepMockProxy<PrismaService>;
  let vertex: DeepMockProxy<VertexAiService>;
  let vtt: DeepMockProxy<VttTextService>;
  let gamification: DeepMockProxy<GamificationService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    vertex = mockDeep<VertexAiService>();
    vtt = mockDeep<VttTextService>();
    gamification = mockDeep<GamificationService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSummariesService,
        { provide: PrismaService, useValue: prisma },
        { provide: VertexAiService, useValue: vertex },
        { provide: VttTextService, useValue: vtt },
        { provide: GamificationService, useValue: gamification },
      ],
    }).compile();
    service = module.get(AiSummariesService);
  });

  describe('generateSummary', () => {
    it('throws NotFound when the video is missing', async () => {
      prisma.video.findUnique.mockResolvedValue(null);

      await expect(
        service.generateSummary('v1', 'u1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequest when VTT is empty', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue(null as any);

      await expect(
        service.generateSummary('v1', 'u1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects generation when the user already hit the cap (generationCount >= 3)', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue('transcript');
      prisma.videoSummary.findFirst.mockResolvedValue({
        generationCount: 3,
      } as any);

      await expect(
        service.generateSummary('v1', 'u1', {} as any),
      ).rejects.toThrow(BadRequestException);
      expect(vertex.generateSummary).not.toHaveBeenCalled();
    });

    it('assigns next sequential version when no holes exist', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue('transcript');
      prisma.videoSummary.findFirst.mockResolvedValue({ generationCount: 1 } as any);
      prisma.videoSummary.findMany.mockResolvedValue([{ version: 1 }] as any);
      prisma.videoNote.findMany.mockResolvedValue([]);
      vertex.generateSummary.mockResolvedValue(completeResult() as any);
      prisma.videoSummary.create.mockResolvedValue({
        id: 'sum-1',
        version: 2,
        generationCount: 2,
      } as any);

      const result = await service.generateSummary('v1', 'u1', {} as any);

      const createData = prisma.videoSummary.create.mock.calls[0][0].data as any;
      expect(createData.version).toBe(2);
      expect(createData.generationCount).toBe(2);
      // Sentinela é removida antes de persistir
      expect(createData.content).toBe('summary text');
      // remainingGenerations = MAX (3) - generationCount (2) = 1.
      expect(result.remainingGenerations).toBe(1);
    });

    it('fills a version hole (reuses deleted version slot)', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue('transcript');
      prisma.videoSummary.findFirst.mockResolvedValue({ generationCount: 2 } as any);
      // User had v1 and v3, deleted v2 — new generation slots back into v2.
      prisma.videoSummary.findMany.mockResolvedValue([
        { version: 1 },
        { version: 3 },
      ] as any);
      prisma.videoNote.findMany.mockResolvedValue([]);
      vertex.generateSummary.mockResolvedValue(completeResult() as any);
      prisma.videoSummary.create.mockResolvedValue({
        id: 'sum-3',
        version: 2,
        generationCount: 3,
      } as any);

      await service.generateSummary('v1', 'u1', {} as any);

      const createData = prisma.videoSummary.create.mock.calls[0][0].data as any;
      expect(createData.version).toBe(2);
      expect(createData.generationCount).toBe(3);
    });

    it('swallows gamification errors (summary still returned)', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue('transcript');
      prisma.videoSummary.findFirst.mockResolvedValue({ generationCount: 0 } as any);
      prisma.videoSummary.findMany.mockResolvedValue([]);
      prisma.videoNote.findMany.mockResolvedValue([]);
      vertex.generateSummary.mockResolvedValue(completeResult('summary') as any);
      prisma.videoSummary.create.mockResolvedValue({
        id: 'sum-1',
        version: 1,
        generationCount: 1,
      } as any);
      gamification.processAction.mockRejectedValue(new Error('boom'));

      const out = await service.generateSummary('v1', 'u1', {} as any);
      expect(out.id).toBe('sum-1');
    });

    describe('incomplete generation guard', () => {
      beforeEach(() => {
        prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
        vtt.getPlainText.mockResolvedValue('transcript');
        prisma.videoSummary.findFirst.mockResolvedValue({ generationCount: 1 } as any);
        prisma.videoSummary.findMany.mockResolvedValue([{ version: 1 }] as any);
        prisma.videoNote.findMany.mockResolvedValue([]);
      });

      const expectRejectedWithoutSaving = async () => {
        await expect(
          service.generateSummary('v1', 'u1', {} as any),
        ).rejects.toThrow(INCOMPLETE_SUMMARY_MESSAGE);
        expect(prisma.videoSummary.create).not.toHaveBeenCalled();
        expect(gamification.processAction).not.toHaveBeenCalled();
      };

      it('finishReason MAX_TOKENS does not save nor consume a generation', async () => {
        vertex.generateSummary.mockResolvedValue({
          ...completeResult('truncated text'),
          finishReason: 'MAX_TOKENS',
        } as any);

        await expectRejectedWithoutSaving();
      });

      it('missing sentinel does not save nor consume a generation', async () => {
        vertex.generateSummary.mockResolvedValue({
          ...completeResult(),
          content: 'summary text without the marker',
        } as any);

        await expectRejectedWithoutSaving();
      });

      it('empty content does not save nor consume a generation', async () => {
        vertex.generateSummary.mockResolvedValue({
          ...completeResult(),
          content: '   ',
        } as any);

        await expectRejectedWithoutSaving();
      });

      it('valid STOP + sentinel response saves and consumes 1 generation', async () => {
        vertex.generateSummary.mockResolvedValue(completeResult() as any);
        prisma.videoSummary.create.mockResolvedValue({
          id: 'sum-2',
          version: 2,
          generationCount: 2,
        } as any);

        const out = await service.generateSummary('v1', 'u1', {} as any);

        const createData = prisma.videoSummary.create.mock
          .calls[0][0].data as any;
        expect(createData.generationCount).toBe(2);
        expect(createData.content).not.toContain(SUMMARY_COMPLETE_SENTINEL);
        expect(out.remainingGenerations).toBe(1);
        expect(gamification.processAction).toHaveBeenCalled();
      });
    });
  });

  describe('listSummaries', () => {
    it('returns counts + remainingGenerations based on generationCount', async () => {
      prisma.videoSummary.findMany.mockResolvedValue([
        { version: 1, generationCount: 1 },
        { version: 2, generationCount: 2 },
      ] as any);

      const out = await service.listSummaries('v1', 'u1');
      expect(out.count).toBe(2);
      expect(out.maxAllowed).toBe(3);
      expect(out.remainingGenerations).toBe(1);
    });

    it('deleting a summary does not give the generation back', async () => {
      // User generated 3 times, deleted 2 — only 1 summary left but 0 remaining.
      prisma.videoSummary.findMany.mockResolvedValue([
        { version: 1, generationCount: 3 },
      ] as any);

      const out = await service.listSummaries('v1', 'u1');
      expect(out.count).toBe(1);
      expect(out.remainingGenerations).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('throws NotFound when summary does not belong to user', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue(null);
      await expect(service.getSummary('s1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the summary on the happy path', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue({ id: 's1' } as any);
      const out = await service.getSummary('s1', 'u1');
      expect(out).toEqual({ id: 's1' });
    });
  });

  describe('updateSummary / deleteSummary', () => {
    it('updateSummary throws NotFound when summary is missing', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue(null);
      await expect(
        service.updateSummary('s1', 'u1', { content: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('updateSummary writes the new content', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue({ id: 's1' } as any);
      prisma.videoSummary.update.mockResolvedValue({ id: 's1', content: 'x' } as any);

      await service.updateSummary('s1', 'u1', { content: 'x' } as any);

      const data = prisma.videoSummary.update.mock.calls[0][0].data as any;
      expect(data.content).toBe('x');
    });

    it('deleteSummary throws NotFound when missing', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue(null);
      await expect(service.deleteSummary('s1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deleteSummary removes and returns the confirmation message', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue({ id: 's1' } as any);
      prisma.videoSummary.delete.mockResolvedValue({} as any);

      const out = await service.deleteSummary('s1', 'u1');
      expect(prisma.videoSummary.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      expect(out).toEqual({ message: 'Resumo deletado com sucesso' });
    });
  });

  describe('downloadSummary / getRemainingGenerations', () => {
    it('downloadSummary prepends a YAML header with video metadata', async () => {
      const created = new Date('2026-04-18T10:00:00Z');
      const updated = new Date('2026-04-18T11:00:00Z');
      prisma.videoSummary.findFirst.mockResolvedValue({
        id: 's1',
        version: 2,
        content: 'body text',
        createdAt: created,
        updatedAt: updated,
        video: { title: 'Curso X' },
      } as any);

      const out = await service.downloadSummary('s1', 'u1');

      expect(out.content.startsWith('---')).toBe(true);
      expect(out.content).toContain('título: Curso X');
      expect(out.content).toContain('versão: 2');
      expect(out.content).toContain('body text');
      expect(out.filename).toBe('resumo-curso-x-v2.md');
    });

    it('getRemainingGenerations uses the max generationCount, not row count', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue({
        generationCount: 2,
      } as any);

      const out = await service.getRemainingGenerations('v1', 'u1');
      expect(out).toEqual({ used: 2, remaining: 1, maxAllowed: 3 });
      expect(prisma.videoSummary.count).not.toHaveBeenCalled();
    });

    it('getRemainingGenerations returns full quota when user has no summaries', async () => {
      prisma.videoSummary.findFirst.mockResolvedValue(null);

      const out = await service.getRemainingGenerations('v1', 'u1');
      expect(out).toEqual({ used: 0, remaining: 3, maxAllowed: 3 });
    });
  });
});
