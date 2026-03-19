import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { getLevelForXp, getLevelProgress } from './constants/levels';
import { XP_REWARDS } from './constants/xp-rewards';

export interface AwardXpResult {
  xpAwarded: number;
  totalXp: number;
  levelUp: { newLevel: number; newTitle: string } | null;
}

@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  constructor(private prisma: PrismaService) {}

  async awardXp(
    userId: string,
    action: string,
    xp: number,
    description: string,
    referenceId?: string,
  ): Promise<AwardXpResult> {
    // Previne XP duplicado para mesma acao + referencia
    if (referenceId) {
      const alreadyAwarded = await this.hasAlreadyAwarded(
        userId,
        action,
        referenceId,
      );
      if (alreadyAwarded) {
        const totalXp = await this.getTotalXp(userId);
        return { xpAwarded: 0, totalXp, levelUp: null };
      }
    }

    // Nivel antes de ganhar XP
    const oldTotalXp = await this.getTotalXp(userId);
    const oldLevel = getLevelForXp(oldTotalXp);

    // Cria o log de XP
    await this.prisma.xpLog.create({
      data: { userId, action, xp, description, referenceId },
    });

    const newTotalXp = oldTotalXp + xp;
    const newLevel = getLevelForXp(newTotalXp);

    let levelUp: AwardXpResult['levelUp'] = null;

    // Verifica se subiu de nivel
    if (newLevel.level > oldLevel.level) {
      levelUp = { newLevel: newLevel.level, newTitle: newLevel.title };

      // Cria evento de level up
      await this.prisma.gamificationEvent.create({
        data: {
          userId,
          type: 'level_up',
          data: {
            newLevel: newLevel.level,
            newTitle: newLevel.title,
            xp,
            action,
          },
        },
      });

      this.logger.log(
        `User ${userId} leveled up to ${newLevel.level} (${newLevel.title})`,
      );
    }

    // Cria evento de XP ganho
    await this.prisma.gamificationEvent.create({
      data: {
        userId,
        type: 'xp_earned',
        data: { xp, action, description },
      },
    });

    return { xpAwarded: xp, totalXp: newTotalXp, levelUp };
  }

  async hasAlreadyAwarded(
    userId: string,
    action: string,
    referenceId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.xpLog.findFirst({
      where: { userId, action, referenceId },
    });
    return !!existing;
  }

  async getTotalXp(userId: string): Promise<number> {
    const result = await this.prisma.xpLog.aggregate({
      _sum: { xp: true },
      where: { userId },
    });
    return result._sum.xp || 0;
  }

  async getXpSummary(userId: string) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, todayEarned, weekEarned, monthEarned] = await Promise.all([
      this.prisma.xpLog.aggregate({
        _sum: { xp: true },
        where: { userId },
      }),
      this.prisma.xpLog.aggregate({
        _sum: { xp: true },
        where: { userId, createdAt: { gte: startOfToday } },
      }),
      this.prisma.xpLog.aggregate({
        _sum: { xp: true },
        where: { userId, createdAt: { gte: startOfWeek } },
      }),
      this.prisma.xpLog.aggregate({
        _sum: { xp: true },
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      total: total._sum.xp || 0,
      todayEarned: todayEarned._sum.xp || 0,
      weekEarned: weekEarned._sum.xp || 0,
      monthEarned: monthEarned._sum.xp || 0,
    };
  }

  async getRecentXpHistory(userId: string, limit = 15) {
    const logs = await this.prisma.xpLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      action: log.action,
      xp: log.xp,
      timestamp: log.createdAt.toISOString(),
      description: log.description || '',
    }));
  }
}
