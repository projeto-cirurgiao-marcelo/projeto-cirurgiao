'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

/**
 * Alternância claro/escuro (tokens dark "Forest Slate" já existiam no
 * globals-premium.css — este botão só liga o que estava adormecido).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Evita hydration mismatch: tema só é conhecido no client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-9" aria-hidden />;

  const dark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      className="size-9 rounded-md flex items-center justify-center text-atlas-muted hover:text-atlas-ink hover:bg-atlas-surface-2 transition-colors cursor-pointer"
    >
      {dark ? (
        <Sun className="size-[18px]" strokeWidth={1.75} />
      ) : (
        <Moon className="size-[18px]" strokeWidth={1.75} />
      )}
    </button>
  );
}
