/**
 * Lógica pura de gamificação do quiz (espelha o mobile). Usada só para feedback
 * visual imediato — o XP real é calculado pelo backend no submit.
 */

/** Combo: +1 no acerto, reset a 0 no erro. */
export function nextCombo(current: number, isCorrect: boolean): number {
  return isCorrect ? current + 1 : 0;
}

/** Estimativa de XP exibida no acerto: base 15 + 2 por passo de combo. */
export function estimateXp(comboAfterCorrect: number): number {
  return 15 + Math.max(0, comboAfterCorrect - 1) * 2;
}

/** Tier de combo para cor/label do medidor (espelha ComboMeter do mobile). */
export function comboTier(combo: number): { label: string; color: string } | null {
  if (combo < 2) return null;
  if (combo >= 10) return { label: 'Combo épico!', color: '#A78BFA' };
  if (combo >= 6) return { label: 'Combo!', color: '#F472B6' };
  if (combo >= 3) return { label: 'Combo', color: '#FFD700' };
  return { label: '', color: '#9CA3AF' };
}
