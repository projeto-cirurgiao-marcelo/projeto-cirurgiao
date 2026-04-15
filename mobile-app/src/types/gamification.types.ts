export type BadgeCategory = 'progress' | 'quizzes' | 'community' | 'consistency' | 'special';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type GamificationEventType = 'xp_earned' | 'level_up' | 'badge_unlocked' | 'streak_milestone' | 'challenge_completed' | 'leaderboard_change';

export interface GamificationProfile {
  xp: {
    total: number;
    todayEarned: number;
    weekEarned: number;
    monthEarned: number;
  };
  level: {
    current: number;
    title: string;
    color: string;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    progressPercent: number;
  };
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string;
    freezesAvailable: number;
    todayCompleted: boolean;
  };
  stats: {
    videosCompleted: number;
    totalWatchTimeMinutes: number;
    quizzesPassed: number;
    quizAverageScore: number;
    forumTopics: number;
    forumReplies: number;
    forumSolutions: number;
    coursesCompleted: number;
  };
  recentXpHistory: Array<{
    action: string;
    xp: number;
    timestamp: string;
    description: string;
  }>;
}

export interface Badge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  unlockedAt: string | null;
  progress: {
    current: number;
    target: number;
    percent: number;
  } | null;
}

export interface BadgesResponse {
  badges: Badge[];
  summary: {
    total: number;
    unlocked: number;
    byRarity: Record<BadgeRarity, { total: number; unlocked: number }>;
  };
}

export interface GamificationEvent {
  id: string;
  type: GamificationEventType;
  timestamp: string;
  data: {
    xp?: number;
    action?: string;
    description?: string;
    newLevel?: number;
    newTitle?: string;
    badge?: {
      slug: string;
      name: string;
      icon: string;
      rarity: BadgeRarity;
      description: string;
    };
    streakDays?: number;
    challenge?: { title: string; xpReward: number };
    newRank?: number;
    previousRank?: number;
  };
  seen: boolean;
  readAt?: string | null;
}

export interface GamificationEventsResponse {
  events: GamificationEvent[];
}

export interface EventHistoryResponse {
  events: GamificationEvent[];
  unreadCount: number;
}

export interface LevelDefinition {
  level: number;
  title: string;
  color: string;
  xpRequired: number;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, title: 'Observador', color: '#6B7280', xpRequired: 0 },
  { level: 2, title: 'Estudante', color: '#22C55E', xpRequired: 100 },
  { level: 3, title: 'Praticante', color: '#3B82F6', xpRequired: 350 },
  { level: 4, title: 'Aprendiz Cirurgião', color: '#8B5CF6', xpRequired: 800 },
  { level: 5, title: 'Cirurgião Júnior', color: '#F59E0B', xpRequired: 1500 },
  { level: 6, title: 'Cirurgião Pleno', color: '#EF4444', xpRequired: 3000 },
  { level: 7, title: 'Cirurgião Sênior', color: '#EC4899', xpRequired: 5500 },
  { level: 8, title: 'Especialista', color: '#6366F1', xpRequired: 9000 },
  { level: 9, title: 'Mestre Cirurgião', color: '#D97706', xpRequired: 14000 },
  { level: 10, title: 'Lenda da Cirurgia', color: '#FFD700', xpRequired: 20000 },
];

export const RARITY_COLORS: Record<BadgeRarity, { border: string; bg: string; text: string }> = {
  common: { border: '#9CA3AF', bg: '#F3F4F6', text: '#6B7280' },
  rare: { border: '#3B82F6', bg: '#EFF6FF', text: '#2563EB' },
  epic: { border: '#8B5CF6', bg: '#F5F3FF', text: '#7C3AED' },
  legendary: { border: '#F59E0B', bg: '#FFFBEB', text: '#D97706' },
};

export const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Lendario',
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  progress: 'Progresso',
  quizzes: 'Quizzes',
  community: 'Comunidade',
  consistency: 'Consistencia',
  special: 'Especiais',
};

// Mapeamento de ícones do backend (Lucide) para Ionicons
export const BADGE_ICON_MAP: Record<string, string> = {
  Play: 'play-circle',
  MonitorPlay: 'eye',
  Tv: 'tv',
  Film: 'film',
  GraduationCap: 'school',
  Award: 'ribbon',
  Zap: 'flash',
  ClipboardCheck: 'clipboard',
  Star: 'star',
  Stars: 'sparkles',
  Flame: 'flame',
  Trophy: 'trophy',
  MessageSquare: 'chatbubble-outline',
  HandHelping: 'heart',
  Crown: 'diamond',
  ThumbsUp: 'thumbs-up',
  TrendingUp: 'trending-up',
  Calendar: 'calendar-outline',
  CalendarCheck: 'calendar',
  CalendarHeart: 'heart',
  Rocket: 'rocket',
  Sunrise: 'sunny',
  Moon: 'moon',
  Bot: 'chatbubble-ellipses',
  NotebookPen: 'create',
  Medal: 'medal',
};

export function resolveBadgeIcon(icon: string): string {
  return BADGE_ICON_MAP[icon] || 'ribbon';
}

// ===== Leaderboard =====

export type LeaderboardPeriod = 'weekly' | 'monthly';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  levelTitle: string;
  levelColor: string;
  xpEarned: number;
  videosCompleted: number;
  quizzesPassed: number;
  currentStreak: number;
}

export interface LeaderboardCurrentUser {
  rank: number;
  xpEarned: number;
  level: number;
  levelTitle: string;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  periodStart: string;
  periodEnd: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  currentUser: LeaderboardCurrentUser;
}

// ===== Challenges =====

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeType = 'daily' | 'weekly' | 'special';
export type ChallengeStatus = 'active' | 'completed' | 'expired';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  xpReward: number;
  icon: string;
  progress: number;
  target: number;
  current: number;
  expiresAt: string;
  completedAt: string | null;
  claimedAt: string | null;
  status: ChallengeStatus;
}

export interface ChallengesResponse {
  daily: Challenge[];
  weekly: Challenge[];
  special: Challenge[];
  completedToday: number;
  totalCompleted: number;
}

export interface ClaimChallengeResponse {
  success: boolean;
  xpAwarded: number;
  newTotalXp: number;
  levelUp: { newLevel: number; newTitle: string } | null;
  badgesUnlocked: Array<{ slug: string; name: string; icon: string; rarity: string }>;
}

export const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
};

export const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Facil',
  medium: 'Medio',
  hard: 'Dificil',
};
