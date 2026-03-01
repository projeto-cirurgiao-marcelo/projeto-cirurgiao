'use client';

import { useGamification } from '@/hooks/useGamification';
import { useGamificationEvents } from '@/hooks/useGamificationEvents';
import dynamic from 'next/dynamic';

const XpPopup = dynamic(() => import('./XpPopup').then((mod) => mod.XpPopup), {
  ssr: false,
});

/**
 * Provider que inicializa o perfil de gamificacao e o polling de eventos.
 * Deve envolver as paginas do estudante.
 */
export function GamificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inicializa o perfil de gamificacao
  useGamification();

  // Inicia polling de eventos a cada 30s
  useGamificationEvents();

  return (
    <>
      {children}
      <XpPopup />
    </>
  );
}
