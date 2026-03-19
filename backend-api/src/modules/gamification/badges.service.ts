import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  BADGE_CATALOG,
  ACTION_TO_BADGES,
  BadgeDefinition,
} from './constants/badge-catalog';

export interface BadgeWithProgress {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  unlockedAt: string | null;
  progress: { current: number; target: number; percent: number } | null;
}

export interface UnlockedBadge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private prisma: PrismaService) {}

  async getBadgesForUser(userId: string) {
    // Busca badges ja desbloqueados
    const unlockedBadges = await this.prisma.userBadge.findMany({
      where: { userId },
    });
    const unlockedMap = new Map(
      unlockedBadges.map((b) => [b.badgeSlug, b.unlockedAt]),
    );

    // Calcula progresso de todos os badges em paralelo
    const progressMap = await this.computeAllProgress(userId);

    const badges: BadgeWithProgress[] = BADGE_CATALOG.map((def) => {
      const unlockedAt = unlockedMap.get(def.slug);
      const progress = progressMap.get(def.slug) || { current: 0, target: def.target };

      return {
        slug: def.slug,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        rarity: def.rarity,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
        progress: unlockedAt
          ? null
          : {
              current: progress.current,
              target: progress.target,
              percent: Math.min(
                100,
                Math.round((progress.current / progress.target) * 100),
              ),
            },
      };
    });

    // Calcula summary
    const summary = {
      total: BADGE_CATALOG.length,
      unlocked: unlockedBadges.length,
      byRarity: {
        common: { total: 0, unlocked: 0 },
        rare: { total: 0, unlocked: 0 },
        epic: { total: 0, unlocked: 0 },
        legendary: { total: 0, unlocked: 0 },
      },
    };

    for (const def of BADGE_CATALOG) {
      summary.byRarity[def.rarity].total++;
      if (unlockedMap.has(def.slug)) {
        summary.byRarity[def.rarity].unlocked++;
      }
    }

    return { badges, summary };
  }

  async evaluateAndUnlockBadges(
    userId: string,
    action: string,
  ): Promise<UnlockedBadge[]> {
    const relevantSlugs = ACTION_TO_BADGES[action] || [];
    if (relevantSlugs.length === 0) return [];

    // Verifica quais desses badges ja foram desbloqueados
    const alreadyUnlocked = await this.prisma.userBadge.findMany({
      where: { userId, badgeSlug: { in: relevantSlugs } },
    });
    const alreadyUnlockedSet = new Set(alreadyUnlocked.map((b) => b.badgeSlug));

    const toCheck = relevantSlugs.filter(
      (slug) => !alreadyUnlockedSet.has(slug),
    );
    if (toCheck.length === 0) return [];

    const progressMap = await this.computeAllProgress(userId);
    const newlyUnlocked: UnlockedBadge[] = [];

    for (const slug of toCheck) {
      const def = BADGE_CATALOG.find((b) => b.slug === slug);
      if (!def) continue;

      const progress = progressMap.get(slug);
      if (!progress) continue;

      if (progress.current >= def.target) {
        // Desbloqueia badge
        await this.prisma.userBadge.create({
          data: { userId, badgeSlug: slug },
        });

        newlyUnlocked.push({
          slug: def.slug,
          name: def.name,
          description: def.description,
          icon: def.icon,
          rarity: def.rarity,
        });

        this.logger.log(`User ${userId} unlocked badge: ${def.name}`);
      }
    }

    return newlyUnlocked;
  }

  private async computeAllProgress(
    userId: string,
  ): Promise<Map<string, { current: number; target: number }>> {
    const map = new Map<string, { current: number; target: number }>();

    // Busca todos os contadores necessarios em paralelo
    const [
      videosCompleted,
      coursesCompleted,
      quizzesPassed,
      quizzesPerfect,
      forumTopics,
      forumSolutions,
      totalUpvotesOnTopics,
      totalUpvotesOnReplies,
      videoNotes,
      chatConversations,
      streak,
      speedLearnerCount,
      quizStreakCount,
      quizMasterCount,
      earlyBirdCount,
      nightOwlCount,
    ] = await Promise.all([
      // Videos completados
      this.prisma.progress.count({
        where: { userId, completed: true },
      }),
      // Cursos completados
      this.prisma.enrollment.count({
        where: { userId, completedAt: { not: null } },
      }),
      // Quizzes aprovados
      this.prisma.quizAttempt.count({
        where: { userId, passed: true },
      }),
      // Quizzes com nota maxima
      this.prisma.quizAttempt.count({
        where: { userId, score: 100 },
      }),
      // Topicos no forum
      this.prisma.forumTopic.count({
        where: { authorId: userId },
      }),
      // Respostas marcadas como solucao
      this.prisma.forumReply.count({
        where: { authorId: userId, isSolution: true },
      }),
      // Upvotes recebidos em topicos
      this.prisma.forumTopic.aggregate({
        _sum: { upvotes: true },
        where: { authorId: userId },
      }),
      // Upvotes recebidos em respostas
      this.prisma.forumReply.aggregate({
        _sum: { upvotes: true },
        where: { authorId: userId },
      }),
      // Notas de video
      this.prisma.videoNote.count({
        where: { userId },
      }),
      // Conversas de chat
      this.prisma.chatConversation.count({
        where: { userId },
      }),
      // Streak
      this.prisma.userStreak.findUnique({
        where: { userId },
      }),
      // Speed learner: cursos completados em menos de 7 dias
      this.prisma.enrollment.count({
        where: {
          userId,
          completedAt: { not: null },
          // Prisma nao suporta campo vs campo diretamente, usamos rawQuery se necessario
          // Por ora, contamos via logica
        },
      }),
      // Quiz streak: quizzes passados consecutivos
      this.computeQuizStreak(userId),
      // Quiz master: passou em todos quizzes de algum curso
      this.computeQuizMaster(userId),
      // Early bird: acao antes das 7h
      this.prisma.xpLog.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(7, 0, 0, 0)),
          },
        },
      }),
      // Night owl: acao apos meia-noite (0h-5h)
      this.prisma.xpLog.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(5, 0, 0, 0)),
          },
        },
      }),
    ]);

    const totalUpvotes =
      (totalUpvotesOnTopics._sum.upvotes || 0) +
      (totalUpvotesOnReplies._sum.upvotes || 0);

    const currentStreak = streak?.currentStreak || 0;
    const longestStreak = streak?.longestStreak || 0;
    const bestStreak = Math.max(currentStreak, longestStreak);

    // Progress badges
    map.set('first-video', { current: videosCompleted, target: 1 });
    map.set('video-10', { current: videosCompleted, target: 10 });
    map.set('video-50', { current: videosCompleted, target: 50 });
    map.set('video-100', { current: videosCompleted, target: 100 });
    map.set('first-course', { current: coursesCompleted, target: 1 });
    map.set('course-3', { current: coursesCompleted, target: 3 });
    map.set('speed-learner', {
      current: await this.computeSpeedLearner(userId),
      target: 1,
    });

    // Quiz badges
    map.set('first-quiz', { current: quizzesPassed, target: 1 });
    map.set('quiz-perfect', { current: quizzesPerfect, target: 1 });
    map.set('quiz-10-perfect', { current: quizzesPerfect, target: 10 });
    map.set('quiz-streak-5', { current: quizStreakCount, target: 5 });
    map.set('quiz-master', { current: quizMasterCount, target: 1 });

    // Community badges
    map.set('first-post', { current: forumTopics, target: 1 });
    map.set('helper', { current: forumSolutions, target: 1 });
    map.set('guru', { current: forumSolutions, target: 10 });
    map.set('upvoted-10', { current: totalUpvotes, target: 10 });
    map.set('upvoted-50', { current: totalUpvotes, target: 50 });

    // Consistency badges
    map.set('streak-3', { current: bestStreak, target: 3 });
    map.set('streak-7', { current: bestStreak, target: 7 });
    map.set('streak-30', { current: bestStreak, target: 30 });
    map.set('streak-100', { current: bestStreak, target: 100 });

    // Special badges
    map.set('early-bird', { current: earlyBirdCount > 0 ? 1 : 0, target: 1 });
    map.set('night-owl', { current: nightOwlCount > 0 ? 1 : 0, target: 1 });
    map.set('ai-explorer', { current: chatConversations, target: 10 });
    map.set('note-taker', { current: videoNotes, target: 50 });
    map.set('top-10', {
      current: await this.computeTop10(userId),
      target: 1,
    });

    return map;
  }

  private async computeSpeedLearner(userId: string): Promise<number> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, completedAt: { not: null } },
      select: { enrolledAt: true, completedAt: true },
    });

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return enrollments.filter(
      (e) =>
        e.completedAt &&
        e.completedAt.getTime() - e.enrolledAt.getTime() < sevenDaysMs,
    ).length;
  }

  private async computeQuizStreak(userId: string): Promise<number> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      select: { passed: true },
      take: 20,
    });

    let streak = 0;
    for (const a of attempts) {
      if (a.passed) streak++;
      else break;
    }
    return streak;
  }

  private async computeQuizMaster(userId: string): Promise<number> {
    // Verifica se o usuario passou em todos os quizzes de pelo menos 1 curso
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });

    for (const enrollment of enrollments) {
      const allQuizzes = await this.prisma.quiz.findMany({
        where: {
          video: { module: { courseId: enrollment.courseId } },
        },
        select: { id: true },
      });

      if (allQuizzes.length === 0) continue;

      const passedQuizIds = await this.prisma.quizAttempt.findMany({
        where: {
          userId,
          passed: true,
          quizId: { in: allQuizzes.map((q) => q.id) },
        },
        select: { quizId: true },
        distinct: ['quizId'],
      });

      if (passedQuizIds.length >= allQuizzes.length) {
        return 1;
      }
    }

    return 0;
  }

  private async computeTop10(userId: string): Promise<number> {
    // Verifica se o usuario esta no top 10 do ranking mensal atual
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const topUsers = await this.prisma.xpLog.groupBy({
      by: ['userId'],
      _sum: { xp: true },
      where: { createdAt: { gte: startOfMonth } },
      orderBy: { _sum: { xp: 'desc' } },
      take: 10,
    });

    return topUsers.some((u) => u.userId === userId) ? 1 : 0;
  }
}
