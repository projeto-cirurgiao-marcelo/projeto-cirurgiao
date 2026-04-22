import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'alice@example.com',
    password: 'hashed',
    name: 'Alice',
    role: Role.STUDENT,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;
  let audit: DeepMockProxy<AuditService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    audit = mockDeep<AuditService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('excludes soft-deleted users from the result', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll();

      const where = prisma.user.findMany.mock.calls[0][0]!.where as any;
      expect(where.deletedAt).toBeNull();
    });
  });

  describe('update', () => {
    it('requires the user to exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { email: 'new@example.com' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects email change when the new email already exists', async () => {
      // First findUnique (by id): the user being updated.
      // Second findUnique (by email): the duplicate.
      prisma.user.findUnique
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(makeUser({ id: 'other', email: 'taken@example.com' }));

      await expect(
        service.update('u1', { email: 'taken@example.com' } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows keeping the same email without a duplicate check', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeUser());
      prisma.user.update.mockResolvedValue({} as any);

      await service.update('u1', {
        email: 'alice@example.com',
        name: 'Alice New',
      } as any);

      // No second findUnique call for the duplicate check.
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('bcrypt-hashes the password when present in the payload', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(makeUser());
      prisma.user.update.mockResolvedValue({} as any);
      const hashSpy = jest.spyOn(bcrypt, 'hash');

      await service.update('u1', { password: 'new-password' } as any);

      expect(hashSpy).toHaveBeenCalledWith('new-password', 10);
      const data = prisma.user.update.mock.calls[0][0].data as any;
      expect(data.password).not.toBe('new-password');
      expect(typeof data.password).toBe('string');

      hashSpy.mockRestore();
    });
  });

  describe('remove (soft-delete)', () => {
    it('marks deletedAt + isActive=false and records audit event with metadata', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.user.update.mockResolvedValue({} as any);

      await service.remove('u1', 'actor-1');

      const data = prisma.user.update.mock.calls[0][0].data as any;
      expect(data.deletedAt).toBeInstanceOf(Date);
      expect(data.isActive).toBe(false);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-1',
          action: AUDIT_ACTIONS.USER_SOFT_DELETE,
          entityType: 'users',
          entityId: 'u1',
          metadata: expect.objectContaining({
            email: 'alice@example.com',
            role: Role.STUDENT,
          }),
        }),
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('throws NotFound when the user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('throws NotFound when the user is already soft-deleted (idempotent)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ deletedAt: new Date() }),
      );

      await expect(service.remove('u1')).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFound when user missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the selected projection', async () => {
      const u = makeUser();
      prisma.user.findUnique.mockResolvedValue({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      } as any);

      const out = await service.findOne('u1');
      expect(out.id).toBe('u1');
      expect((out as any).password).toBeUndefined();
    });
  });

  describe('findStudentDetail', () => {
    it('throws NotFound when student missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findStudentDetail('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('aggregates enrollments + avg progress + avg quiz score', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        name: 'N',
        role: Role.STUDENT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollments: [
          {
            id: 'e1',
            progress: 40,
            lastAccessAt: new Date('2026-04-10'),
            enrolledAt: new Date(),
            course: {
              id: 'c1',
              title: 'C1',
              description: '',
              thumbnailHorizontal: null,
              thumbnail: null,
              isPublished: true,
              _count: { modules: 2 },
              modules: [{ _count: { videos: 3 } }, { _count: { videos: 2 } }],
            },
          },
          {
            id: 'e2',
            progress: 80,
            lastAccessAt: new Date('2026-04-15'),
            enrolledAt: new Date(),
            course: {
              id: 'c2',
              title: 'C2',
              description: '',
              thumbnailHorizontal: null,
              thumbnail: null,
              isPublished: true,
              _count: { modules: 1 },
              modules: [{ _count: { videos: 4 } }],
            },
          },
        ],
        quizAttempts: [
          {
            id: 'q1',
            score: 100,
            correctCount: 5,
            totalQuestions: 5,
            completedAt: new Date(),
            quiz: { title: 'Q', video: { title: 'V', module: { title: 'M' } } },
          },
          {
            id: 'q2',
            score: 50,
            correctCount: 2,
            totalQuestions: 4,
            completedAt: new Date(),
            quiz: { title: 'Q2', video: { title: 'V', module: { title: 'M' } } },
          },
        ],
      } as any);

      const out = await service.findStudentDetail('u1');

      expect(out.enrollmentCount).toBe(2);
      // (40 + 80) / 2 = 60
      expect(out.averageProgress).toBe(60);
      // (100 + 50) / 2 = 75
      expect(out.quizAverageScore).toBe(75);
      // Latest lastAccessAt (Apr 15) wins.
      expect(out.lastAccessAt?.toISOString().startsWith('2026-04-15')).toBe(true);
      // Total videos in first course = 3 + 2 = 5.
      expect(out.enrollments[0].courseVideos).toBe(5);
    });

    it('handles empty enrollments / quizAttempts', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        name: 'N',
        role: Role.STUDENT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollments: [],
        quizAttempts: [],
      } as any);

      const out = await service.findStudentDetail('u1');
      expect(out.enrollmentCount).toBe(0);
      expect(out.averageProgress).toBe(0);
      expect(out.quizAverageScore).toBeNull();
      expect(out.lastAccessAt).toBeNull();
    });
  });
});
