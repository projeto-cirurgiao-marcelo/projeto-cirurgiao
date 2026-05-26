import { describe, it, expect } from 'vitest';
import { nextCombo, estimateXp } from './quiz-gamification';

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
