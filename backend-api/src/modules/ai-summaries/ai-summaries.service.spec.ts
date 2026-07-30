import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import {
  AiSummariesService,
  INCOMPLETE_SUMMARY_MESSAGE,
  GENERATION_LIMIT_MESSAGE,
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
  /** true enquanto o callback de prisma.$transaction está rodando */
  let inTransaction = false;
  /** valor de `inTransaction` no momento em que a quota foi incrementada */
  let quotaBumpedInTransaction: boolean | null = null;

  /**
   * Fake em memória da tabela de quota (uma linha user×video), incluindo o
   * guard `generationCount < 3` do incremento condicional.
   * `used = null` => aluno ainda não tem linha de quota.
   */
  const stubQuota = (used: number | null) => {
    let row: { generationCount: number } | null =
      used === null ? null : { generationCount: used };

    prisma.videoSummaryGenerationQuota.findUnique.mockImplementation(
      (async () => row) as any,
    );
    prisma.videoSummaryGenerationQuota.updateMany.mockImplementation((async () => {
      if (row && row.generationCount < 3) {
        row = { generationCount: row.generationCount + 1 };
        quotaBumpedInTransaction = inTransaction;
        return { count: 1 };
      }
      return { count: 0 };
    }) as any);
    prisma.videoSummaryGenerationQuota.create.mockImplementation((async () => {
      row = { generationCount: 1 };
      return row;
    }) as any);
  };

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

    // $transaction executa o callback com o próprio mock como `tx`; a flag
    // permite assertar que uma escrita aconteceu dentro da transação.
    inTransaction = false;
    quotaBumpedInTransaction = null;
    prisma.$transaction.mockImplementation((async (cb: any) => {
      inTransaction = true;
      try {
        return await cb(prisma);
      } finally {
        inTransaction = false;
      }
    }) as any);
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

    it('rejects generation when the user already hit the cap (quota >= 3)', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue('transcript');
      stubQuota(3);

      await expect(
        service.generateSummary('v1', 'u1', {} as any),
      ).rejects.toThrow(GENERATION_LIMIT_MESSAGE);
      expect(vertex.generateSummary).not.toHaveBeenCalled();
    });

    it('blocks the 4th generation even with zero summaries left (quota survives delete)', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue('transcript');
      // Aluno gerou 3x e deletou todos os resumos: nenhuma linha viva, quota cheia.
      stubQuota(3);
      prisma.videoSummary.findMany.mockResolvedValue([]);

      await expect(
        service.generateSummary('v1', 'u1', {} as any),
      ).rejects.toThrow(BadRequestException);
      expect(vertex.generateSummary).not.toHaveBeenCalled();
      expect(prisma.videoSummary.create).not.toHaveBeenCalled();
    });

    it('assigns next sequential version when no holes exist', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 't' } as any);
      vtt.getPlainText.mockResolvedValue('transcript');
      stubQuota(1);
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
      stubQuota(2);
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
      stubQuota(null);
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
        stubQuota(1);
        prisma.videoSummary.findMany.mockResolvedValue([{ version: 1 }] as any);
        prisma.videoNote.findMany.mockResolvedValue([]);
      });

      const expectRejectedWithoutSaving = async () => {
        await expect(
          service.generateSummary('v1', 'u1', {} as any),
        ).rejects.toThrow(INCOMPLETE_SUMMARY_MESSAGE);
        expect(prisma.videoSummary.create).not.toHaveBeenCalled();
        expect(gamification.processAction).not.toHaveBeenCalled();
        // Quota intacta: nem incremento nem criação de linha.
        expect(
          prisma.videoSummaryGenerationQuota.updateMany,
        ).not.toHaveBeenCalled();
        expect(
          prisma.videoSummaryGenerationQuota.create,
        ).not.toHaveBeenCalled();
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

    describe('persistent quota', () => {
      beforeEach(() => {
        prisma.video.findUnique.mockResolvedValue({
          id: 'v1',
          title: 't',
        } as any);
        vtt.getPlainText.mockResolvedValue('transcript');
        prisma.videoSummary.findMany.mockResolvedValue([]);
        prisma.videoNote.findMany.mockResolvedValue([]);
        vertex.generateSummary.mockResolvedValue(completeResult() as any);
      });

      it('creates the summary and bumps the quota inside the same transaction', async () => {
        stubQuota(1);
        let summaryCreatedInTransaction: boolean | null = null;
        prisma.videoSummary.create.mockImplementation((async () => {
          summaryCreatedInTransaction = inTransaction;
          return { id: 'sum-2', version: 2, generationCount: 2 };
        }) as any);

        const out = await service.generateSummary('v1', 'u1', {} as any);

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(quotaBumpedInTransaction).toBe(true);
        expect(summaryCreatedInTransaction).toBe(true);
        // Quota 1 -> 2: o resumo grava o mesmo contador e sobra 1 geração.
        expect(
          (prisma.videoSummary.create.mock.calls[0][0].data as any)
            .generationCount,
        ).toBe(2);
        expect(out.remainingGenerations).toBe(1);
      });

      it('propagates a failed summary write so the quota bump rolls back with it', async () => {
        stubQuota(1);
        prisma.videoSummary.create.mockRejectedValue(new Error('db down'));

        await expect(
          service.generateSummary('v1', 'u1', {} as any),
        ).rejects.toThrow('db down');
        // A escrita da quota aconteceu dentro da mesma transação que falhou —
        // o rollback é do Postgres, nada é confirmado fora dela.
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(gamification.processAction).not.toHaveBeenCalled();
      });

      it('creates the quota row on the first generation', async () => {
        stubQuota(null);
        prisma.videoSummary.create.mockResolvedValue({
          id: 'sum-1',
          version: 1,
          generationCount: 1,
        } as any);

        const out = await service.generateSummary('v1', 'u1', {} as any);

        const quotaData = prisma.videoSummaryGenerationQuota.create.mock
          .calls[0][0].data as any;
        expect(quotaData).toEqual({
          userId: 'u1',
          videoId: 'v1',
          generationCount: 1,
        });
        expect(out.remainingGenerations).toBe(2);
      });

      it('recovers from P2002 when a concurrent request creates the quota row first', async () => {
        stubQuota(null);
        // A outra requisição criou a linha entre o findUnique e o create.
        prisma.videoSummaryGenerationQuota.create.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('unique violation', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        );
        prisma.videoSummaryGenerationQuota.updateMany
          .mockResolvedValueOnce({ count: 0 } as any) // bump inicial: sem linha
          .mockResolvedValueOnce({ count: 1 } as any); // retry: linha já existe
        prisma.videoSummaryGenerationQuota.findUnique
          .mockResolvedValueOnce(null as any) // gate
          .mockResolvedValueOnce(null as any) // dentro da tx, antes do create
          .mockResolvedValueOnce({ generationCount: 1 } as any); // após o retry
        prisma.videoSummary.create.mockResolvedValue({
          id: 'sum-1',
          version: 1,
          generationCount: 1,
        } as any);

        const out = await service.generateSummary('v1', 'u1', {} as any);

        expect(
          (prisma.videoSummary.create.mock.calls[0][0].data as any)
            .generationCount,
        ).toBe(1);
        expect(out.remainingGenerations).toBe(2);
      });

      it('fails with the limit message when the P2002 retry cannot bump either', async () => {
        stubQuota(null);
        prisma.videoSummaryGenerationQuota.create.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('unique violation', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        );
        // Retry não casa: a corrida foi resolvida como limite, nunca como 500.
        prisma.videoSummaryGenerationQuota.updateMany.mockResolvedValue({
          count: 0,
        } as any);

        await expect(
          service.generateSummary('v1', 'u1', {} as any),
        ).rejects.toThrow(GENERATION_LIMIT_MESSAGE);
        expect(prisma.videoSummary.create).not.toHaveBeenCalled();
      });

      it('rethrows non-P2002 errors from the quota create', async () => {
        stubQuota(null);
        prisma.videoSummaryGenerationQuota.create.mockRejectedValue(
          new Error('connection reset'),
        );

        await expect(
          service.generateSummary('v1', 'u1', {} as any),
        ).rejects.toThrow('connection reset');
        expect(prisma.videoSummary.create).not.toHaveBeenCalled();
      });

      it('loses the race when a concurrent request consumed the last generation', async () => {
        // Gate passa com 2/3, mas o incremento condicional (lt: 3) não casa:
        // a outra requisição já levou a terceira geração.
        stubQuota(2);
        prisma.videoSummaryGenerationQuota.updateMany.mockResolvedValue({
          count: 0,
        } as any);

        await expect(
          service.generateSummary('v1', 'u1', {} as any),
        ).rejects.toThrow(GENERATION_LIMIT_MESSAGE);
        expect(vertex.generateSummary).toHaveBeenCalled();
        expect(prisma.videoSummary.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('listSummaries', () => {
    it('returns counts + remainingGenerations based on the quota', async () => {
      prisma.videoSummary.findMany.mockResolvedValue([
        { version: 1, generationCount: 1 },
        { version: 2, generationCount: 2 },
      ] as any);
      stubQuota(2);

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
      stubQuota(3);

      const out = await service.listSummaries('v1', 'u1');
      expect(out.count).toBe(1);
      expect(out.remainingGenerations).toBe(0);
    });

    it('deleting ALL summaries does not give generations back', async () => {
      // Caso-limite que motivou a quota persistente: nenhuma linha viva.
      prisma.videoSummary.findMany.mockResolvedValue([]);
      stubQuota(3);

      const out = await service.listSummaries('v1', 'u1');
      expect(out.count).toBe(0);
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

    it('getRemainingGenerations reads the quota, not the summary rows', async () => {
      stubQuota(2);

      const out = await service.getRemainingGenerations('v1', 'u1');
      expect(out).toEqual({ used: 2, remaining: 1, maxAllowed: 3 });
      expect(prisma.videoSummary.count).not.toHaveBeenCalled();
      expect(prisma.videoSummary.findFirst).not.toHaveBeenCalled();
    });

    it('getRemainingGenerations returns full quota when user never generated', async () => {
      stubQuota(null);

      const out = await service.getRemainingGenerations('v1', 'u1');
      expect(out).toEqual({ used: 0, remaining: 3, maxAllowed: 3 });
    });

    it('getRemainingGenerations keeps used=3 after every summary was deleted', async () => {
      stubQuota(3);
      prisma.videoSummary.findMany.mockResolvedValue([]);

      const out = await service.getRemainingGenerations('v1', 'u1');
      expect(out).toEqual({ used: 3, remaining: 0, maxAllowed: 3 });
    });

    it('deleteSummary never touches the quota', async () => {
      stubQuota(3);
      prisma.videoSummary.findFirst.mockResolvedValue({ id: 's1' } as any);
      prisma.videoSummary.delete.mockResolvedValue({} as any);

      await service.deleteSummary('s1', 'u1');

      expect(
        prisma.videoSummaryGenerationQuota.updateMany,
      ).not.toHaveBeenCalled();
      expect(prisma.videoSummaryGenerationQuota.update).not.toHaveBeenCalled();
      expect(prisma.videoSummaryGenerationQuota.delete).not.toHaveBeenCalled();
      expect(
        await service.getRemainingGenerations('v1', 'u1'),
      ).toEqual({ used: 3, remaining: 0, maxAllowed: 3 });
    });
  });
});
