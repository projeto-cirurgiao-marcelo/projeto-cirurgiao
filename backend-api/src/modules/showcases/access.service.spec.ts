import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { AccessService, DEFAULT_PREVIEW_SECONDS } from './access.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('AccessService', () => {
  let service: AccessService;
  let prisma: DeepMockProxy<PrismaService>;

  const student = { userId: 'user-1', role: 'STUDENT' };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AccessService);
  });

  describe('getAccess', () => {
    it('ADMIN e INSTRUCTOR liberam tudo sem tocar no banco', async () => {
      const admin = await service.getAccess({ userId: 'a', role: 'ADMIN' });
      const instructor = await service.getAccess({ userId: 'i', role: 'INSTRUCTOR' });

      expect(admin.all).toBe(true);
      expect(instructor.all).toBe(true);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('a query filtra entitlement ativo: revokedAt nulo e expiresAt nulo ou futuro', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getAccess(student);

      // O predicado de "ativo" mora no SQL — se alguém remover, este teste acusa.
      const sql = (prisma.$queryRaw.mock.calls[0][0] as any).join('?');
      expect(sql).toContain('"revokedAt" IS NULL');
      expect(sql).toContain('"expiresAt" IS NULL OR e."expiresAt" > now()');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('sem entitlement: hasAccess false em tudo', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const access = await service.getAccess(student);

      expect(access.all).toBe(false);
      expect(service.hasAccess(access, 'qualquer-video')).toBe(false);
    });

    it('vitrine comum libera só os vídeos dela — inclusive aula vinda de outro curso', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { grantsAllContent: false, videoId: 'aula-castracao-1' },
        { grantsAllContent: false, videoId: 'aula-flanco-outro-curso' },
      ]);

      const access = await service.getAccess(student);

      expect(service.hasAccess(access, 'aula-castracao-1')).toBe(true);
      expect(service.hasAccess(access, 'aula-flanco-outro-curso')).toBe(true);
      expect(service.hasAccess(access, 'aula-de-fora')).toBe(false);
    });

    it('grantsAllContent (grandfather/pós) libera o catálogo inteiro', async () => {
      // LEFT JOIN: vitrine grantsAll sem linha materializada vem com videoId null
      prisma.$queryRaw.mockResolvedValue([{ grantsAllContent: true, videoId: null }]);

      const access = await service.getAccess(student);

      expect(access.all).toBe(true);
      expect(service.hasAccess(access, 'qualquer-video')).toBe(true);
    });
  });

  describe('previewSecondsFor', () => {
    it('default = min(120s, 50% da duração) — aula de 90s libera 45s', () => {
      expect(service.previewSecondsFor(90)).toBe(45);
      expect(service.previewSecondsFor(600)).toBe(120);
      expect(service.previewSecondsFor(240)).toBe(120);
    });

    it('override da vitrine substitui o 120, mas o teto de 50% permanece', () => {
      expect(service.previewSecondsFor(600, 30)).toBe(30);
      expect(service.previewSecondsFor(600, 400)).toBe(300);
      expect(service.previewSecondsFor(90, 400)).toBe(45);
    });

    it('duração desconhecida cai no base (player corta pela duração real)', () => {
      expect(service.previewSecondsFor(0)).toBe(DEFAULT_PREVIEW_SECONDS);
      expect(service.previewSecondsFor(null, 60)).toBe(60);
    });
  });

  describe('decorateVideo', () => {
    it('com acesso: hasAccess true e sem campos de preview', async () => {
      prisma.$queryRaw.mockResolvedValue([{ grantsAllContent: false, videoId: 'v1' }]);

      const result = await service.decorateVideo({ id: 'v1', duration: 600 }, student);

      expect(result.hasAccess).toBe(true);
      expect((result as any).previewSeconds).toBeUndefined();
      expect(prisma.showcaseVideo.findFirst).not.toHaveBeenCalled();
    });

    it('sem acesso: hasAccess false + previewSeconds + vitrine ofertada', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.showcaseVideo.findFirst.mockResolvedValue({
        showcase: {
          id: 's1',
          title: 'Castração Descomplicada',
          slug: 'castracao-descomplicada',
          previewSeconds: null,
        },
      } as any);

      const result = await service.decorateVideo({ id: 'v1', duration: 90 }, student);

      expect(result.hasAccess).toBe(false);
      expect((result as any).previewSeconds).toBe(45);
      expect((result as any).offerShowcase).toEqual({
        id: 's1',
        title: 'Castração Descomplicada',
        slug: 'castracao-descomplicada',
      });
    });

    it('sem acesso e sem vitrine ofertável: preview default e oferta nula', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.showcaseVideo.findFirst.mockResolvedValue(null);

      const result = await service.decorateVideo({ id: 'v1', duration: 600 }, student);

      expect(result.hasAccess).toBe(false);
      expect((result as any).previewSeconds).toBe(120);
      expect((result as any).offerShowcase).toBeNull();
    });
  });

  describe('annotateCourseVideos', () => {
    it('marca hasAccess por aula em todos os módulos', async () => {
      prisma.$queryRaw.mockResolvedValue([{ grantsAllContent: false, videoId: 'v2' }]);
      const access = await service.getAccess(student);

      const course = {
        modules: [
          { videos: [{ id: 'v1' }, { id: 'v2' }] },
          { videos: [{ id: 'v3' }] },
        ],
      };

      const annotated = service.annotateCourseVideos(course, access) as any;

      expect(annotated.modules[0].videos.map((v: any) => v.hasAccess)).toEqual([false, true]);
      expect(annotated.modules[1].videos[0].hasAccess).toBe(false);
    });
  });
});
