import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: DeepMockProxy<PrismaService>;
  let audit: DeepMockProxy<AuditService>;
  let r2: DeepMockProxy<CloudflareR2Service>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    audit = mockDeep<AuditService>();
    r2 = mockDeep<CloudflareR2Service>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudflareR2Service, useValue: r2 },
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

  // ============================================
  // create
  // ============================================
  describe('create', () => {
    it('slugifies the title and persists the course', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      prisma.course.create.mockResolvedValue(
        makeCourse({ slug: 'curso-avancado-de-cirurgia' }),
      );

      await service.create('instructor-1', {
        title: 'Curso Avançado de Cirurgia',
      } as any);

      const data = prisma.course.create.mock.calls[0][0].data as any;
      expect(data.slug).toBe('curso-avancado-de-cirurgia');
      expect(data.instructor.connect.id).toBe('instructor-1');
    });

    it('strips accents, special chars, collapses whitespace in the slug', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      prisma.course.create.mockResolvedValue(makeCourse());

      await service.create('instructor-1', {
        title: '  Açúcar & Canela!!   — Veterinária  ',
      } as any);

      const data = prisma.course.create.mock.calls[0][0].data as any;
      // Slug reflects the current generateSlug behaviour: accents stripped,
      // &/!/— removed, spaces → single hyphen. Leading/trailing hyphens
      // survive — kept as-is to mirror production behaviour (if we decide
      // to trim them, update this expectation along with the service).
      expect(data.slug).toBe('-acucar-canela-veterinaria-');
    });

    it('rejects duplicate slug with BadRequest', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse({ slug: 'curso' }));

      await expect(
        service.create('instructor-1', { title: 'Curso' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.course.create).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // update
  // ============================================
  describe('update', () => {
    it('regenerates slug when title changes and no conflict', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      prisma.course.findFirst.mockResolvedValue(null);
      prisma.course.update.mockResolvedValue(
        makeCourse({ title: 'Novo Título', slug: 'novo-titulo' }),
      );

      await service.update('course-1', { title: 'Novo Título' } as any);

      const data = prisma.course.update.mock.calls[0][0].data as any;
      expect(data.slug).toBe('novo-titulo');
      expect(data.title).toBe('Novo Título');
    });

    it('rejects update when new slug would collide with another course', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      prisma.course.findFirst.mockResolvedValue(
        makeCourse({ id: 'course-2', slug: 'outro' }),
      );

      await expect(
        service.update('course-1', { title: 'Outro' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.course.update).not.toHaveBeenCalled();
    });

    it('leaves slug alone when title is not in the payload', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      prisma.course.update.mockResolvedValue(
        makeCourse({ description: 'nova descrição' }),
      );

      await service.update('course-1', { description: 'nova descrição' } as any);

      const data = prisma.course.update.mock.calls[0][0].data as any;
      expect(data.slug).toBeUndefined();
    });
  });

  // ============================================
  // togglePublish / isInstructor
  // ============================================
  describe('togglePublish', () => {
    it('flips isPublished', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse({ isPublished: true }));
      prisma.course.update.mockResolvedValue(
        makeCourse({ isPublished: false }),
      );

      const result = await service.togglePublish('course-1');

      const data = prisma.course.update.mock.calls[0][0].data as any;
      expect(data.isPublished).toBe(false);
      expect(result.isPublished).toBe(false);
    });
  });

  describe('isInstructor', () => {
    it('returns true when user owns the course', async () => {
      prisma.course.findFirst.mockResolvedValue(makeCourse());

      await expect(service.isInstructor('course-1', 'instructor-1')).resolves.toBe(
        true,
      );
    });

    it('returns false when user does not own the course', async () => {
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.isInstructor('course-1', 'other-user')).resolves.toBe(
        false,
      );
    });
  });

  // ============================================
  // uploadThumbnail
  // ============================================
  describe('uploadThumbnail', () => {
    const fileBuffer = Buffer.from('png-bytes');

    it('rejects unsupported content types', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());

      await expect(
        service.uploadThumbnail('course-1', fileBuffer, 'file.gif', 'image/gif'),
      ).rejects.toThrow(BadRequestException);
      expect(r2.uploadFile).not.toHaveBeenCalled();
    });

    it('horizontal upload fills thumbnailHorizontal + thumbnail (legacy field)', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      r2.uploadFile.mockResolvedValue({ url: 'https://r2.example/thumb.png' } as any);
      prisma.course.update.mockResolvedValue(
        makeCourse({
          thumbnailHorizontal: 'https://r2.example/thumb.png',
          thumbnail: 'https://r2.example/thumb.png',
        }),
      );

      await service.uploadThumbnail(
        'course-1',
        fileBuffer,
        'thumb.png',
        'image/png',
        'horizontal',
      );

      const updateData = prisma.course.update.mock.calls[0][0].data as any;
      expect(updateData.thumbnailHorizontal).toBe('https://r2.example/thumb.png');
      // Legacy `thumbnail` is mirrored on horizontal uploads for older clients.
      expect(updateData.thumbnail).toBe('https://r2.example/thumb.png');
      expect(updateData.thumbnailVertical).toBeUndefined();
    });

    it('vertical upload fills only thumbnailVertical', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      r2.uploadFile.mockResolvedValue({ url: 'https://r2.example/v.png' } as any);
      prisma.course.update.mockResolvedValue(
        makeCourse({ thumbnailVertical: 'https://r2.example/v.png' }),
      );

      await service.uploadThumbnail(
        'course-1',
        fileBuffer,
        'v.png',
        'image/png',
        'vertical',
      );

      const updateData = prisma.course.update.mock.calls[0][0].data as any;
      expect(updateData.thumbnailVertical).toBe('https://r2.example/v.png');
      expect(updateData.thumbnailHorizontal).toBeUndefined();
      expect(updateData.thumbnail).toBeUndefined();
    });

    it('wraps upstream errors in BadRequestException', async () => {
      prisma.course.findUnique.mockResolvedValue(makeCourse());
      r2.uploadFile.mockRejectedValue(new Error('R2 down'));

      await expect(
        service.uploadThumbnail('course-1', fileBuffer, 'x.png', 'image/png'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
