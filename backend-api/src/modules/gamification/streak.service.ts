import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(private prisma: PrismaService) {}

  async recordActivity(userId: string): Promise<void> {
    const today = this.getTodayString();
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      await this.prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
        },
      });
      return;
    }

    // Ja registrou atividade hoje
    if (streak.lastActiveDate === today) {
      return;
    }

    const yesterday = this.getYesterdayString();

    if (streak.lastActiveDate === yesterday) {
      // Continua streak
      const newCurrent = streak.currentStreak + 1;
      const newLongest = Math.max(streak.longestStreak, newCurrent);
      await this.prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: newCurrent,
          longestStreak: newLongest,
          lastActiveDate: today,
        },
      });

      this.logger.log(`User ${userId} streak: ${newCurrent} days`);
    } else {
      // Streak quebrado, reseta para 1
      await this.prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActiveDate: today,
        },
      });

      this.logger.log(`User ${userId} streak reset to 1`);
    }
  }

  async getStreak(userId: string) {
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      return {
        current: 0,
        longest: 0,
        lastActiveDate: '',
        freezesAvailable: 1,
        todayCompleted: false,
      };
    }

    const today = this.getTodayString();
    const todayCompleted = streak.lastActiveDate === today;

    // Se nao fez atividade ontem nem hoje, streak efetivo e 0
    const yesterday = this.getYesterdayString();
    const effectiveStreak =
      streak.lastActiveDate === today || streak.lastActiveDate === yesterday
        ? streak.currentStreak
        : 0;

    return {
      current: effectiveStreak,
      longest: streak.longestStreak,
      lastActiveDate: streak.lastActiveDate || '',
      freezesAvailable: streak.freezesAvailable,
      todayCompleted,
    };
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
}
