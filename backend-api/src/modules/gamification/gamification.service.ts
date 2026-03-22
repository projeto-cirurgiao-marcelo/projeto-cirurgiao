import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { XpService } from './xp.service';
import { BadgesService } from './badges.service';
import { StreakService } from './streak.service';
import { ChallengesService } from './challenges.service';
import { getLevelProgress } from './constants/levels';
import { XP_REWARDS } from './constants/xp-rewards';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private prisma: PrismaService,
    private xpService: XpService,
    private badgesService: BadgesService,
    private streakService: StreakService,
    private challengesService: ChallengesService,
  ) {}

  /**
   * Metodo central chamado pelos servicos existentes ao completar uma acao.
   */
  async processAction(
    userId: string,
    action: string,
    xpAmount: number,
    description: string,
    referenceId?: string,
  ): Promise<void> {
    try {
      // 1. Concede XP
      const xpResult = await this.xpService.awardXp(
        userId,
        action,
        xpAmount,
        description,
        referenceId,
      );

      if (xpResult.xpAwarded === 0) return; // Ja foi concedido antes

      // 2. Atualiza streak
      await this.streakService.recordActivity(userId);

      // 3. Avalia badges
      const newBadges = await this.badgesService.evaluateAndUnlockBadges(
        userId,
        action,
      );

      // 4. Cria eventos de badge desbloqueado
      for (const badge of newBadges) {
        await this.prisma.gamificationEvent.create({
          data: {
            userId,
            type: 'badge_unlocked',
            data: {
              badge: {
                slug: badge.slug,
                name: badge.name,
                icon: badge.icon,
                rarity: badge.rarity,
                description: badge.description,
              },
            },
          },
        });
      }

      // 5. Avalia desafios
      await this.challengesService.evaluateChallenges(userId);

      // 6. Verifica milestones de streak
      const streak = await this.streakService.getStreak(userId);
      if (streak.current === 7 || streak.current === 30) {
        const xpReward =
          streak.current === 7 ? XP_REWARDS.STREAK_7 : XP_REWARDS.STREAK_30;

        await this.xpService.awardXp(
          userId,
          'streak_milestone',
          xpReward,
          `Sequência de ${streak.current} dias!`,
          `streak_${streak.current}`,
        );

        await this.prisma.gamificationEvent.create({
          data: {
            userId,
            type: 'streak_milestone',
            data: { streakDays: streak.current },
          },
        });

        // Re-avalia badges de streak
        await this.badgesService.evaluateAndUnlockBadges(
          userId,
          'streak_milestone',
        );
      }
    } catch (error) {
      // Gamificacao nao deve quebrar o fluxo principal
      this.logger.error(
        `Error processing gamification action for user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async getProfile(userId: string) {
    // Concede daily_login XP na primeira chamada do dia
    const today = new Date().toISOString().split('T')[0];
    const hasLoginToday = await this.xpService.hasAlreadyAwarded(
      userId,
      'daily_login',
      today,
    );
    if (!hasLoginToday) {
      await this.xpService.awardXp(
        userId,
        'daily_login',
        XP_REWARDS.DAILY_LOGIN,
        'Login diário',
        today,
      );
      await this.streakService.recordActivity(userId);
      // Avalia badges de streak apos login
      await this.badgesService.evaluateAndUnlockBadges(
        userId,
        'daily_login',
      );
    }

    const [xpSummary, streak, recentHistory, stats] = await Promise.all([
      this.xpService.getXpSummary(userId),
      this.streakService.getStreak(userId),
      this.xpService.getRecentXpHistory(userId, 15),
      this.computeStats(userId),
    ]);

    const level = getLevelProgress(xpSummary.total);

    return {
      xp: xpSummary,
      level,
      streak,
      stats,
      recentXpHistory: recentHistory,
    };
  }

  async getBadges(userId: string) {
    return this.badgesService.getBadgesForUser(userId);
  }

  async getLeaderboard(
    userId: string,
    period: 'weekly' | 'monthly',
    page: number,
    limit: number,
  ) {
    const { start, end } = this.getPeriodDates(period);

    // Aggregation de XP por usuario no periodo
    const xpByUser = await this.prisma.xpLog.groupBy({
      by: ['userId'],
      _sum: { xp: true },
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { _sum: { xp: 'desc' } },
      take: limit,
      skip: (page - 1) * limit,
    });

    // Total de participantes
    const allParticipants = await this.prisma.xpLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: start, lte: end } },
    });
    const totalParticipants = allParticipants.length;

    // Busca dados dos usuarios
    const userIds = xpByUser.map((e) => e.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, profile: { select: { photoUrl: true } } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Busca streaks dos usuarios
    const streaks = await this.prisma.userStreak.findMany({
      where: { userId: { in: userIds } },
    });
    const streakMap = new Map(streaks.map((s) => [s.userId, s]));

    // Monta entries com rank
    const baseRank = (page - 1) * limit;
    const entries = await Promise.all(
      xpByUser.map(async (entry, index) => {
        const user = userMap.get(entry.userId);
        const streak = streakMap.get(entry.userId);
        const totalXp = await this.xpService.getTotalXp(entry.userId);
        const levelInfo = getLevelProgress(totalXp);

        // Stats no periodo
        const [videosCompleted, quizzesPassed] = await Promise.all([
          this.prisma.progress.count({
            where: {
              userId: entry.userId,
              completed: true,
              completedAt: { gte: start, lte: end },
            },
          }),
          this.prisma.quizAttempt.count({
            where: {
              userId: entry.userId,
              passed: true,
              completedAt: { gte: start, lte: end },
            },
          }),
        ]);

        return {
          rank: baseRank + index + 1,
          userId: entry.userId,
          displayName: user?.name || 'Usuário',
          avatarUrl: (user as any)?.profile?.photoUrl || null,
          level: levelInfo.current,
          levelTitle: levelInfo.title,
          levelColor: levelInfo.color,
          xpEarned: entry._sum.xp || 0,
          videosCompleted,
          quizzesPassed,
          currentStreak: streak?.currentStreak || 0,
        };
      }),
    );

    // Posicao do usuario atual
    const allRanked = await this.prisma.xpLog.groupBy({
      by: ['userId'],
      _sum: { xp: true },
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { _sum: { xp: 'desc' } },
    });

    const userRankIndex = allRanked.findIndex((e) => e.userId === userId);
    const userXpInPeriod =
      userRankIndex >= 0 ? allRanked[userRankIndex]._sum.xp || 0 : 0;
    const totalXp = await this.xpService.getTotalXp(userId);
    const userLevelInfo = getLevelProgress(totalXp);

    return {
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalParticipants,
      entries,
      currentUser: {
        rank: userRankIndex >= 0 ? userRankIndex + 1 : totalParticipants + 1,
        xpEarned: userXpInPeriod,
        level: userLevelInfo.current,
        levelTitle: userLevelInfo.title,
      },
    };
  }

  async getChallenges(userId: string) {
    return this.challengesService.getChallenges(userId);
  }

  async claimChallenge(userId: string, challengeId: string) {
    return this.challengesService.claimChallenge(userId, challengeId);
  }

  async getRecentEvents(userId: string) {
    const events = await this.prisma.gamificationEvent.findMany({
      where: { userId, seen: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: e.createdAt.toISOString(),
        data: e.data as Record<string, any>,
        seen: e.seen,
      })),
    };
  }

  async markEventSeen(userId: string, eventId: string) {
    const event = await this.prisma.gamificationEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    await this.prisma.gamificationEvent.update({
      where: { id: eventId },
      data: { seen: true },
    });
  }

  async getEventHistory(userId: string, limit: number = 30) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const [events, unreadCount] = await Promise.all([
      this.prisma.gamificationEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
      this.prisma.gamificationEvent.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: e.createdAt.toISOString(),
        data: e.data as Record<string, any>,
        seen: e.seen,
        readAt: e.readAt ? e.readAt.toISOString() : null,
      })),
      unreadCount,
    };
  }

  async markEventRead(userId: string, eventId: string) {
    const event = await this.prisma.gamificationEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    await this.prisma.gamificationEvent.update({
      where: { id: eventId },
      data: { readAt: new Date() },
    });

    return { success: true };
  }

  async markAllEventsRead(userId: string) {
    const result = await this.prisma.gamificationEvent.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { success: true, count: result.count };
  }

  private async computeStats(userId: string) {
    const [
      videosCompleted,
      totalWatchTime,
      quizAttempts,
      forumTopics,
      forumReplies,
      forumSolutions,
      coursesCompleted,
    ] = await Promise.all([
      this.prisma.progress.count({ where: { userId, completed: true } }),
      this.prisma.progress.aggregate({
        _sum: { watchTime: true },
        where: { userId },
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId },
        select: { score: true, passed: true },
      }),
      this.prisma.forumTopic.count({ where: { authorId: userId } }),
      this.prisma.forumReply.count({ where: { authorId: userId } }),
      this.prisma.forumReply.count({
        where: { authorId: userId, isSolution: true },
      }),
      this.prisma.enrollment.count({
        where: { userId, completedAt: { not: null } },
      }),
    ]);

    const quizAverageScore =
      quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((s, a) => s + a.score, 0) /
              quizAttempts.length,
          )
        : 0;

    return {
      videosCompleted,
      totalWatchTimeMinutes: Math.round(
        (totalWatchTime._sum.watchTime || 0) / 60,
      ),
      quizzesPassed: quizAttempts.filter((a) => a.passed).length,
      quizAverageScore,
      forumTopics,
      forumReplies,
      forumSolutions,
      coursesCompleted,
    };
  }

  private getPeriodDates(period: 'weekly' | 'monthly') {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === 'weekly') {
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return { start, end };
  }
}
