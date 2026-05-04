import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { XpCalculatorService } from './xp-calculator.service';

describe('XpCalculatorService', () => {
  let service: XpCalculatorService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XpCalculatorService, PrismaService],
    }).compile();
    service = module.get(XpCalculatorService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('calculates XP MEDIUM × combo 4 × KNEW (15 × 1.2 × 1.15 = 21)', async () => {
    const r = await service.calculate({
      difficulty: 'MEDIUM' as any,
      comboBefore: 4,
      confidence: 'KNEW' as any,
      isCorrect: true,
    });
    expect(r.total).toBe(Math.round(15 * 1.2 * 1.15)); // 21
    expect(r.base).toBe(15);
    expect(r.combo).toBe(1.2);
    expect(r.confidence).toBe(1.15);
  });

  it('returns errorXp=0 on incorrect answer', async () => {
    const r = await service.calculate({
      difficulty: 'HARD' as any,
      comboBefore: 9,
      confidence: 'MASTERED' as any,
      isCorrect: false,
    });
    expect(r.total).toBe(0);
  });

  it('caps combo at top tier (combo 100 → 2.0×)', async () => {
    const r = await service.calculate({
      difficulty: 'EASY' as any,
      comboBefore: 100,
      confidence: 'GUESSED' as any,
      isCorrect: true,
    });
    expect(r.total).toBe(Math.round(10 * 2.0 * 1.0)); // 20
    expect(r.combo).toBe(2.0);
  });

  it('aggregateXp returns expected values from XpRule.aggregate', async () => {
    expect(await service.aggregateXp('pass')).toBe(50);
    expect(await service.aggregateXp('perfect')).toBe(75);
    expect(await service.aggregateXp('streak_save')).toBe(25);
  });

  it('falls back to 1.0 when confidence is null', async () => {
    const r = await service.calculate({
      difficulty: 'MEDIUM' as any,
      comboBefore: 0,
      confidence: null,
      isCorrect: true,
    });
    // null → treated as GUESSED (1.0)
    expect(r.total).toBe(Math.round(15 * 1.0 * 1.0));
  });
});
