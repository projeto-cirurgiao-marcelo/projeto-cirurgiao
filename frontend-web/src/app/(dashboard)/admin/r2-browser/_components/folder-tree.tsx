'use client';

import { Eye, Folder, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FolderTreeProps {
  folders: string[];
  currentPrefix: string;
  loading: boolean;
  onSelect: (prefix: string) => void;
  onPreview: (folder: string) => void;
}

function lastSegment(folder: string): string {
  const trimmed = folder.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

export function FolderTree({
  folders,
  currentPrefix,
  loading,
  onSelect,
  onPreview,
}: FolderTreeProps) {
  return (
    <aside className="rounded-lg border border-atlas-line bg-atlas-surface">
      <div className="flex items-center justify-between border-b border-atlas-line px-3 py-2 text-xs font-medium uppercase tracking-wide text-atlas-muted-2">
        <span>Pastas</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-1">
        {currentPrefix && (
          <button
            type="button"
            onClick={() => {
              const trimmed = currentPrefix.replace(/\/+$/, '');
              const idx = trimmed.lastIndexOf('/');
              onSelect(idx === -1 ? '' : `${trimmed.slice(0, idx)}/`);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-atlas-muted-2 hover:bg-atlas-surface-2"
          >
            <span aria-hidden>↑</span>
            <span>.. (pasta superior)</span>
          </button>
        )}
        {!loading && folders.length === 0 && (
          <p className="px-2 py-3 text-xs text-atlas-muted-2">
            Sem subpastas neste nível.
          </p>
        )}
        <ul className="space-y-0.5">
          {folders.map((f) => {
            const name = lastSegment(f);
            return (
              <li key={f}>
                <div className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelect(f)}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-atlas-surface-2',
                    )}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-atlas-primary" />
                    <span className="truncate text-atlas-ink dark:text-atlas-ink-2">
                      {name}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => onPreview(f.replace(/\/+$/, ''))}
                    title="Preview HLS"
                    aria-label={`Preview HLS de ${name}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
