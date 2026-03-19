import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ChallengePeriod } from '@prisma/client';
import {
  DAILY_CHALLENGE_TEMPLATES,
  WEEKLY_CHALLENGE_TEMPLATES,
  DAILY_CHALLENGES_COUNT,
  WEEKLY_CHALLENGES_COUNT,
  ChallengeTemplate,
} from './constants/challenge-templates';
import { XpService } from './xp.service';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    private prisma: PrismaService,
    private xpService: XpService,
  ) {}

  async getChallenges(userId: string) {
    // Auto-gera desafios se nao existem para o periodo atual
    await this.ensureDailyChallenges(userId);
    await this.ensureWeeklyChallenges(userId);

    const now = new Date();

    // Busca todos os desafios do usuario (ativos e recentes)
    const challenges = await this.prisma.gamificationChallenge.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: { gte: now } }, // Ainda validos
          {
            claimedAt: { not: null },
            createdAt: { gte: this.getStartOfDay() },
          }, // Reivindicados hoje
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula progresso de cada desafio
    const challengesWithProgress = await Promise.all(
      challenges.map(async (challenge) => {
        const current = await this.computeProgress(userId, challenge);
        const isCompleted = current >= challenge.target;

        // Marca como completado se atingiu target e nao estava completado
        if (isCompleted && !challenge.completedAt) {
          await this.prisma.gamificationChallenge.update({
            where: { id: challenge.id },
            data: { completedAt: now },
          });
          challenge.completedAt = now;
        }

        let status: 'active' | 'completed' | 'expired';
        if (challenge.claimedAt) {
          status = 'completed';
        } else if (challenge.expiresAt < now) {
          status = 'expired';
        } else if (challenge.completedAt) {
          status = 'completed';
        } else {
          status = 'active';
        }

        return {
          id: challenge.id,
          type: challenge.type.toLowerCase() as 'daily' | 'weekly' | 'special',
          title: challenge.title,
          description: challenge.description,
          difficulty: challenge.difficulty.toLowerCase() as
            | 'easy'
            | 'medium'
            | 'hard',
          xpReward: challenge.xpReward,
          icon: challenge.icon,
          progress: Math.min(
            100,
            Math.round((current / challenge.target) * 100),
          ),
          target: challenge.target,
          current: Math.min(current, challenge.target),
          expiresAt: challenge.expiresAt.toISOString(),
          completedAt: challenge.completedAt
            ? challenge.completedAt.toISOString()
            : null,
          claimedAt: challenge.claimedAt
            ? challenge.claimedAt.toISOString()
            : null,
          status,
        };
      }),
    );

    const daily = challengesWithProgress.filter((c) => c.type === 'daily');
    const weekly = challengesWithProgress.filter((c) => c.type === 'weekly');
    const special = challengesWithProgress.filter((c) => c.type === 'special');

    const completedToday = await this.prisma.gamificationChallenge.count({
      where: {
        userId,
        claimedAt: { gte: this.getStartOfDay() },
      },
    });

    const totalCompleted = await this.prisma.gamificationChallenge.count({
      where: { userId, claimedAt: { not: null } },
    });

    return { daily, weekly, special, completedToday, totalCompleted };
  }

  async claimChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.gamificationChallenge.findFirst({
      where: { id: challengeId, userId },
    });

    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado');
    }

    if (challenge.claimedAt) {
      throw new BadRequestException('Recompensa já reivindicada');
    }

    // Verifica se o desafio esta completado
    const current = await this.computeProgress(userId, challenge);
    if (current < challenge.target) {
      throw new BadRequestException('Desafio ainda não foi completado');
    }

    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException('Desafio expirou');
    }

    // Concede XP
    const xpResult = await this.xpService.awardXp(
      userId,
      'challenge_complete',
      challenge.xpReward,
      `Desafio completado: ${challenge.title}`,
      challenge.id,
    );

    // Marca como reivindicado
    await this.prisma.gamificationChallenge.update({
      where: { id: challengeId },
      data: {
        claimedAt: new Date(),
        completedAt: challenge.completedAt || new Date(),
      },
    });

    // Cria evento
    await this.prisma.gamificationEvent.create({
      data: {
        userId,
        type: 'challenge_completed',
        data: {
          challenge: {
            title: challenge.title,
            xpReward: challenge.xpReward,
          },
        },
      },
    });

    return {
      success: true,
      xpAwarded: xpResult.xpAwarded,
      newTotalXp: xpResult.totalXp,
      levelUp: xpResult.levelUp,
      badgesUnlocked: [],
    };
  }

  async evaluateChallenges(userId: string): Promise<void> {
    const now = new Date();
    const activeChallenges = await this.prisma.gamificationChallenge.findMany({
      where: {
        userId,
        completedAt: null,
        expiresAt: { gte: now },
      },
    });

    for (const challenge of activeChallenges) {
      const current = await this.computeProgress(userId, challenge);
      if (current >= challenge.target) {
        await this.prisma.gamificationChallenge.update({
          where: { id: challenge.id },
          data: { completedAt: now },
        });
      }
    }
  }

  private async ensureDailyChallenges(userId: string): Promise<void> {
    const startOfDay = this.getStartOfDay();
    const endOfDay = this.getEndOfDay();

    const existingCount = await this.prisma.gamificationChallenge.count({
      where: {
        userId,
        type: ChallengePeriod.DAILY,
        createdAt: { gte: startOfDay },
      },
    });

    if (existingCount >= DAILY_CHALLENGES_COUNT) return;

    // Seleciona templates aleatorios
    const shuffled = [...DAILY_CHALLENGE_TEMPLATES].sort(
      () => Math.random() - 0.5,
    );
    const selected = shuffled.slice(0, DAILY_CHALLENGES_COUNT);

    await this.prisma.gamificationChallenge.createMany({
      data: selected.map((t) => ({
        userId,
        type: t.type,
        templateKey: t.key,
        title: t.title,
        description: t.description,
        difficulty: t.difficulty,
        xpReward: t.xpReward,
        icon: t.icon,
        target: t.target,
        expiresAt: endOfDay,
      })),
    });

    this.logger.log(`Generated ${selected.length} daily challenges for user ${userId}`);
  }

  private async ensureWeeklyChallenges(userId: string): Promise<void> {
    const startOfWeek = this.getStartOfWeek();
    const endOfWeek = this.getEndOfWeek();

    const existingCount = await this.prisma.gamificationChallenge.count({
      where: {
        userId,
        type: ChallengePeriod.WEEKLY,
        createdAt: { gte: startOfWeek },
      },
    });

    if (existingCount >= WEEKLY_CHALLENGES_COUNT) return;

    const shuffled = [...WEEKLY_CHALLENGE_TEMPLATES].sort(
      () => Math.random() - 0.5,
    );
    const selected = shuffled.slice(0, WEEKLY_CHALLENGES_COUNT);

    await this.prisma.gamificationChallenge.createMany({
      data: selected.map((t) => ({
        userId,
        type: t.type,
        templateKey: t.key,
        title: t.title,
        description: t.description,
        difficulty: t.difficulty,
        xpReward: t.xpReward,
        icon: t.icon,
        target: t.target,
        expiresAt: endOfWeek,
      })),
    });

    this.logger.log(`Generated ${selected.length} weekly challenges for user ${userId}`);
  }

  private async computeProgress(
    userId: string,
    challenge: { templateKey: string; createdAt: Date; expiresAt: Date },
  ): Promise<number> {
    const { templateKey, createdAt, expiresAt } = challenge;
    const dateFilter = { gte: createdAt, lte: expiresAt };

    switch (templateKey) {
      case 'watch_1_video':
      case 'watch_2_videos':
      case 'watch_3_videos':
        return this.prisma.progress.count({
          where: {
            userId,
            completed: true,
            completedAt: dateFilter,
          },
        });

      case 'pass_quiz':
        return this.prisma.quizAttempt.count({
          where: {
            userId,
            passed: true,
            completedAt: dateFilter,
          },
        });

      case 'make_note':
        return this.prisma.videoNote.count({
          where: {
            userId,
            createdAt: dateFilter,
          },
        });

      case 'forum_activity': {
        const [topics, replies] = await Promise.all([
          this.prisma.forumTopic.count({
            where: { authorId: userId, createdAt: dateFilter },
          }),
          this.prisma.forumReply.count({
            where: { authorId: userId, createdAt: dateFilter },
          }),
        ]);
        return topics + replies;
      }

      case 'use_ai':
        return this.prisma.chatConversation.count({
          where: { userId, createdAt: dateFilter },
        });

      case 'weekly_5_videos':
      case 'weekly_10_videos':
        return this.prisma.progress.count({
          where: {
            userId,
            completed: true,
            completedAt: dateFilter,
          },
        });

      case 'weekly_3_quizzes':
        return this.prisma.quizAttempt.count({
          where: {
            userId,
            passed: true,
            completedAt: dateFilter,
          },
        });

      case 'weekly_streak_5': {
        const streak = await this.prisma.userStreak.findUnique({
          where: { userId },
        });
        return streak?.currentStreak || 0;
      }

      case 'weekly_forum_3': {
        const [t, r] = await Promise.all([
          this.prisma.forumTopic.count({
            where: { authorId: userId, createdAt: dateFilter },
          }),
          this.prisma.forumReply.count({
            where: { authorId: userId, createdAt: dateFilter },
          }),
        ]);
        return t + r;
      }

      default:
        return 0;
    }
  }

  private getStartOfDay(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfDay(): Date {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private getStartOfWeek(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  private getEndOfWeek(): Date {
    const d = this.getStartOfWeek();
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
