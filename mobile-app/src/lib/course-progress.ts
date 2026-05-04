/**
 * Helpers de progresso de curso.
 *
 * Resolve a porcentagem com prioridade:
 * 1. `weightedPercentage` (ponderado por watchTime — mais granular, reflete
 *    quanto realmente foi assistido).
 * 2. `percentage` / `progressPercentage` (binário per-vídeo: % de aulas
 *    concluídas inteiras). Fallback pra payloads antigos antes do bump
 *    backend.
 * 3. `enrollment.progress` (último resort).
 *
 * Backend novo retorna ambos `percentage` (binário) e `weightedPercentage`
 * (ponderado) — escolha aqui privilegia o ponderado pra UX mais granular.
 */
import type { Course, EnrolledCourse } from '../types';

export function getCourseProgressPercent(
  course: Course | EnrolledCourse,
): number {
  const enrolled = course as EnrolledCourse;
  const p = enrolled.progress;
  if (!p) {
    return enrolled.enrollment?.progress ?? 0;
  }
  return (
    p.weightedPercentage ??
    p.percentage ??
    p.progressPercentage ??
    enrolled.enrollment?.progress ??
    0
  );
}
