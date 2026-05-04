'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Eye, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  type SearchHit,
  searchFolders,
} from '@/lib/api/r2-browser.service';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSelect: (fullPath: string) => void;
  onPreview: (fullPath: string) => void;
}

const DEBOUNCE_MS = 200;

export function SearchBar({ onSelect, onPreview }: SearchBarProps) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchFolders(q.trim(), 30);
        if (!cancelled) {
          setHits(res.matches);
          setOpen(true);
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
  }, [q]);

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
      <div className="flex items-center gap-2 rounded-md border border-atlas-line bg-atlas-surface px-3 py-2 focus-within:border-atlas-primary">
        <Search className="h-4 w-4 text-atlas-muted-2" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder="Buscar pasta por nome (ex: valvar, anatomia, cardio)…"
          className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-atlas-muted-2" aria-hidden />
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-md border border-atlas-line bg-atlas-surface shadow-lg">
          {hits.length === 0 && !loading && (
            <p className="px-3 py-4 text-sm text-atlas-muted-2">
              Nenhuma pasta encontrada para “{q}”.
            </p>
          )}
          <ul className="divide-y divide-atlas-line">
            {hits.map((h) => (
              <li key={h.fullPath} className="group">
                <div
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm hover:bg-atlas-surface-2',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(h.fullPath);
                      setOpen(false);
                    }}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-atlas-primary" />
                    <span className="flex-1">
                      <span className="font-medium text-atlas-ink dark:text-atlas-ink-2">
                        {h.parentName}
                      </span>
                      <span className="ml-2 text-xs text-atlas-muted-2">
                        {h.fullPath}
                      </span>
                    </span>
                    <span className="ml-2 text-xs text-atlas-muted-2">
                      {h.fileCount} arq{h.hasPlaylist ? ' · HLS' : ''}
                    </span>
                  </button>
                  {h.hasPlaylist && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(h.fullPath);
                        setOpen(false);
                      }}
                      className="ml-2 rounded p-1 text-atlas-muted-2 hover:bg-atlas-surface-2 hover:text-atlas-ink"
                      aria-label="Preview HLS"
                      title="Preview HLS"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
