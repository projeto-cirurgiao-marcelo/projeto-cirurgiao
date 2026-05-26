import { describe, it, expect } from 'vitest';
import { nextCombo, estimateXp, comboTier } from './quiz-gamification';

describe('nextCombo', () => {
  it('incrementa no acerto', () => expect(nextCombo(2, true)).toBe(3));
  it('zera no erro', () => expect(nextCombo(5, false)).toBe(0));
});

describe('estimateXp', () => {
  it('combo 0/1 → 15 (base)', () => {
    expect(estimateXp(0)).toBe(15);
    expect(estimateXp(1)).toBe(15);
  });
  it('cresce +2 por passo de combo', () => {
    expect(estimateXp(3)).toBe(19);
    expect(estimateXp(10)).toBe(33);
  });
});

describe('comboTier', () => {
  it('combo 1 → null (abaixo do limiar)', () => {
    expect(comboTier(1)).toBeNull();
  });
  it('combo 2 → tier neutro', () => {
    expect(comboTier(2)).toEqual({ label: '', color: '#9CA3AF' });
  });
  it('combo 3 → Combo (ouro)', () => {
    expect(comboTier(3)).toEqual({ label: 'Combo', color: '#FFD700' });
  });
  it('combo 6 → Combo! (rosa)', () => {
    expect(comboTier(6)).toEqual({ label: 'Combo!', color: '#F472B6' });
  });
  it('combo 10 → Combo épico! (roxo)', () => {
    expect(comboTier(10)).toEqual({ label: 'Combo épico!', color: '#A78BFA' });
  });
});
