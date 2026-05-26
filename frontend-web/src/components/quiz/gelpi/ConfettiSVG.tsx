// Confete + partículas de XP que disparam na celebração
// Adaptado de Marcelo Portilho/Projeto Cirurgião

'use client';

import React from 'react';

interface PieceProps {
  delay: number;
  x: number;
  color: string;
  shape: 'circle' | 'rect';
  rotate: number;
  distance: number;
}

const ConfettiPiece = ({ delay, x, color, shape, rotate, distance }: PieceProps) => {
  const tx = (Math.random() - 0.5) * 200;
  const style: React.CSSProperties & Record<string, string> = {
    left: `${x}%`,
    backgroundColor: color,
    animationDelay: `${delay}ms`,
    ['--tx' as any]: `${tx}px`,
    ['--ty' as any]: `${distance}px`,
    ['--rot' as any]: `${rotate}deg`,
    borderRadius: shape === 'circle' ? '50%' : '2px',
    width: shape === 'rect' ? '6px' : '8px',
    height: shape === 'rect' ? '12px' : '8px',
  };
  return <div className="confetti-piece" style={style} />;
};

interface ConfettiProps {
  active: boolean;
  count?: number;
}

export const Confetti = ({ active, count = 40 }: ConfettiProps) => {
  const colors = ['#1E6FD9', '#4FA8E8', '#FFC93C', '#FF6B6B', '#7DD87D', '#FFFFFF', '#A78BFA'];
  const shapes: Array<'rect' | 'circle'> = ['rect', 'circle', 'rect', 'rect'];

  const pieces = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 400,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotate: Math.random() * 720 - 360,
      distance: 300 + Math.random() * 250,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, active]);

  if (!active) return null;

  return (
    <div className="confetti-layer">
      {pieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
    </div>
  );
};

interface XPBurstProps {
  active: boolean;
  amount?: number;
}

export const XPBurst = ({ active, amount = 50 }: XPBurstProps) => {
  const items = React.useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      delay: i * 80,
      value: i === 0 ? amount : Math.floor(amount / (i + 1)),
    }));
  }, [active, amount]);

  if (!active) return null;

  return (
    <div className="xp-layer">
      {items.map(item => (
        <div
          key={item.id}
          className="xp-pop"
          style={{
            left: `${item.x}%`,
            animationDelay: `${item.delay}ms`,
          }}
        >
          +{item.value} XP
        </div>
      ))}
    </div>
  );
};

interface SparklesProps {
  active: boolean;
}

export const Sparkles = ({ active }: SparklesProps) => {
  const sparks = React.useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 60,
      delay: Math.random() * 500,
      size: 8 + Math.random() * 14,
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className="sparkle-layer">
      {sparks.map(s => (
        <svg
          key={s.id}
          className="sparkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}ms`,
          }}
          viewBox="0 0 24 24"
        >
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#FFD93C" />
        </svg>
      ))}
    </div>
  );
};

export const Halo = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <div className="halo-layer">
      <div className="halo halo-1" />
      <div className="halo halo-2" />
      <div className="halo halo-3" />
    </div>
  );
};
