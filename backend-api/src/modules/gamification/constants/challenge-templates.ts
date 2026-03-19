import { ChallengePeriod, GamificationChallengeDifficulty } from '@prisma/client';

export interface ChallengeTemplate {
  key: string;
  title: string;
  description: string;
  type: ChallengePeriod;
  difficulty: GamificationChallengeDifficulty;
  target: number;
  xpReward: number;
  icon: string;
}

export const DAILY_CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    key: 'watch_1_video',
    title: 'Assista 1 videoaula',
    description: 'Complete pelo menos 1 videoaula hoje',
    type: ChallengePeriod.DAILY,
    difficulty: GamificationChallengeDifficulty.EASY,
    target: 1,
    xpReward: 25,
    icon: 'Play',
  },
  {
    key: 'watch_2_videos',
    title: 'Assista 2 videoaulas',
    description: 'Complete pelo menos 2 videoaulas hoje',
    type: ChallengePeriod.DAILY,
    difficulty: GamificationChallengeDifficulty.EASY,
    target: 2,
    xpReward: 25,
    icon: 'Play',
  },
  {
    key: 'watch_3_videos',
    title: 'Assista 3 videoaulas',
    description: 'Complete pelo menos 3 videoaulas hoje',
    type: ChallengePeriod.DAILY,
    difficulty: GamificationChallengeDifficulty.MEDIUM,
    target: 3,
    xpReward: 50,
    icon: 'Tv',
  },
  {
    key: 'pass_quiz',
    title: 'Passe em um quiz',
    description: 'Seja aprovado em pelo menos 1 quiz hoje',
    type: ChallengePeriod.DAILY,
    difficulty: GamificationChallengeDifficulty.MEDIUM,
    target: 1,
    xpReward: 50,
    icon: 'ClipboardCheck',
  },
  {
    key: 'make_note',
    title: 'Faça uma anotação',
    description: 'Crie pelo menos 1 anotação em um vídeo',
    type: ChallengePeriod.DAILY,
    difficulty: GamificationChallengeDifficulty.EASY,
    target: 1,
    xpReward: 25,
    icon: 'NotebookPen',
  },
  {
    key: 'forum_activity',
    title: 'Participe do fórum',
    description: 'Crie um tópico ou responda a um tópico no fórum',
    type: ChallengePeriod.DAILY,
    difficulty: GamificationChallengeDifficulty.EASY,
    target: 1,
    xpReward: 25,
    icon: 'MessageSquare',
  },
  {
    key: 'use_ai',
    title: 'Converse com a IA',
    description: 'Envie pelo menos 1 mensagem no chat com IA',
    type: ChallengePeriod.DAILY,
    difficulty: GamificationChallengeDifficulty.EASY,
    target: 1,
    xpReward: 25,
    icon: 'Bot',
  },
];

export const WEEKLY_CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    key: 'weekly_5_videos',
    title: 'Complete 5 videoaulas',
    description: 'Complete 5 videoaulas esta semana',
    type: ChallengePeriod.WEEKLY,
    difficulty: GamificationChallengeDifficulty.MEDIUM,
    target: 5,
    xpReward: 50,
    icon: 'Tv',
  },
  {
    key: 'weekly_10_videos',
    title: 'Complete 10 videoaulas',
    description: 'Complete 10 videoaulas esta semana',
    type: ChallengePeriod.WEEKLY,
    difficulty: GamificationChallengeDifficulty.HARD,
    target: 10,
    xpReward: 100,
    icon: 'Film',
  },
  {
    key: 'weekly_3_quizzes',
    title: 'Passe em 3 quizzes',
    description: 'Seja aprovado em 3 quizzes esta semana',
    type: ChallengePeriod.WEEKLY,
    difficulty: GamificationChallengeDifficulty.MEDIUM,
    target: 3,
    xpReward: 50,
    icon: 'ClipboardCheck',
  },
  {
    key: 'weekly_streak_5',
    title: 'Mantenha 5 dias de sequência',
    description: 'Estude por 5 dias consecutivos esta semana',
    type: ChallengePeriod.WEEKLY,
    difficulty: GamificationChallengeDifficulty.MEDIUM,
    target: 5,
    xpReward: 50,
    icon: 'Flame',
  },
  {
    key: 'weekly_forum_3',
    title: 'Participe do fórum 3 vezes',
    description: 'Crie tópicos ou responda no fórum 3 vezes esta semana',
    type: ChallengePeriod.WEEKLY,
    difficulty: GamificationChallengeDifficulty.MEDIUM,
    target: 3,
    xpReward: 50,
    icon: 'MessageSquare',
  },
];

export const DAILY_CHALLENGES_COUNT = 3;
export const WEEKLY_CHALLENGES_COUNT = 2;
