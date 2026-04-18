import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Course } from '@prisma/client';

import { CoursesService } from './courses.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'course-1',
    title: 'Curso',
    slug: 'curso',
    description: null,
    thumbnail: null,
    thumbnailVertical: null,
    thumbnailHorizontal: null,
    instructorId: 'instructor-1',
    isPublished: true,
    price: { toNumber: () => 0 } as any,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Course;
}

describe('CoursesService (soft delete)', () => {
  let service: CoursesService;
  let prisma: DeepMockProxy<PrismaService>;
  let audit: DeepMockProxy<AuditService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    audit = mockDeep<AuditService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudflareR2Service, useValue: mockDeep<CloudflareR2Service>() },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(CoursesService);
  });

  describe('remove (soft-delete)', () => {
    it('marks deletedAt and records an audit event', async () => {
      const now = new Date();
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      prisma.course.update.mockResolvedValue(
        makeCourse({ deletedAt: now }),
      );

      await service.remove('course-1', 'actor-1');

      const updateCall = prisma.course.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'course-1' });
      expect((updateCall.data as any).deletedAt).toBeInstanceOf(Date);
      expect(audit.record).toHaveBeenCalledWith({
        actorId: 'actor-1',
        action: AUDIT_ACTIONS.COURSE_SOFT_DELETE,
        entityType: 'courses',
        entityId: 'course-1',
      });
      // Never physically deletes.
      expect(prisma.course.delete).not.toHaveBeenCalled();
    });

    it('throws NotFound and skips audit when already soft-deleted', async () => {
      prisma.course.findUnique.mockResolvedValue(
        makeCourse({ deletedAt: new Date() }),
      );

      await expect(service.remove('course-1', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.course.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('accepts null actorId (system/cron invocations)', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      prisma.course.update.mockResolvedValue(makeCourse({ deletedAt: new Date() }));

      await service.remove('course-1');

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: null }),
      );
    });
  });

  describe('findOne', () => {
    it('hides soft-deleted courses as NotFound', async () => {
      prisma.course.findUnique.mockResolvedValue(
        makeCourse({ deletedAt: new Date() }),
      );

      await expect(service.findOne('course-1')).rejects.toThrow(NotFoundException);
    });

    it('returns a healthy course', async () => {
      const course = makeCourse();
      prisma.course.findUnique.mockResolvedValue(course);

      const result = await service.findOne('course-1');
      expect(result).toEqual(course);
    });
  });

  describe('findAll', () => {
    it('filters out soft-deleted rows and respects isPublished by default', async () => {
      prisma.course.findMany.mockResolvedValue([]);

      await service.findAll();

      const where = prisma.course.findMany.mock.calls[0][0]!.where as any;
      expect(where.deletedAt).toBeNull();
      expect(where.isPublished).toBe(true);
    });

    it('keeps unpublished when includeUnpublished=true but still excludes soft-deleted', async () => {
      prisma.course.findMany.mockResolvedValue([]);

      await service.findAll(true);

      const where = prisma.course.findMany.mock.calls[0][0]!.where as any;
      expect(where.deletedAt).toBeNull();
      expect(where.isPublished).toBeUndefined();
    });
  });
});
