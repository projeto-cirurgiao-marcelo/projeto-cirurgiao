import type {
  GamificationProfileResponse,
  BadgesResponse,
  LeaderboardResponse,
  LeaderboardPeriod,
  ChallengesResponse,
  ClaimChallengeResponse,
  GamificationEventsResponse,
  Badge,
  LeaderboardEntry,
  Challenge,
  XpHistoryEntry,
  GamificationEvent,
} from './types';
import { BADGE_CATALOG, LEVELS } from './constants';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== Mock Data Generators =====

function generateMockBadges(): Badge[] {
  const unlockedSlugs = [
    'first-video', 'video-10', 'first-quiz', 'quiz-perfect',
    'first-post', 'upvoted-10', 'streak-3', 'streak-7',
  ];

  const progressMap: Record<string, { current: number; target: number }> = {
    'video-50': { current: 23, target: 50 },
    'video-100': { current: 23, target: 100 },
    'course-3': { current: 1, target: 3 },
    'quiz-10-perfect': { current: 3, target: 10 },
    'quiz-streak-5': { current: 3, target: 5 },
    'helper': { current: 0, target: 1 },
    'guru': { current: 0, target: 10 },
    'upvoted-50': { current: 14, target: 50 },
    'streak-30': { current: 12, target: 30 },
    'streak-100': { current: 12, target: 100 },
    'ai-explorer': { current: 4, target: 10 },
    'note-taker': { current: 18, target: 50 },
  };

  return BADGE_CATALOG.map((def) => {
    const isUnlocked = unlockedSlugs.includes(def.slug);
    const prog = progressMap[def.slug];

    return {
      slug: def.slug,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      rarity: def.rarity,
      unlockedAt: isUnlocked
        ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      progress: prog
        ? { current: prog.current, target: prog.target, percent: Math.round((prog.current / prog.target) * 100) }
        : isUnlocked
          ? { current: def.target, target: def.target, percent: 100 }
          : { current: 0, target: def.target, percent: 0 },
    };
  });
}

function generateMockLeaderboard(period: LeaderboardPeriod): LeaderboardEntry[] {
  const names = [
    'Ana Martins', 'Carlos Silva', 'Fernanda Lima', 'Gabriel Santos',
    'Isabela Costa', 'Joao Oliveira', 'Larissa Souza', 'Marcos Pereira',
    'Natalia Rocha', 'Pedro Almeida', 'Rafaela Gomes', 'Thiago Ribeiro',
    'Vanessa Dias', 'William Ferreira', 'Yasmin Araujo', 'Bruno Cardoso',
    'Camila Moreira', 'Daniel Barbosa', 'Elena Nunes', 'Felipe Mendes',
  ];

  return names.map((name, index) => {
    const xpBase = period === 'weekly' ? 400 : 1800;
    const xp = Math.max(10, xpBase - index * (period === 'weekly' ? 25 : 80) + Math.floor(Math.random() * 50));
    const levelInfo = LEVELS[Math.min(Math.floor(Math.random() * 7) + 2, 9)];

    return {
      rank: index + 1,
      userId: `user-${index + 1}`,
      displayName: name,
      avatarUrl: null,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      levelColor: levelInfo.color,
      xpEarned: xp,
      videosCompleted: Math.floor(Math.random() * 15) + 1,
      quizzesPassed: Math.floor(Math.random() * 8),
      currentStreak: Math.floor(Math.random() * 20),
    };
  });
}

function generateMockChallenges(): { daily: Challenge[]; weekly: Challenge[]; special: Challenge[] } {
  const now = new Date();

  const daily: Challenge[] = [
    {
      id: 'ch-d1',
      type: 'daily',
      title: 'Assista 2 videoaulas',
      description: 'Complete pelo menos 2 videoaulas hoje',
      difficulty: 'easy',
      xpReward: 25,
      icon: 'Play',
      progress: 50,
      target: 2,
      current: 1,
      expiresAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString(),
      completedAt: null,
      claimedAt: null,
      status: 'active',
    },
    {
      id: 'ch-d2',
      type: 'daily',
      title: 'Passe em um quiz',
      description: 'Complete e passe em qualquer quiz disponível',
      difficulty: 'medium',
      xpReward: 50,
      icon: 'ClipboardCheck',
      progress: 0,
      target: 1,
      current: 0,
      expiresAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString(),
      completedAt: null,
      claimedAt: null,
      status: 'active',
    },
    {
      id: 'ch-d3',
      type: 'daily',
      title: 'Faça uma anotação',
      description: 'Crie uma anotação em qualquer videoaula',
      difficulty: 'easy',
      xpReward: 25,
      icon: 'NotebookPen',
      progress: 100,
      target: 1,
      current: 1,
      expiresAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString(),
      completedAt: new Date().toISOString(),
      claimedAt: null,
      status: 'completed',
    },
  ];

  const weekly: Challenge[] = [
    {
      id: 'ch-w1',
      type: 'weekly',
      title: 'Complete 10 videoaulas',
      description: 'Assista e complete 10 videoaulas esta semana',
      difficulty: 'hard',
      xpReward: 100,
      icon: 'Tv',
      progress: 30,
      target: 10,
      current: 3,
      expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      claimedAt: null,
      status: 'active',
    },
    {
      id: 'ch-w2',
      type: 'weekly',
      title: 'Tire 90%+ em 3 quizzes',
      description: 'Alcance nota 90 ou superior em 3 quizzes diferentes',
      difficulty: 'hard',
      xpReward: 100,
      icon: 'Star',
      progress: 33,
      target: 3,
      current: 1,
      expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      claimedAt: null,
      status: 'active',
    },
  ];

  return { daily, weekly, special: [] };
}

function generateMockXpHistory(): XpHistoryEntry[] {
  const entries: XpHistoryEntry[] = [
    { action: 'video_complete', xp: 25, timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), description: 'Completou "Suturas Básicas - Parte 1"' },
    { action: 'quiz_pass', xp: 50, timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), description: 'Aprovado no quiz "Anatomia Canina"' },
    { action: 'daily_login', xp: 10, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), description: 'Login diário' },
    { action: 'video_note', xp: 5, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), description: 'Anotação em "Técnicas de Anestesia"' },
    { action: 'forum_reply', xp: 10, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), description: 'Resposta no fórum "Dúvidas sobre Ortopedia"' },
    { action: 'video_complete', xp: 25, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), description: 'Completou "Preparação Pré-Operatória"' },
    { action: 'quiz_perfect', xp: 75, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), description: 'Nota máxima no quiz "Farmacologia"' },
    { action: 'streak_milestone', xp: 50, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), description: 'Sequência de 7 dias!' },
    { action: 'video_milestone', xp: 5, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), description: '75% de "Cirurgia Ortopédica Avançada"' },
    { action: 'ai_chat', xp: 5, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), description: 'Conversa com Mentor IA' },
    { action: 'course_complete', xp: 500, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), description: 'Completou o curso "Fundamentos de Cirurgia"' },
    { action: 'forum_solution', xp: 50, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), description: 'Resposta marcada como solução' },
    { action: 'challenge_complete', xp: 50, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), description: 'Desafio "Assistir 5 vídeos" completado' },
    { action: 'video_like', xp: 2, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), description: 'Curtiu "Emergências Veterinárias"' },
    { action: 'ai_summary', xp: 10, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), description: 'Resumo gerado para "Pós-Operatório"' },
  ];

  return entries;
}

// ===== Mock Service =====

export const gamificationMock = {
  async getProfile(): Promise<GamificationProfileResponse> {
    await delay(300);
    return {
      xp: { total: 1850, todayEarned: 85, weekEarned: 340, monthEarned: 1200 },
      level: {
        current: 5,
        title: 'Cirurgião Júnior',
        color: '#F59E0B',
        xpForCurrentLevel: 1500,
        xpForNextLevel: 3000,
        progressPercent: 23,
      },
      streak: {
        current: 12,
        longest: 18,
        lastActiveDate: new Date().toISOString().split('T')[0],
        freezesAvailable: 1,
        todayCompleted: true,
      },
      stats: {
        videosCompleted: 23,
        totalWatchTimeMinutes: 1847,
        quizzesPassed: 8,
        quizAverageScore: 82,
        forumTopics: 5,
        forumReplies: 12,
        forumSolutions: 2,
        coursesCompleted: 1,
      },
      recentXpHistory: generateMockXpHistory(),
    };
  },

  async getBadges(): Promise<BadgesResponse> {
    await delay(300);
    const badges = generateMockBadges();
    const unlocked = badges.filter((b) => b.unlockedAt !== null).length;

    const byRarity = {
      common: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 },
    };

    badges.forEach((b) => {
      byRarity[b.rarity].total++;
      if (b.unlockedAt) byRarity[b.rarity].unlocked++;
    });

    return {
      badges,
      summary: { total: badges.length, unlocked, byRarity },
    };
  },

  async getLeaderboard(
    period: LeaderboardPeriod = 'weekly',
    _page = 1,
    _limit = 50
  ): Promise<LeaderboardResponse> {
    await delay(400);
    const now = new Date();
    const entries = generateMockLeaderboard(period);

    // Insert current user at rank 7
    const currentUserEntry: LeaderboardEntry = {
      rank: 7,
      userId: 'current-user',
      displayName: 'Você',
      avatarUrl: null,
      level: 5,
      levelTitle: 'Cirurgião Júnior',
      levelColor: '#F59E0B',
      xpEarned: period === 'weekly' ? 285 : 1200,
      videosCompleted: 6,
      quizzesPassed: 3,
      currentStreak: 12,
    };

    // Replace rank 7
    entries[6] = currentUserEntry;

    return {
      period,
      periodStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: now.toISOString(),
      totalParticipants: 156,
      entries,
      currentUser: {
        rank: 7,
        xpEarned: currentUserEntry.xpEarned,
        level: 5,
        levelTitle: 'Cirurgião Júnior',
      },
    };
  },

  async getChallenges(): Promise<ChallengesResponse> {
    await delay(300);
    const { daily, weekly, special } = generateMockChallenges();
    return {
      daily,
      weekly,
      special,
      completedToday: 1,
      totalCompleted: 24,
    };
  },

  async claimChallenge(challengeId: string): Promise<ClaimChallengeResponse> {
    await delay(500);
    return {
      success: true,
      xpAwarded: 25,
      newTotalXp: 1875,
      levelUp: null,
      badgesUnlocked: [],
    };
  },

  async getEvents(): Promise<GamificationEventsResponse> {
    await delay(200);
    return { events: [] };
  },

  async markEventSeen(_eventId: string): Promise<void> {
    await delay(100);
  },

  async getEventHistory(_limit: number = 30): Promise<import('./types').GamificationEventHistoryResponse> {
    await delay(200);
    return { events: [], unreadCount: 0 };
  },

  async markEventRead(_eventId: string): Promise<void> {
    await delay(100);
  },

  async markAllEventsRead(): Promise<void> {
    await delay(100);
  },
};
