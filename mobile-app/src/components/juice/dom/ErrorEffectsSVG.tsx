// Componentes auxiliares da reação de erro
// Adaptado de Marcelo Portilho/Projeto Cirurgião

import React from 'react';

interface ActiveProps {
  active: boolean;
}

export const HeartPulse = ({ active }: ActiveProps) => {
  if (!active) return null;
  return (
    <div className="heart-pulse-layer">
      <svg className="heart-icon" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="heart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8B8B" />
            <stop offset="100%" stopColor="#E84D4D" />
          </linearGradient>
        </defs>
        <path
          d="M12 21s-7-4.5-9.5-9C0 8 2 4 6 4c2 0 4 1.5 6 4 2-2.5 4-4 6-4 4 0 6 4 3.5 8C19 16.5 12 21 12 21z"
          fill="url(#heart-grad)"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};

export const CalmWaves = ({ active }: ActiveProps) => {
  if (!active) return null;
  return (
    <div className="calm-wave-layer">
      <div className="calm-wave calm-wave-1" />
      <div className="calm-wave calm-wave-2" />
      <div className="calm-wave calm-wave-3" />
    </div>
  );
};

export const InsightPops = ({ active }: ActiveProps) => {
  const phrases = ['Quase lá!', 'Vamos juntos', 'Foco e calma'];
  const items = React.useMemo(() => {
    if (!active) return [];
    return phrases.map((text, i) => ({
      id: i,
      text,
      x: 20 + Math.random() * 50,
      delay: 600 + i * 350,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className="insight-layer">
      {items.map(item => (
        <div
          key={item.id}
          className="insight-pop"
          style={{
            left: `${item.x}%`,
            bottom: '60%',
            animationDelay: `${item.delay}ms`,
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
};
