/**
 * Helpers de progresso de curso.
 *
 * Espelha o helper do mobile (`mobile-app/src/lib/course-progress.ts`):
 * resolve a porcentagem privilegiando o ponderado por watchTime quando
 * disponivel, com fallback para o binario por aulas concluidas.
 *
 * Uso:
 * - Barras de progresso e indicadores granulares -> getCourseWeightedPercent.
 * - Filtros de "concluido" / "100%" -> usar campo binario explicito
 *   (CourseProgress.progressPercentage ou progress.percentage), nao o
 *   ponderado, pois weighted pode chegar a 100% sem o aluno marcar
 *   todas as aulas como concluidas (ex: assistir 100% sem clicar).
 */

interface ProgressLike {
  weightedPercentage?: number | null;
  percentage?: number | null;
  progressPercentage?: number | null;
}

interface EnrollmentLike {
  progress?: number | null;
}

/**
 * Retorna o % a usar para barras/indicadores. Prioriza weighted,
 * faz fallback pro binario em payloads/cursos legacy.
 */
export function getCourseWeightedPercent(
  source: {
    progress?: ProgressLike | null;
    enrollment?: EnrollmentLike | null;
  } | ProgressLike,
): number {
  // Aceita tanto { progress: { ... } } (EnrolledCourseWithProgress) quanto
  // ProgressLike direto (CourseProgress).
  const p: ProgressLike | undefined =
    'progress' in source && typeof source.progress === 'object' && source.progress !== null
      ? (source.progress as ProgressLike)
      : (source as ProgressLike);
  const enrollmentProgress =
    'enrollment' in source && source.enrollment
      ? source.enrollment.progress
      : undefined;

  const value =
    p?.weightedPercentage ??
    p?.percentage ??
    p?.progressPercentage ??
    enrollmentProgress ??
    0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

/**
 * Retorna o % binario por aulas concluidas. Usar pra "concluido" e
 * filtros de 100% — weighted nao deve disparar concluido sozinho.
 */
export function getCourseBinaryPercent(
  source: {
    progress?: ProgressLike | null;
    enrollment?: EnrollmentLike | null;
  } | ProgressLike,
): number {
  const p: ProgressLike | undefined =
    'progress' in source && typeof source.progress === 'object' && source.progress !== null
      ? (source.progress as ProgressLike)
      : (source as ProgressLike);
  const enrollmentProgress =
    'enrollment' in source && source.enrollment
      ? source.enrollment.progress
      : undefined;

  const value =
    p?.percentage ??
    p?.progressPercentage ??
    enrollmentProgress ??
    0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}
