import type { Metadata } from 'next';

/**
 * Tela corporativa (TV de recepção). Fora de (dashboard): sem rail, sem
 * guard de aluno. Autentica com a credencial de exibição gerada no admin.
 */
export const metadata: Metadata = {
  title: 'Vidas salvas · Projeto Cirurgião',
  robots: { index: false, follow: false },
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
