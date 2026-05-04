'use client';

import { R2Browser } from './_components/r2-browser';

export default function R2BrowserPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-atlas-ink dark:text-atlas-ink-2">
          R2 Browser
        </h1>
        <p className="text-sm text-atlas-muted-2">
          Navegue, busque e copie links do bucket{' '}
          <code className="rounded bg-atlas-surface-2 px-1 py-0.5 text-xs">
            s3-projeto-cirurgiao
          </code>
          . Index de pastas atualizado a cada hora.
        </p>
      </header>
      <R2Browser />
    </div>
  );
}
