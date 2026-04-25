export const AnalyticsEvents = {
  QUIZ_GENERATED:         'quiz_generated',
  QUIZ_STARTED:           'quiz_started',
  QUIZ_COMPLETED:         'quiz_completed',
  QUIZ_QUESTION_ANSWERED: 'quiz_question_answered',
  XP_AWARDED:             'xp_awarded',
  LEVEL_UP:               'level_up',
  BADGE_UNLOCKED:         'badge_unlocked',
  STREAK_INCREMENTED:     'streak_incremented',
  STREAK_SAVED:           'streak_saved',
  STREAK_BROKEN:          'streak_broken',
  CHALLENGE_COMPLETED:    'challenge_completed',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

export interface AnalyticsEventProps {
  [AnalyticsEvents.QUIZ_GENERATED]:    { videoId: string; specialtyId?: string; difficulty?: string };
  [AnalyticsEvents.QUIZ_STARTED]:      { quizId: string };
  [AnalyticsEvents.QUIZ_COMPLETED]:    { quizId: string; score: number; passed: boolean; timeSpent: number; correctCount: number; totalQuestions: number };
  [AnalyticsEvents.QUIZ_QUESTION_ANSWERED]: { quizId: string; questionId: string; isCorrect: boolean; confidence?: string; timeSpent?: number; xpAwarded?: number };
  [AnalyticsEvents.XP_AWARDED]:        { action: string; xp: number; referenceId?: string };
  [AnalyticsEvents.LEVEL_UP]:          { newLevel: number; newTitle: string };
  [AnalyticsEvents.BADGE_UNLOCKED]:    { badgeSlug: string };
  [AnalyticsEvents.STREAK_INCREMENTED]: { newStreak: number };
  [AnalyticsEvents.STREAK_SAVED]:      { freezesRemaining: number };
  [AnalyticsEvents.STREAK_BROKEN]:     { previousStreak: number };
  [AnalyticsEvents.CHALLENGE_COMPLETED]: { challengeId: string; xp: number };
}
