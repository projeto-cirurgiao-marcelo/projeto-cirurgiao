import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { XpService } from './xp.service';

describe('XpService dedup behaviour', () => {
  let service: XpService;
  let prisma: PrismaService;

  const userId = 'test-user-uuid-xp-dedup';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XpService, PrismaService],
    }).compile();
    service = module.get<XpService>(XpService);
    prisma = module.get<PrismaService>(PrismaService);

    // Ensure user exists for FK constraint
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `xp-dedup-${Date.now()}@test.local`,
        password: 'test',
        name: 'XP Dedup Test User',
      },
    });
  });

  beforeEach(async () => {
    await prisma.xpLog.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.xpLog.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    await prisma.$disconnect();
  });

  it('does not double-award XP when same action+referenceId arrives twice', async () => {
    const refId = 'attempt-uuid-A';
    const r1 = await service.awardXp(userId, 'quiz_pass', 50, 'Quiz 1', refId);
    const r2 = await service.awardXp(userId, 'quiz_pass', 50, 'Quiz 1', refId);

    expect(r1.xpAwarded).toBe(50);
    expect(r2.xpAwarded).toBe(0);
  });

  it('awards XP separately for two distinct attemptIds', async () => {
    const r1 = await service.awardXp(userId, 'quiz_pass', 50, 'Quiz attempt A', 'attempt-uuid-A');
    const r2 = await service.awardXp(userId, 'quiz_pass', 50, 'Quiz attempt B', 'attempt-uuid-B');

    expect(r1.xpAwarded).toBe(50);
    expect(r2.xpAwarded).toBe(50);
  });
});
