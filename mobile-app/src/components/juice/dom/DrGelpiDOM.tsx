'use dom';

import './styles.css';
import './styles-error.css';

import React from 'react';
import DrGelpi from './DrGelpiSVG';
import { Confetti, Halo, Sparkles } from './ConfettiSVG';
import { HeartPulse, CalmWaves } from './ErrorEffectsSVG';

type GelpiVisualState = 'celebrate' | 'wrong' | 'idle';

interface Props {
  visible: boolean;
  state: GelpiVisualState;
  triggerKey?: number;
  intensity?: number;
  dom?: import('expo/dom').DOMProps;
}

export default function DrGelpiDOM({ visible, state, triggerKey = 0, intensity = 8 }: Props) {
  const isCelebrate = visible && state === 'celebrate';
  const isWrong = visible && state === 'wrong';
  const overlayClass = [
    'modal-overlay',
    visible ? 'show' : '',
    state === 'wrong' ? 'error-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={overlayClass} key={`${visible ? 1 : 0}-${triggerKey}`}>
      <div className={`gelpi-stage ${state === 'wrong' ? 'error' : ''}`}>
        <DrGelpi state={state === 'celebrate' ? 'celebrate' : 'idle'} intensity={intensity} />
        <Halo active={isCelebrate} />
        <Sparkles active={isCelebrate} />
        <Confetti active={isCelebrate} count={40} />
        <HeartPulse active={isWrong} />
        <CalmWaves active={isWrong} />
      </div>
    </div>
  );
}
