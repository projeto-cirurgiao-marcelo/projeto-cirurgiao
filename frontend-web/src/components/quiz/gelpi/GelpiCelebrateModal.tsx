'use client';

import React from 'react';
import styles from './gelpi.module.css';
import DrGelpi from './DrGelpiSVG';
import { Confetti, Halo, Sparkles, XPBurst } from './ConfettiSVG';
import { HeartPulse, CalmWaves, InsightPops } from './ErrorEffectsSVG';

export type ConfidenceLevel = 'GUESSED' | 'THOUGHT_KNEW' | 'KNEW' | 'MASTERED';

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string; emoji: string }[] = [
  { value: 'GUESSED', label: 'Chutei', emoji: '🎲' },
  { value: 'THOUGHT_KNEW', label: 'Achei', emoji: '🤔' },
  { value: 'KNEW', label: 'Sabia', emoji: '✓' },
  { value: 'MASTERED', label: 'Dominei', emoji: '⭐' },
];

interface GelpiCelebrateModalProps {
  visible: boolean;
  state: 'celebrate' | 'wrong' | 'idle';
  /**
   * Força remount/replay das animações quando o MESMO estado dispara de novo
   * (ex.: dois acertos seguidos — sem mudança de `visible`/`state`, o React
   * não remontaria o overlay e as animações CSS não re-disparariam). É usada
   * na `key` do overlay; o consumidor deve incrementar este valor a cada
   * questão para garantir o replay.
   */
  triggerKey?: number;
  title: string;
  subtitle: string;
  xpGained: number;
  comboValue: number;
  accuracyPct: number;
  selectedConfidence?: ConfidenceLevel;
  onSelectConfidence: (level: ConfidenceLevel) => void;
  onContinue: () => void;
}

export function GelpiCelebrateModal({
  visible,
  state,
  triggerKey = 0,
  title,
  subtitle,
  xpGained,
  comboValue,
  accuracyPct,
  selectedConfidence,
  onSelectConfidence,
  onContinue,
}: GelpiCelebrateModalProps) {
  const isCelebrate = visible && state === 'celebrate';
  const isWrong = visible && state === 'wrong';
  const overlayClass = [
    'modal-overlay',
    visible ? 'show' : '',
    state === 'wrong' ? 'error-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cardClass = ['celebrate-card', state === 'wrong' ? 'error-mode' : '']
    .filter(Boolean)
    .join(' ');

  const continueBtnClass = ['continue-btn', state === 'wrong' ? 'error-mode' : '']
    .filter(Boolean)
    .join(' ');

  const handleConfidenceClick = (level: ConfidenceLevel) => {
    onSelectConfidence(level);
  };

  const handleContinueClick = () => {
    onContinue();
  };

  return (
    <div className={styles.gelpiScope}>
      <div className={overlayClass} key={`${visible ? 1 : 0}-${triggerKey}`}>
        {/* Background effects */}
        <Halo active={isCelebrate} />
        <Sparkles active={isCelebrate} />
        <Confetti active={isCelebrate} count={48} />
        <XPBurst active={isCelebrate} amount={xpGained} />
        <HeartPulse active={isWrong} />
        <CalmWaves active={isWrong} />
        <InsightPops active={isWrong} />

        {/* Personagem */}
        <div className="gelpi-stage">
          <DrGelpi state={state === 'celebrate' ? 'celebrate' : 'idle'} />
        </div>

        {/* Card bottom */}
        <div className={cardClass}>
          <div className="title">{title}</div>
          <div className="subtitle">{subtitle}</div>

          <div className="reward-row">
            <div className={`reward-pill ${state === 'celebrate' ? 'gold' : 'encourage'}`}>
              <div className="label">XP GANHO</div>
              <div className="value">
                <span className="plus">+</span>
                {xpGained}
              </div>
            </div>
            <div className={`reward-pill ${state === 'wrong' ? 'encourage' : ''}`}>
              <div className="label">SEQUÊNCIA</div>
              <div className="value">
                {comboValue} {comboValue > 0 && state === 'celebrate' ? '🔥' : ''}
              </div>
            </div>
            <div className={`reward-pill ${state === 'wrong' ? 'encourage' : ''}`}>
              <div className="label">PRECISÃO</div>
              <div className="value">{Math.round(accuracyPct)}%</div>
            </div>
          </div>

          <div className="confidence-row">
            <div style={{ width: '100%' }}>
              <div className="conf-prompt">Como você se sentiu?</div>
              <div className="confidence-grid">
                {CONFIDENCE_OPTIONS.map((opt) => {
                  const active = selectedConfidence === opt.value;
                  return (
                    <button
                      key={opt.value}
                      className={`conf-btn ${active ? 'active' : ''}`}
                      onClick={() => handleConfidenceClick(opt.value)}
                      type="button"
                    >
                      <div className="conf-emoji">{opt.emoji}</div>
                      <div className="conf-label">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            className={continueBtnClass}
            onClick={handleContinueClick}
            disabled={!selectedConfidence}
            type="button"
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}

export type { GelpiCelebrateModalProps };
