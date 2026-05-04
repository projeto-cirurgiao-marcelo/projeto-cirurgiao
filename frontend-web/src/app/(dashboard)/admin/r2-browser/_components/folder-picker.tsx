'use client';

import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type SearchHit,
  searchFolders,
} from '@/lib/api/r2-browser.service';
import { cn } from '@/lib/utils';

interface FolderPickerProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Only suggest folders under this prefix. Default: "inbox/". */
  searchScope?: string;
  /** Helper text below input. */
  hint?: string;
}

const DEBOUNCE_MS = 200;

export function FolderPicker({
  value,
  onChange,
  disabled,
  placeholder = 'inbox/cardio/anatomia/',
  searchScope = 'inbox/',
  hint,
}: FolderPickerProps) {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setHits([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchFolders(trimmed, 10);
        if (!cancelled) {
          // Filter to scope so users don't accidentally pick output folders.
          const filtered = res.matches.filter((m) =>
            m.fullPath.startsWith(searchScope),
          );
          setHits(filtered);
          setOpen(filtered.length > 0);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, searchScope]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Label className="text-xs text-atlas-muted-2">Pasta destino</Label>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-atlas-line bg-atlas-surface px-3 py-2 focus-within:border-atlas-primary">
        <FolderOpen className="h-4 w-4 shrink-0 text-atlas-muted-2" aria-hidden />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-7 border-0 bg-transparent p-0 font-mono text-sm shadow-none focus-visible:ring-0"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <Loader2
            className="h-4 w-4 animate-spin text-atlas-muted-2"
            aria-hidden
          />
        )}
      </div>
      {hint && (
        <p className="mt-1 text-[11px] text-atlas-muted-2">{hint}</p>
      )}
      {open && hits.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-atlas-line bg-atlas-surface shadow-lg">
          <ul className="divide-y divide-atlas-line">
            {hits.map((h) => (
              <li key={h.fullPath}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(`${h.fullPath.replace(/\/+$/, '')}/`);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-atlas-surface-2',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0 text-atlas-primary" />
                    <span className="font-mono text-xs text-atlas-ink dark:text-atlas-ink-2">
                      {h.fullPath}/
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
