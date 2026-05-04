import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ConfidenceLevel, Difficulty } from '@prisma/client';

interface XpInput {
  difficulty: Difficulty;
  comboBefore: number;
  confidence: ConfidenceLevel | null;
  isCorrect: boolean;
}

export interface XpBreakdown {
  total: number;
  base: number;
  combo: number;
  confidence: number;
  formula: string;
}

interface MultiplierJson {
  base: Record<string, number>;
  combo: { min: number; max: number; mult: number }[];
  confidence: Record<string, number>;
  errorXp: number;
  aggregate: { pass: number; perfect: number; streak_save: number };
}

@Injectable()
export class XpCalculatorService {
  private readonly logger = new Logger(XpCalculatorService.name);
  private cache: MultiplierJson | null = null;
  private cacheLoadedAt = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private prisma: PrismaService) {}

  private async loadRule(): Promise<MultiplierJson> {
    if (this.cache && Date.now() - this.cacheLoadedAt < this.CACHE_TTL_MS) return this.cache;
    const rule = await this.prisma.xp_rules.findUnique({ where: { key: 'quiz_question' } });
    if (!rule || !rule.active) {
      throw new Error('XpRule "quiz_question" not active or missing');
    }
    this.cache = rule.multiplierJson as unknown as MultiplierJson;
    this.cacheLoadedAt = Date.now();
    return this.cache;
  }

  async calculate(input: XpInput): Promise<XpBreakdown> {
    const rule = await this.loadRule();
    if (!input.isCorrect) {
      return { total: rule.errorXp ?? 0, base: 0, combo: 0, confidence: 0, formula: 'incorrect→0' };
    }
    const base = rule.base[input.difficulty] ?? 0;
    const tier = rule.combo.find((c) => input.comboBefore >= c.min && input.comboBefore <= c.max);
    const comboMult = tier?.mult ?? 1.0;
    const confKey = input.confidence ?? 'GUESSED';
    const confMult = rule.confidence[confKey] ?? 1.0;

    const total = Math.round(base * comboMult * confMult);
    return {
      total,
      base,
      combo: comboMult,
      confidence: confMult,
      formula: `${base} × ${comboMult} × ${confMult} = ${total}`,
    };
  }

  async aggregateXp(kind: 'pass' | 'perfect' | 'streak_save'): Promise<number> {
    const rule = await this.loadRule();
    return rule.aggregate[kind] ?? 0;
  }

  /**
   * Combo = sequência de acertos consecutivos no dia (00:00–23:59 user-tz).
   * Calculado on-the-fly por query sobre QuizAnswer ordenado.
   */
  async getCurrentCombo(userId: string, tz = 'America/Sao_Paulo', beforeAnswerId?: string): Promise<number> {
    // Boundary: hoje no fuso do user
    const now = new Date();
    const tzNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const startOfDay = new Date(tzNow.getFullYear(), tzNow.getMonth(), tzNow.getDate(), 0, 0, 0, 0);

    const answers = await this.prisma.quizAnswer.findMany({
      where: {
        attempt: { userId },
        createdAt: { gte: startOfDay },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, isCorrect: true },
    });

    let combo = 0;
    for (const a of answers) {
      if (beforeAnswerId && a.id === beforeAnswerId) break;
      combo = a.isCorrect ? combo + 1 : 0;
    }
    return combo;
  }
}
