'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/**
 * Count-up em pt-BR; respeita prefers-reduced-motion. Estilo vem do pai.
 * `pad` = largura mínima com zeros à esquerda ("0128", registro clínico).
 */
export function AnimatedCounter({ value, pad, className }: { value: number; pad?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  const text = pad ? String(shown).padStart(pad, '0') : shown.toLocaleString('pt-BR');
  return <span className={className}>{text}</span>;
}
