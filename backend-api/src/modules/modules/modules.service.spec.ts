import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Module as PrismaModule } from '@prisma/client';

import { ModulesService } from './modules.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';

function makeModule(overrides: Partial<PrismaModule> = {}): PrismaModule {
  return {
    id: 'module-1',
    title: 'Módulo',
    description: null,
    thumbnail: null,
    thumbnailVertical: null,
    thumbnailHorizontal: null,
    order: 0,
    courseId: 'course-1',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PrismaModule;
}

describe('ModulesService', () => {
  let service: ModulesService;
  let prisma: DeepMockProxy<PrismaService>;
  let audit: DeepMockProxy<AuditService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    audit = mockDeep<AuditService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudflareR2Service, useValue: mockDeep<CloudflareR2Service>() },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ModulesService);
  });

  describe('findAll', () => {
    it('requires the parent course to exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.findAll('missing')).rejects.toThrow(NotFoundException);
    });

    it('filters soft-deleted and scopes by courseId', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'course-1' } as any);
      prisma.module.findMany.mockResolvedValue([]);

      await service.findAll('course-1');

      const where = prisma.module.findMany.mock.calls[0][0]!.where as any;
      expect(where.courseId).toBe('course-1');
      expect(where.deletedAt).toBeNull();
    });
  });

  describe('findOne', () => {
    it('returns a healthy module', async () => {
      const m = makeModule();
      prisma.module.findUnique.mockResolvedValue(m);

      const out = await service.findOne('module-1');
      expect(out).toEqual(m);
    });

    it('hides soft-deleted modules as NotFound', async () => {
      prisma.module.findUnique.mockResolvedValue(
        makeModule({ deletedAt: new Date() }),
      );

      await expect(service.findOne('module-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound when module does not exist', async () => {
      prisma.module.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (soft-delete)', () => {
    it('marks deletedAt and writes audit entry', async () => {
      prisma.module.findUnique.mockResolvedValue(makeModule());
      prisma.module.update.mockResolvedValue(
        makeModule({ deletedAt: new Date() }),
      );

      await service.remove('module-1', 'actor-1');

      const data = prisma.module.update.mock.calls[0][0].data as any;
      expect(data.deletedAt).toBeInstanceOf(Date);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-1',
          action: AUDIT_ACTIONS.MODULE_SOFT_DELETE,
          entityType: 'modules',
          entityId: 'module-1',
        }),
      );
      expect(prisma.module.delete).not.toHaveBeenCalled();
    });

    it('wraps Prisma errors in BadRequestException', async () => {
      prisma.module.findUnique.mockResolvedValue(makeModule());
      prisma.module.update.mockRejectedValue(new Error('constraint'));

      await expect(service.remove('module-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects when module is already soft-deleted', async () => {
      prisma.module.findUnique.mockResolvedValue(
        makeModule({ deletedAt: new Date() }),
      );

      await expect(service.remove('module-1')).rejects.toThrow(NotFoundException);
      expect(prisma.module.update).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('rejects when parent course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.create('missing', { title: 't', order: 0 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when another module already has the same order', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'course-1' } as any);
      prisma.module.findFirst.mockResolvedValue(makeModule({ order: 1 }));

      await expect(
        service.create('course-1', { title: 't', order: 1 } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.module.create).not.toHaveBeenCalled();
    });

    it('persists the module on happy path', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'course-1' } as any);
      prisma.module.findFirst.mockResolvedValue(null);
      prisma.module.create.mockResolvedValue(makeModule({ title: 't', order: 1 }));

      await service.create('course-1', { title: 't', order: 1 } as any);

      const data = prisma.module.create.mock.calls[0][0].data as any;
      expect(data.courseId).toBe('course-1');
      expect(data.title).toBe('t');
    });
  });

  describe('update', () => {
    it('allows updating without changing order', async () => {
      prisma.module.findUnique.mockResolvedValue(makeModule({ order: 2 }));
      prisma.module.update.mockResolvedValue(
        makeModule({ title: 'Novo', order: 2 }),
      );

      await service.update('module-1', { title: 'Novo' } as any);

      expect(prisma.module.findFirst).not.toHaveBeenCalled();
      expect(prisma.module.update).toHaveBeenCalled();
    });

    it('rejects when new order collides with another module', async () => {
      prisma.module.findUnique.mockResolvedValue(makeModule({ order: 2 }));
      prisma.module.findFirst.mockResolvedValue(
        makeModule({ id: 'other', order: 3 }),
      );

      await expect(
        service.update('module-1', { order: 3 } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.module.update).not.toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('rejects when course is missing', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(
        service.reorder('missing', { modules: [] } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('does 2 passes (temp + final) for every module', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        title: 'Curso',
      } as any);
      prisma.module.findMany.mockResolvedValue([]);
      prisma.module.update.mockResolvedValue(makeModule());

      await service.reorder('course-1', {
        modules: [{ id: 'a', order: 0 }, { id: 'b', order: 1 }],
      } as any);

      expect(prisma.module.update).toHaveBeenCalledTimes(4);
    });

    it('wraps Prisma failures as BadRequestException', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        title: 'Curso',
      } as any);
      prisma.module.update.mockRejectedValue(new Error('boom'));

      await expect(
        service.reorder('course-1', {
          modules: [{ id: 'a', order: 0 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('belongsToCourse / getNextOrder', () => {
    it('belongsToCourse is true when match exists', async () => {
      prisma.module.findFirst.mockResolvedValue(makeModule());
      await expect(
        service.belongsToCourse('module-1', 'course-1'),
      ).resolves.toBe(true);
    });

    it('belongsToCourse is false when no match', async () => {
      prisma.module.findFirst.mockResolvedValue(null);
      await expect(
        service.belongsToCourse('module-1', 'course-1'),
      ).resolves.toBe(false);
    });

    it('getNextOrder returns 0 for empty course', async () => {
      prisma.module.findFirst.mockResolvedValue(null);
      await expect(service.getNextOrder('course-1')).resolves.toBe(0);
    });

    it('getNextOrder returns lastOrder + 1', async () => {
      prisma.module.findFirst.mockResolvedValue(makeModule({ order: 4 }));
      await expect(service.getNextOrder('course-1')).resolves.toBe(5);
    });
  });
});
