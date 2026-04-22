import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { AuditService } from './audit.service';
import { AUDIT_ACTIONS } from './audit.constants';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AuditService);
  });

  it('writes the audit event to the database', async () => {
    prisma.auditLog.create.mockResolvedValue({} as any);

    await service.record({
      actorId: 'user-1',
      action: AUDIT_ACTIONS.COURSE_SOFT_DELETE,
      entityType: 'courses',
      entityId: 'course-1',
      metadata: { reason: 'spam' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'course.soft_delete',
        entityType: 'courses',
        entityId: 'course-1',
        metadata: { reason: 'spam' },
      },
    });
  });

  it('accepts null actorId (system events)', async () => {
    prisma.auditLog.create.mockResolvedValue({} as any);

    await service.record({
      actorId: null,
      action: AUDIT_ACTIONS.USER_SOFT_DELETE,
      entityType: 'users',
      entityId: 'u1',
    });

    const call = prisma.auditLog.create.mock.calls[0][0].data as any;
    expect(call.actorId).toBeNull();
    expect(call.metadata).toBeNull();
  });

  it('swallows DB errors so the parent operation survives', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('Redis down'));

    // Should not throw.
    await expect(
      service.record({
        actorId: 'u',
        action: AUDIT_ACTIONS.VIDEO_SOFT_DELETE,
        entityType: 'videos',
        entityId: 'v',
      }),
    ).resolves.toBeUndefined();
  });
});
