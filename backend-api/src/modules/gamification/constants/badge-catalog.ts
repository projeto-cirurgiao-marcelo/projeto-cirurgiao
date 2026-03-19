export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory =
  | 'progress'
  | 'quizzes'
  | 'community'
  | 'consistency'
  | 'special';

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  target: number;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  // Progresso de Estudos
  {
    slug: 'first-video',
    name: 'Primeira Aula',
    description: 'Completou sua primeira videoaula',
    icon: 'Play',
    category: 'progress',
    rarity: 'common',
    target: 1,
  },
  {
    slug: 'video-10',
    name: 'Dedicado',
    description: 'Completou 10 videoaulas',
    icon: 'MonitorPlay',
    category: 'progress',
    rarity: 'common',
    target: 10,
  },
  {
    slug: 'video-50',
    name: 'Maratonista',
    description: 'Completou 50 videoaulas',
    icon: 'Tv',
    category: 'progress',
    rarity: 'rare',
    target: 50,
  },
  {
    slug: 'video-100',
    name: 'Incansável',
    description: 'Completou 100 videoaulas',
    icon: 'Film',
    category: 'progress',
    rarity: 'epic',
    target: 100,
  },
  {
    slug: 'first-course',
    name: 'Formado',
    description: 'Completou seu primeiro curso',
    icon: 'GraduationCap',
    category: 'progress',
    rarity: 'rare',
    target: 1,
  },
  {
    slug: 'course-3',
    name: 'Multi-Especialista',
    description: 'Completou 3 cursos',
    icon: 'Award',
    category: 'progress',
    rarity: 'epic',
    target: 3,
  },
  {
    slug: 'speed-learner',
    name: 'Aprendiz Veloz',
    description: 'Completou um curso em menos de 7 dias',
    icon: 'Zap',
    category: 'progress',
    rarity: 'legendary',
    target: 1,
  },

  // Quizzes
  {
    slug: 'first-quiz',
    name: 'Testado',
    description: 'Passou no primeiro quiz',
    icon: 'ClipboardCheck',
    category: 'quizzes',
    rarity: 'common',
    target: 1,
  },
  {
    slug: 'quiz-perfect',
    name: 'Nota Máxima',
    description: 'Tirou 100% em um quiz',
    icon: 'Star',
    category: 'quizzes',
    rarity: 'rare',
    target: 1,
  },
  {
    slug: 'quiz-10-perfect',
    name: 'Perfeccionista',
    description: 'Tirou 100% em 10 quizzes',
    icon: 'Stars',
    category: 'quizzes',
    rarity: 'epic',
    target: 10,
  },
  {
    slug: 'quiz-streak-5',
    name: 'Sequência Perfeita',
    description: 'Passou em 5 quizzes seguidos',
    icon: 'Flame',
    category: 'quizzes',
    rarity: 'rare',
    target: 5,
  },
  {
    slug: 'quiz-master',
    name: 'Mestre dos Quizzes',
    description: 'Passou em todos os quizzes de um curso',
    icon: 'Trophy',
    category: 'quizzes',
    rarity: 'epic',
    target: 1,
  },

  // Comunidade
  {
    slug: 'first-post',
    name: 'Comunicativo',
    description: 'Criou seu primeiro tópico no fórum',
    icon: 'MessageSquare',
    category: 'community',
    rarity: 'common',
    target: 1,
  },
  {
    slug: 'helper',
    name: 'Ajudante',
    description: 'Teve uma resposta marcada como solução',
    icon: 'HandHelping',
    category: 'community',
    rarity: 'rare',
    target: 1,
  },
  {
    slug: 'guru',
    name: 'Guru',
    description: 'Teve 10 respostas marcadas como solução',
    icon: 'Crown',
    category: 'community',
    rarity: 'epic',
    target: 10,
  },
  {
    slug: 'upvoted-10',
    name: 'Popular',
    description: 'Recebeu 10 upvotes em tópicos ou respostas',
    icon: 'ThumbsUp',
    category: 'community',
    rarity: 'common',
    target: 10,
  },
  {
    slug: 'upvoted-50',
    name: 'Influenciador',
    description: 'Recebeu 50 upvotes',
    icon: 'TrendingUp',
    category: 'community',
    rarity: 'rare',
    target: 50,
  },

  // Consistencia
  {
    slug: 'streak-3',
    name: 'Começando Bem',
    description: '3 dias consecutivos de estudo',
    icon: 'Calendar',
    category: 'consistency',
    rarity: 'common',
    target: 3,
  },
  {
    slug: 'streak-7',
    name: 'Semana Perfeita',
    description: '7 dias consecutivos de estudo',
    icon: 'CalendarCheck',
    category: 'consistency',
    rarity: 'rare',
    target: 7,
  },
  {
    slug: 'streak-30',
    name: 'Mês de Dedicação',
    description: '30 dias consecutivos de estudo',
    icon: 'CalendarHeart',
    category: 'consistency',
    rarity: 'epic',
    target: 30,
  },
  {
    slug: 'streak-100',
    name: 'Imparável',
    description: '100 dias consecutivos de estudo',
    icon: 'Rocket',
    category: 'consistency',
    rarity: 'legendary',
    target: 100,
  },

  // Especiais
  {
    slug: 'early-bird',
    name: 'Madrugador',
    description: 'Estudou antes das 7h da manhã',
    icon: 'Sunrise',
    category: 'special',
    rarity: 'rare',
    target: 1,
  },
  {
    slug: 'night-owl',
    name: 'Coruja',
    description: 'Estudou após meia-noite',
    icon: 'Moon',
    category: 'special',
    rarity: 'rare',
    target: 1,
  },
  {
    slug: 'ai-explorer',
    name: 'Explorador IA',
    description: 'Usou o chat com IA 10 vezes',
    icon: 'Bot',
    category: 'special',
    rarity: 'rare',
    target: 10,
  },
  {
    slug: 'note-taker',
    name: 'Anotador',
    description: 'Criou 50 anotações em vídeos',
    icon: 'NotebookPen',
    category: 'special',
    rarity: 'rare',
    target: 50,
  },
  {
    slug: 'top-10',
    name: 'Elite',
    description: 'Ficou no Top 10 do ranking mensal',
    icon: 'Medal',
    category: 'special',
    rarity: 'legendary',
    target: 1,
  },
];

// Mapeamento de badges por tipo de acao para avaliacao eficiente
export const ACTION_TO_BADGES: Record<string, string[]> = {
  video_complete: [
    'first-video',
    'video-10',
    'video-50',
    'video-100',
    'early-bird',
    'night-owl',
  ],
  module_complete: [],
  course_complete: ['first-course', 'course-3', 'speed-learner'],
  quiz_pass: ['first-quiz', 'quiz-streak-5', 'quiz-master'],
  quiz_perfect: ['quiz-perfect', 'quiz-10-perfect'],
  forum_topic: ['first-post'],
  forum_reply: [],
  forum_solution: ['helper', 'guru'],
  video_note: ['note-taker'],
  video_like: [],
  ai_chat: ['ai-explorer'],
  ai_summary: [],
  daily_login: ['streak-3', 'streak-7', 'streak-30', 'streak-100'],
  streak_milestone: ['streak-3', 'streak-7', 'streak-30', 'streak-100'],
};
