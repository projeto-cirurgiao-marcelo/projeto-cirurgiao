'use dom';

import './styles.css';
import './styles-error.css';
import './styles-card.css';

import React, { useEffect } from 'react';
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

interface Props {
  visible: boolean;
  state: 'celebrate' | 'wrong' | 'idle';
  triggerKey?: number;
  title: string;
  subtitle: string;
  xpGained: number;
  comboValue: number;
  accuracyPct: number;
  selectedConfidence?: ConfidenceLevel;
  onSelectConfidence: (level: ConfidenceLevel) => Promise<void>;
  onContinue: () => Promise<void>;
  /**
   * Avisa o lado nativo que este componente montou DENTRO da WebView, com a
   * ALTURA que ele efetivamente ocupa. Montar não basta: no release o conteúdo
   * chega a montar mas colapsa para 0px de altura (CSS externo não aplicado),
   * ficando invisível e não-clicável. Por isso o nativo decide pelo número, não
   * pela simples chegada do callback.
   */
  onReady?: (height: number) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}

export default function GelpiCelebrateModalDOM({
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
  onReady,
}: Props) {
  // Handshake com o lado nativo. Mede a altura real depois da primeira pintura
  // — se o CSS não tiver sido aplicado, isto volta ~0 e o nativo assume o
  // fallback.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      // Medir o CONTEÚDO, não o viewport. No modo de falha a WebView ocupa a
      // tela inteira (bounds [0,0][1080,2400]) enquanto o conteúdo colapsa para
      // 0px — usar `documentElement.clientHeight` aqui mascararia exatamente o
      // caso que precisamos detectar.
      const el = document.getElementById('root') ?? document.body;
      void onReady?.(el?.getBoundingClientRect().height ?? 0);
    });
    return () => cancelAnimationFrame(id);
  }, []);

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
    void onSelectConfidence(level);
  };

  const handleContinueClick = () => {
    void onContinue();
  };

  return (
    <div
      className={overlayClass}
      key={`${visible ? 1 : 0}-${triggerKey}`}
      // Altura via estilo INLINE, não via CSS externo. No build de release os
      // arquivos de `<link rel="stylesheet">` são carregados de
      // `file:///android_asset/www.bundle/...` e não chegam a ser aplicados; o
      // shell do expo-dom só declara `#root { display:flex; flex:1 }`, sem
      // altura. Sem isto o conteúdo monta no DOM (a árvore de acessibilidade o
      // enxerga) mas colapsa para 0x0: invisível e não-clicável.
      style={{ position: 'fixed', inset: 0, minHeight: '100vh' }}
    >
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
  );
}
