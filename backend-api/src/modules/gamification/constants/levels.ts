export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  xpRequired: number;
}

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
  const progressPercent = Math.min(
    100,
    Math.round((xpInLevel / xpNeeded) * 100),
  );

  return {
    current: currentLevel.level,
    title: currentLevel.title,
    color: currentLevel.color,
    xpForCurrentLevel: currentLevel.xpRequired,
    xpForNextLevel: nextLevel.xpRequired,
    progressPercent,
  };
}
