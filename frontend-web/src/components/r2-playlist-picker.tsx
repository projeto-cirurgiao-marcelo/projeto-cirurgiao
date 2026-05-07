'use client';

/**
 * Picker que reaproveita o KV folder index do Worker r2-browser
 * (mesmo `searchFolders` da rota /admin/r2-browser) para sugerir pastas que
 * contem master playlist HLS. Ao escolher um hit, monta automaticamente a
 * URL completa via CDN (`cdnUrl(playlistKeyFor(fullPath))`).
 *
 * Uso tipico: modal "Adicionar Video" no admin, modo R2 HLS.
 *
 * Filtra hits por `hasPlaylist=true`; admin pode tambem digitar URL manual
 * no input adjacente como fallback.
 */

import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  cdnUrl,
  playlistKeyFor,
  searchFolders,
  type SearchHit,
} from '@/lib/api/r2-browser.service';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 200;
const SEARCH_LIMIT = 20;

interface R2PlaylistPickerProps {
  /** Callback chamado quando admin escolhe uma pasta com playlist. */
  onSelect: (params: { url: string; fullPath: string; parentName: string }) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Texto de ajuda abaixo do input. */
  hint?: string;
  /** Filtra hits a um subtree (ex: "videos/"). */
  scope?: string;
}

export function R2PlaylistPicker({
  onSelect,
  disabled,
  placeholder = 'Buscar pasta R2 (ex: dreno, valvar, anatomia)…',
  hint = 'Pesquisa apenas pastas com playlist.m3u8 finalizado pelo pipeline.',
  scope,
}: R2PlaylistPickerProps) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setHits([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchFolders(trimmed, SEARCH_LIMIT);
        if (cancelled) return;
        const filtered = res.matches.filter(
          (m) => m.hasPlaylist && (!scope || m.fullPath.startsWith(scope)),
        );
        setHits(filtered);
        setOpen(true);
      } catch {
        if (!cancelled) {
          setHits([]);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, scope]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handlePick(hit: SearchHit) {
    const url = cdnUrl(playlistKeyFor(hit.fullPath));
    onSelect({
      url,
      fullPath: hit.fullPath,
      parentName: hit.parentName,
    });
    setQ('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-atlas-line bg-atlas-surface px-3 py-2 focus-within:border-atlas-primary',
          disabled && 'opacity-60',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-atlas-muted-2" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
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

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-atlas-line bg-atlas-surface shadow-lg">
          {hits.length === 0 && !loading && (
            <p className="px-3 py-3 text-xs text-atlas-muted-2">
              Nenhuma pasta com playlist para “{q}”.
            </p>
          )}
          <ul className="divide-y divide-atlas-line">
            {hits.map((h) => (
              <li key={h.fullPath}>
                <button
                  type="button"
                  onClick={() => handlePick(h)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-atlas-surface-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0 text-atlas-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-atlas-ink dark:text-atlas-ink-2">
                        {h.parentName}
                      </span>
                      <span className="block truncate text-[11px] text-atlas-muted-2">
                        {h.fullPath}
                      </span>
                    </span>
                  </span>
                  <span className="ml-2 shrink-0 text-[11px] text-atlas-muted-2">
                    {h.fileCount} arq · HLS
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
