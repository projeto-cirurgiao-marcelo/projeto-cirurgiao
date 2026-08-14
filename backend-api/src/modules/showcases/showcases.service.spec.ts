import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Prisma } from '@prisma/client';

import { ShowcasesService } from './showcases.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';

function makeShowcase(overrides: Record<string, any> = {}) {
  return {
    id: 'showcase-1',
    title: 'Castração Descomplicada',
    slug: 'castracao-descomplicada',
    description: null,
    thumbnail: null,
    isPublished: true,
    position: 0,
    externalProductId: null,
    grantsAllContent: false,
    previewSeconds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as any;
}

describe('ShowcasesService', () => {
  let service: ShowcasesService;
  let prisma: DeepMockProxy<PrismaService>;
  let audit: DeepMockProxy<AuditService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    audit = mockDeep<AuditService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowcasesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ShowcasesService);
  });

  // ============================================
  // addModuleVideos — atalho "adicionar módulo inteiro"
  // ============================================
  describe('addModuleVideos', () => {
    beforeEach(() => {
      // assertExists
      prisma.showcase.findFirst.mockResolvedValue(makeShowcase());
    });

    it('materializa uma linha por aula, descendo em submódulos por padrão (Manual de Suturas: 23 aulas em 2 submódulos)', async () => {
      prisma.module.findFirst.mockResolvedValue({
        id: 'mod-suturas',
        title: 'Manual de Suturas',
      } as any);
      prisma.module.findMany.mockResolvedValue([
        { id: 'sub-1' },
        { id: 'sub-2' },
      ] as any);
      const videos = Array.from({ length: 23 }, (_, i) => ({ id: `video-${i}` }));
      prisma.video.findMany.mockResolvedValue(videos as any);
      prisma.showcaseVideo.createMany.mockResolvedValue({ count: 23 });

      const result = await service.addModuleVideos('showcase-1', {
        moduleId: 'mod-suturas',
      } as any);

      // Buscou os filhos do módulo raiz…
      expect(prisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentModuleId: 'mod-suturas', deletedAt: null },
        }),
      );
      // …e as aulas do raiz + 2 submódulos, só publicadas e não deletadas.
      const videoWhere = prisma.video.findMany.mock.calls[0][0]!.where as any;
      expect(videoWhere.moduleId.in).toEqual(['mod-suturas', 'sub-1', 'sub-2']);
      expect(videoWhere.deletedAt).toBeNull();
      expect(videoWhere.isPublished).toBe(true);

      // Uma linha materializada por aula, todas na vitrine.
      const createArgs = prisma.showcaseVideo.createMany.mock.calls[0][0] as any;
      expect(createArgs.data).toHaveLength(23);
      expect(createArgs.data.every((r: any) => r.showcaseId === 'showcase-1')).toBe(true);
      expect(result).toEqual({ added: 23, requested: 23, moduleTitle: 'Manual de Suturas' });
    });

    it('includeSubmodules=false não desce nos filhos', async () => {
      prisma.module.findFirst.mockResolvedValue({ id: 'mod-1', title: 'Módulo' } as any);
      prisma.video.findMany.mockResolvedValue([{ id: 'v1' }] as any);
      prisma.showcaseVideo.createMany.mockResolvedValue({ count: 1 });

      await service.addModuleVideos('showcase-1', {
        moduleId: 'mod-1',
        includeSubmodules: false,
      } as any);

      expect(prisma.module.findMany).not.toHaveBeenCalled();
      const videoWhere = prisma.video.findMany.mock.calls[0][0]!.where as any;
      expect(videoWhere.moduleId.in).toEqual(['mod-1']);
    });

    it('é idempotente: rodar duas vezes não duplica (skipDuplicates + count real do banco)', async () => {
      prisma.module.findFirst.mockResolvedValue({ id: 'mod-1', title: 'Módulo' } as any);
      prisma.module.findMany.mockResolvedValue([]);
      prisma.video.findMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }] as any);

      // 1ª rodada insere as 2; 2ª rodada o banco pula as duplicadas.
      prisma.showcaseVideo.createMany.mockResolvedValueOnce({ count: 2 });
      const first = await service.addModuleVideos('showcase-1', { moduleId: 'mod-1' } as any);
      prisma.showcaseVideo.createMany.mockResolvedValueOnce({ count: 0 });
      const second = await service.addModuleVideos('showcase-1', { moduleId: 'mod-1' } as any);

      expect(first.added).toBe(2);
      expect(second.added).toBe(0);
      for (const call of prisma.showcaseVideo.createMany.mock.calls) {
        expect((call[0] as any).skipDuplicates).toBe(true);
      }
    });

    it('só inclui não publicadas quando includeUnpublished=true', async () => {
      prisma.module.findFirst.mockResolvedValue({ id: 'mod-1', title: 'Módulo' } as any);
      prisma.module.findMany.mockResolvedValue([]);
      prisma.video.findMany.mockResolvedValue([]);

      await service.addModuleVideos('showcase-1', {
        moduleId: 'mod-1',
        includeUnpublished: true,
      } as any);

      const videoWhere = prisma.video.findMany.mock.calls[0][0]!.where as any;
      expect(videoWhere.isPublished).toBeUndefined();
    });

    it('módulo vazio retorna added 0 sem tocar em createMany', async () => {
      prisma.module.findFirst.mockResolvedValue({ id: 'mod-1', title: 'Vazio' } as any);
      prisma.module.findMany.mockResolvedValue([]);
      prisma.video.findMany.mockResolvedValue([]);

      const result = await service.addModuleVideos('showcase-1', { moduleId: 'mod-1' } as any);

      expect(result).toEqual({ added: 0, requested: 0, moduleTitle: 'Vazio' });
      expect(prisma.showcaseVideo.createMany).not.toHaveBeenCalled();
    });

    it('módulo inexistente ou deletado → NotFound', async () => {
      prisma.module.findFirst.mockResolvedValue(null);

      await expect(
        service.addModuleVideos('showcase-1', { moduleId: 'nope' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // addVideos / removeVideo
  // ============================================
  describe('addVideos', () => {
    beforeEach(() => {
      prisma.showcase.findFirst.mockResolvedValue(makeShowcase());
    });

    it('rejeita ids inexistentes com erro legível antes do createMany', async () => {
      prisma.video.findMany.mockResolvedValue([{ id: 'v1' }] as any);

      await expect(
        service.addVideos('showcase-1', { videoIds: ['v1', 'v-fantasma'] } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.showcaseVideo.createMany).not.toHaveBeenCalled();
    });

    it('insere com skipDuplicates (re-adicionar não duplica nem explode)', async () => {
      prisma.video.findMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }] as any);
      prisma.showcaseVideo.createMany.mockResolvedValue({ count: 1 });

      const result = await service.addVideos('showcase-1', { videoIds: ['v1', 'v2'] } as any);

      const args = prisma.showcaseVideo.createMany.mock.calls[0][0] as any;
      expect(args.skipDuplicates).toBe(true);
      expect(result).toEqual({ added: 1, requested: 2 });
    });
  });

  describe('removeVideo', () => {
    beforeEach(() => {
      prisma.showcase.findFirst.mockResolvedValue(makeShowcase());
    });

    it('remove só a linha daquela aula (delete pontual pela chave composta), não afeta as outras do módulo', async () => {
      prisma.showcaseVideo.delete.mockResolvedValue({} as any);

      const result = await service.removeVideo('showcase-1', 'video-7');

      expect(prisma.showcaseVideo.delete).toHaveBeenCalledWith({
        where: { showcaseId_videoId: { showcaseId: 'showcase-1', videoId: 'video-7' } },
      });
      // Nunca um deleteMany varrendo o módulo inteiro.
      expect(prisma.showcaseVideo.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ removed: true });
    });

    it('aula que não está na vitrine → NotFound (P2025 traduzido)', async () => {
      prisma.showcaseVideo.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.removeVideo('showcase-1', 'video-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // listOrphanVideos — o contrapeso da lista explícita
  // ============================================
  describe('listOrphanVideos', () => {
    it('órfã = publicada, viva e sem vitrine que conte — grantsAllContent NÃO conta como cobertura', async () => {
      prisma.video.findMany.mockResolvedValue([]);

      await service.listOrphanVideos();

      const where = prisma.video.findMany.mock.calls[0][0]!.where as any;
      expect(where.deletedAt).toBeNull();
      expect(where.isPublished).toBe(true);
      // Se a vitrine "pós" (grantsAllContent) contasse, a lista zerava e o
      // painel nunca acusaria aula invisível pros compradores avulsos.
      expect(where.showcases).toEqual({
        none: { showcase: { grantsAllContent: false } },
      });
    });

    it('filtra por curso quando courseId vem', async () => {
      prisma.video.findMany.mockResolvedValue([]);

      await service.listOrphanVideos('course-9');

      const where = prisma.video.findMany.mock.calls[0][0]!.where as any;
      expect(where.module).toEqual({ courseId: 'course-9' });
    });
  });

  // ============================================
  // Capa herdada — fallback pro módulo da primeira aula
  // ============================================
  describe('listMine — thumbnail herdada', () => {
    function makeEnt(showcase: Record<string, any>) {
      return {
        showcase: {
          description: null,
          thumbnail: null,
          grantsAllContent: false,
          position: 0,
          _count: { videos: 5 },
          ...showcase,
        },
      } as any;
    }

    function makeArtRow(showcaseId: string, module: Record<string, any>) {
      return {
        showcaseId,
        video: {
          module: {
            thumbnailHorizontal: null,
            thumbnailVertical: null,
            thumbnail: null,
            ...module,
          },
        },
      } as any;
    }

    it('herda a arte do módulo da primeira aula, na cascata horizontal → vertical → thumbnail', async () => {
      prisma.entitlement.findMany.mockResolvedValue([
        makeEnt({ id: 's1', title: 'A', slug: 'a' }),
        makeEnt({ id: 's2', title: 'B', slug: 'b' }),
      ]);
      prisma.showcaseVideo.findMany.mockResolvedValue([
        makeArtRow('s1', { thumbnailHorizontal: 'h.png', thumbnailVertical: 'v.png' }),
        makeArtRow('s2', { thumbnailVertical: 'v2.png', thumbnail: 't2.png' }),
      ]);

      const result = await service.listMine('user-1');

      expect(result.showcases.find((s) => s.id === 's1')!.thumbnail).toBe('h.png');
      expect(result.showcases.find((s) => s.id === 's2')!.thumbnail).toBe('v2.png');
    });

    it('resolve N vitrines num lote só — nunca uma query por vitrine', async () => {
      prisma.entitlement.findMany.mockResolvedValue([
        makeEnt({ id: 's1', title: 'A', slug: 'a' }),
        makeEnt({ id: 's2', title: 'B', slug: 'b' }),
        makeEnt({ id: 's3', title: 'C', slug: 'c', thumbnail: 'propria.png' }),
      ]);
      prisma.showcaseVideo.findMany.mockResolvedValue([]);

      await service.listMine('user-1');

      expect(prisma.showcaseVideo.findMany).toHaveBeenCalledTimes(1);
      const args = prisma.showcaseVideo.findMany.mock.calls[0][0] as any;
      // Só as sem capa própria entram no lote…
      expect(args.where.showcaseId.in).toEqual(['s1', 's2']);
      // …e a ordem é determinística: addedAt com videoId de desempate
      // (createMany de módulo inteiro grava tudo com o mesmo addedAt).
      expect(args.orderBy).toEqual([{ addedAt: 'asc' }, { videoId: 'asc' }]);
    });

    it('capa própria vence — vitrine com thumbnail nem entra no lote', async () => {
      prisma.entitlement.findMany.mockResolvedValue([
        makeEnt({ id: 's1', title: 'A', slug: 'a', thumbnail: 'propria.png' }),
      ]);
      prisma.showcaseVideo.findMany.mockResolvedValue([
        makeArtRow('s1', { thumbnailHorizontal: 'modulo.png' }),
      ]);

      const result = await service.listMine('user-1');

      expect(result.showcases[0].thumbnail).toBe('propria.png');
      expect(prisma.showcaseVideo.findMany).not.toHaveBeenCalled();
    });

    it('primeira aula com módulo sem arte → sem imagem (NÃO cai pra aula seguinte)', async () => {
      prisma.entitlement.findMany.mockResolvedValue([
        makeEnt({ id: 's1', title: 'A', slug: 'a' }),
      ]);
      prisma.showcaseVideo.findMany.mockResolvedValue([
        makeArtRow('s1', {}),
        makeArtRow('s1', { thumbnailHorizontal: 'segunda-aula.png' }),
      ]);

      const result = await service.listMine('user-1');

      // Se caísse pra segunda aula, a capa mudaria quando a curadoria
      // mexesse numa aula do meio.
      expect(result.showcases[0].thumbnail).toBeNull();
    });

    it('vitrine sem aula nenhuma não quebra — thumbnail null', async () => {
      prisma.entitlement.findMany.mockResolvedValue([
        makeEnt({ id: 's1', title: 'A', slug: 'a', _count: { videos: 0 } }),
      ]);
      prisma.showcaseVideo.findMany.mockResolvedValue([]);

      const result = await service.listMine('user-1');

      expect(result.showcases[0].thumbnail).toBeNull();
    });
  });

  describe('findMineBySlug — thumbnail herdada', () => {
    function makeDetailEnt(showcase: Record<string, any>) {
      return {
        showcase: {
          id: 's1',
          title: 'A',
          slug: 'a',
          description: null,
          thumbnail: null,
          videos: [],
          ...showcase,
        },
      } as any;
    }

    const videoWithModuleArt = (module: Record<string, any>) => ({
      video: {
        id: 'v1',
        title: 'Aula',
        duration: 60,
        thumbnailUrl: null,
        module: {
          id: 'm1',
          title: 'Módulo',
          thumbnail: null,
          thumbnailVertical: null,
          thumbnailHorizontal: null,
          course: { id: 'c1', title: 'Curso' },
          ...module,
        },
      },
    });

    it('herda do módulo da primeira aula quando não há capa própria', async () => {
      prisma.entitlement.findFirst.mockResolvedValue(
        makeDetailEnt({
          videos: [videoWithModuleArt({ thumbnailHorizontal: 'modulo.png' })],
        }),
      );

      const result = await service.findMineBySlug('user-1', 'a');

      expect(result.thumbnail).toBe('modulo.png');
    });

    it('capa própria sobrescreve a herdada', async () => {
      prisma.entitlement.findFirst.mockResolvedValue(
        makeDetailEnt({
          thumbnail: 'propria.png',
          videos: [videoWithModuleArt({ thumbnailHorizontal: 'modulo.png' })],
        }),
      );

      const result = await service.findMineBySlug('user-1', 'a');

      expect(result.thumbnail).toBe('propria.png');
    });
  });

  // ============================================
  // archive / restore — soft-delete preservando composição
  // ============================================
  describe('archive / restore', () => {
    it('archive marca deletedAt e NÃO toca em ShowcaseVideo nem Entitlement', async () => {
      prisma.showcase.findFirst.mockResolvedValue({
        ...makeShowcase(),
        _count: { entitlements: 3 },
      });
      prisma.showcase.update.mockResolvedValue(makeShowcase({ deletedAt: new Date() }));

      const result = await service.archive('showcase-1', 'actor-1');

      const updateCall = prisma.showcase.update.mock.calls[0][0] as any;
      expect(updateCall.where).toEqual({ id: 'showcase-1' });
      expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
      // Composição e direitos ficam intactos — arquivar não pode tirar
      // acesso de quem pagou nem apagar a curadoria.
      expect(prisma.showcase.delete).not.toHaveBeenCalled();
      expect(prisma.showcaseVideo.deleteMany).not.toHaveBeenCalled();
      expect(prisma.entitlement.deleteMany).not.toHaveBeenCalled();
      expect(prisma.entitlement.updateMany).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-1',
          action: AUDIT_ACTIONS.SHOWCASE_ARCHIVE,
          entityId: 'showcase-1',
        }),
      );
      expect(result).toEqual({ id: 'showcase-1', archived: true });
    });

    it('archive de vitrine já arquivada → NotFound', async () => {
      prisma.showcase.findFirst.mockResolvedValue(null);

      await expect(service.archive('showcase-1')).rejects.toThrow(NotFoundException);
      expect(prisma.showcase.update).not.toHaveBeenCalled();
    });

    it('restore só limpa deletedAt — a composição volta como estava', async () => {
      prisma.showcase.findUnique.mockResolvedValue(
        makeShowcase({ deletedAt: new Date() }),
      );
      prisma.showcase.update.mockResolvedValue(makeShowcase());

      await service.restore('showcase-1', 'actor-1');

      const updateCall = prisma.showcase.update.mock.calls[0][0] as any;
      expect(updateCall.data).toEqual({ deletedAt: null });
      expect(prisma.showcaseVideo.deleteMany).not.toHaveBeenCalled();
      expect(prisma.showcaseVideo.createMany).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTIONS.SHOWCASE_RESTORE }),
      );
    });

    it('restore de vitrine não arquivada é no-op', async () => {
      const alive = makeShowcase();
      prisma.showcase.findUnique.mockResolvedValue(alive);

      const result = await service.restore('showcase-1');

      expect(result).toBe(alive);
      expect(prisma.showcase.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});
