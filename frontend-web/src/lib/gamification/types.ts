// ===== Core Types =====

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'progress' | 'quizzes' | 'community' | 'consistency' | 'special';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeType = 'daily' | 'weekly' | 'special';
export type ChallengeStatus = 'active' | 'completed' | 'expired';
export type LeaderboardPeriod = 'weekly' | 'monthly';
export type GamificationEventType =
  | 'xp_earned'
  | 'level_up'
  | 'badge_unlocked'
  | 'streak_milestone'
  | 'challenge_completed'
  | 'leaderboard_change';

// ===== Level System =====

export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  xpRequired: number;
}

export interface UserLevel {
  current: number;
  title: string;
  color: string;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

// ===== XP System =====

export interface UserXp {
  total: number;
  todayEarned: number;
  weekEarned: number;
  monthEarned: number;
}

export interface XpHistoryEntry {
  action: string;
  xp: number;
  timestamp: string;
  description: string;
}

// ===== Streak System =====

export interface UserStreak {
  current: number;
  longest: number;
  lastActiveDate: string;
  freezesAvailable: number;
  todayCompleted: boolean;
}

// ===== Stats =====

export interface UserStats {
  videosCompleted: number;
  totalWatchTimeMinutes: number;
  quizzesPassed: number;
  quizAverageScore: number;
  forumTopics: number;
  forumReplies: number;
  forumSolutions: number;
  coursesCompleted: number;
}

// ===== Profile =====

export interface GamificationProfile {
  xp: UserXp;
  level: UserLevel;
  streak: UserStreak;
  stats: UserStats;
  recentXpHistory: XpHistoryEntry[];
}

// ===== Badges =====

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  target: number;
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

export interface BadgesSummary {
  total: number;
  unlocked: number;
  byRarity: Record<BadgeRarity, { total: number; unlocked: number }>;
}

// ===== Leaderboard =====

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

// ===== Challenges =====

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

// ===== Gamification Events =====

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
  readAt: string | null;
}

// ===== API Response DTOs =====

export interface GamificationProfileResponse {
  xp: UserXp;
  level: UserLevel;
  streak: UserStreak;
  stats: UserStats;
  recentXpHistory: XpHistoryEntry[];
}

export interface BadgesResponse {
  badges: Badge[];
  summary: BadgesSummary;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  periodStart: string;
  periodEnd: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  currentUser: LeaderboardCurrentUser;
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
  badgesUnlocked: Array<{
    slug: string;
    name: string;
    icon: string;
    rarity: string;
  }>;
}

export interface GamificationEventsResponse {
  events: GamificationEvent[];
}

export interface GamificationEventHistoryResponse {
  events: GamificationEvent[];
  unreadCount: number;
}
