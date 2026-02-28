import type { LevelInfo, BadgeDefinition, BadgeCategory, BadgeRarity } from './types';

// ===== Level System =====

export const LEVELS: LevelInfo[] = [
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

export function getLevelForXp(totalXp: number): LevelInfo {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (totalXp >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
}

export function getLevelProgress(totalXp: number) {
  const currentLevel = getLevelForXp(totalXp);
  const currentIndex = LEVELS.findIndex((l) => l.level === currentLevel.level);
  const nextLevel = LEVELS[currentIndex + 1];

  if (!nextLevel) {
    return {
      current: currentLevel.level,
      title: currentLevel.title,
      color: currentLevel.color,
      xpForCurrentLevel: currentLevel.xpRequired,
      xpForNextLevel: currentLevel.xpRequired,
      progressPercent: 100,
    };
  }

  const xpInLevel = totalXp - currentLevel.xpRequired;
  const xpNeeded = nextLevel.xpRequired - currentLevel.xpRequired;
  const progressPercent = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return {
    current: currentLevel.level,
    title: currentLevel.title,
    color: currentLevel.color,
    xpForCurrentLevel: currentLevel.xpRequired,
    xpForNextLevel: nextLevel.xpRequired,
    progressPercent,
  };
}

// ===== XP Rewards Table =====

export const XP_REWARDS = {
  VIDEO_MILESTONE: 5,
  VIDEO_COMPLETE: 25,
  MODULE_COMPLETE: 100,
  COURSE_COMPLETE: 500,
  QUIZ_PASS_FIRST: 50,
  QUIZ_PASS_RETRY: 30,
  QUIZ_PERFECT: 75,
  QUIZ_IMPROVEMENT: 10,
  FORUM_TOPIC: 15,
  FORUM_REPLY: 10,
  FORUM_SOLUTION: 50,
  FORUM_UPVOTE: 5,
  VIDEO_NOTE: 5,
  VIDEO_LIKE: 2,
  AI_CHAT: 5,
  AI_SUMMARY: 10,
  DAILY_LOGIN: 10,
  STREAK_7: 50,
  STREAK_30: 200,
  CHALLENGE_EASY: 25,
  CHALLENGE_MEDIUM: 50,
  CHALLENGE_HARD: 100,
} as const;

// ===== Badge Catalog =====

export const BADGE_CATALOG: BadgeDefinition[] = [
  // Progresso de Estudos
  { slug: 'first-video', name: 'Primeira Aula', description: 'Completou sua primeira videoaula', icon: 'Play', category: 'progress', rarity: 'common', target: 1 },
  { slug: 'video-10', name: 'Dedicado', description: 'Completou 10 videoaulas', icon: 'MonitorPlay', category: 'progress', rarity: 'common', target: 10 },
  { slug: 'video-50', name: 'Maratonista', description: 'Completou 50 videoaulas', icon: 'Tv', category: 'progress', rarity: 'rare', target: 50 },
  { slug: 'video-100', name: 'Incansável', description: 'Completou 100 videoaulas', icon: 'Film', category: 'progress', rarity: 'epic', target: 100 },
  { slug: 'first-course', name: 'Formado', description: 'Completou seu primeiro curso', icon: 'GraduationCap', category: 'progress', rarity: 'rare', target: 1 },
  { slug: 'course-3', name: 'Multi-Especialista', description: 'Completou 3 cursos', icon: 'Award', category: 'progress', rarity: 'epic', target: 3 },
  { slug: 'speed-learner', name: 'Aprendiz Veloz', description: 'Completou um curso em menos de 7 dias', icon: 'Zap', category: 'progress', rarity: 'legendary', target: 1 },

  // Quizzes
  { slug: 'first-quiz', name: 'Testado', description: 'Passou no primeiro quiz', icon: 'ClipboardCheck', category: 'quizzes', rarity: 'common', target: 1 },
  { slug: 'quiz-perfect', name: 'Nota Máxima', description: 'Tirou 100% em um quiz', icon: 'Star', category: 'quizzes', rarity: 'rare', target: 1 },
  { slug: 'quiz-10-perfect', name: 'Perfeccionista', description: 'Tirou 100% em 10 quizzes', icon: 'Stars', category: 'quizzes', rarity: 'epic', target: 10 },
  { slug: 'quiz-streak-5', name: 'Sequência Perfeita', description: 'Passou em 5 quizzes seguidos', icon: 'Flame', category: 'quizzes', rarity: 'rare', target: 5 },
  { slug: 'quiz-master', name: 'Mestre dos Quizzes', description: 'Passou em todos os quizzes de um curso', icon: 'Trophy', category: 'quizzes', rarity: 'epic', target: 1 },

  // Comunidade
  { slug: 'first-post', name: 'Comunicativo', description: 'Criou seu primeiro tópico no fórum', icon: 'MessageSquare', category: 'community', rarity: 'common', target: 1 },
  { slug: 'helper', name: 'Ajudante', description: 'Teve uma resposta marcada como solução', icon: 'HandHelping', category: 'community', rarity: 'rare', target: 1 },
  { slug: 'guru', name: 'Guru', description: 'Teve 10 respostas marcadas como solução', icon: 'Crown', category: 'community', rarity: 'epic', target: 10 },
  { slug: 'upvoted-10', name: 'Popular', description: 'Recebeu 10 upvotes em tópicos ou respostas', icon: 'ThumbsUp', category: 'community', rarity: 'common', target: 10 },
  { slug: 'upvoted-50', name: 'Influenciador', description: 'Recebeu 50 upvotes', icon: 'TrendingUp', category: 'community', rarity: 'rare', target: 50 },

  // Consistência
  { slug: 'streak-3', name: 'Começando Bem', description: '3 dias consecutivos de estudo', icon: 'Calendar', category: 'consistency', rarity: 'common', target: 3 },
  { slug: 'streak-7', name: 'Semana Perfeita', description: '7 dias consecutivos de estudo', icon: 'CalendarCheck', category: 'consistency', rarity: 'rare', target: 7 },
  { slug: 'streak-30', name: 'Mês de Dedicação', description: '30 dias consecutivos de estudo', icon: 'CalendarHeart', category: 'consistency', rarity: 'epic', target: 30 },
  { slug: 'streak-100', name: 'Imparável', description: '100 dias consecutivos de estudo', icon: 'Rocket', category: 'consistency', rarity: 'legendary', target: 100 },

  // Especiais
  { slug: 'early-bird', name: 'Madrugador', description: 'Estudou antes das 7h da manhã', icon: 'Sunrise', category: 'special', rarity: 'rare', target: 1 },
  { slug: 'night-owl', name: 'Coruja', description: 'Estudou após meia-noite', icon: 'Moon', category: 'special', rarity: 'rare', target: 1 },
  { slug: 'ai-explorer', name: 'Explorador IA', description: 'Usou o chat com IA 10 vezes', icon: 'Bot', category: 'special', rarity: 'rare', target: 10 },
  { slug: 'note-taker', name: 'Anotador', description: 'Criou 50 anotações em vídeos', icon: 'NotebookPen', category: 'special', rarity: 'rare', target: 50 },
  { slug: 'top-10', name: 'Elite', description: 'Ficou no Top 10 do ranking mensal', icon: 'Medal', category: 'special', rarity: 'legendary', target: 1 },
];

// ===== Category & Rarity Labels =====

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  progress: 'Progresso de Estudos',
  quizzes: 'Quizzes',
  community: 'Comunidade',
  consistency: 'Consistência',
  special: 'Especiais',
};

export const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

export const RARITY_COLORS: Record<BadgeRarity, { border: string; glow: string; bg: string; text: string }> = {
  common: { border: '#9CA3AF', glow: 'transparent', bg: '#F3F4F6', text: '#6B7280' },
  rare: { border: '#3B82F6', glow: 'rgba(59, 130, 246, 0.3)', bg: '#EFF6FF', text: '#2563EB' },
  epic: { border: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)', bg: '#F5F3FF', text: '#7C3AED' },
  legendary: { border: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)', bg: '#FFFBEB', text: '#D97706' },
};

// ===== XP Action Labels =====

export const XP_ACTION_LABELS: Record<string, string> = {
  video_milestone: 'Progresso em vídeo',
  video_complete: 'Vídeo completado',
  module_complete: 'Módulo completado',
  course_complete: 'Curso completado',
  quiz_pass: 'Quiz aprovado',
  quiz_perfect: 'Quiz nota máxima',
  quiz_improvement: 'Melhoria no quiz',
  forum_topic: 'Tópico no fórum',
  forum_reply: 'Resposta no fórum',
  forum_solution: 'Solução no fórum',
  forum_upvote: 'Upvote recebido',
  video_note: 'Nota criada',
  video_like: 'Vídeo curtido',
  ai_chat: 'Conversa com IA',
  ai_summary: 'Resumo gerado',
  daily_login: 'Login diário',
  streak_milestone: 'Marco de sequência',
  challenge_complete: 'Desafio completado',
};
