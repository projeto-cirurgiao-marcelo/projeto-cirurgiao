'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  Eye,
  File,
  FileText,
  FileVideo,
  Loader2,
  ListMusic,
  Subtitles,
  Captions,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type ObjectMeta,
  cdnUrl,
  playlistKeyFor,
} from '@/lib/api/r2-browser.service';
import { CopyCdnLink } from './copy-cdn-link';

interface ObjectListProps {
  objects: ObjectMeta[];
  prefix: string;
  loading: boolean;
  error: string | null;
  onPreview: (folder: string) => void;
}

const SPECIAL_BASENAMES = [
  'playlist.m3u8',
  'subtitles.m3u8',
  'subtitles_pt.vtt',
] as const;

type SpecialBasename = (typeof SPECIAL_BASENAMES)[number];

const SPECIAL_META: Record<
  SpecialBasename,
  { label: string; icon: typeof File; hint: string }
> = {
  'playlist.m3u8': {
    label: 'HLS playlist (master)',
    icon: ListMusic,
    hint: 'URL principal pra inserir no campo videoUrl ao criar curso (videoSource = r2_hls).',
  },
  'subtitles.m3u8': {
    label: 'Legendas HLS manifest',
    icon: Subtitles,
    hint: 'Manifest WebVTT segmentado consumido pelo player junto com o master.',
  },
  'subtitles_pt.vtt': {
    label: 'Legendas pt-BR (VTT)',
    icon: Captions,
    hint: 'WebVTT plano em português, gerado pelo pipeline Faster-Whisper.',
  },
};

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function iconFor(key: string) {
  if (key.endsWith('.m3u8') || key.endsWith('.ts') || key.endsWith('.mp4'))
    return FileVideo;
  if (key.endsWith('.vtt') || key.endsWith('.srt')) return FileText;
  return File;
}

function basename(key: string): string {
  const trimmed = key.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

function isSpecial(key: string): SpecialBasename | null {
  const b = basename(key);
  return (SPECIAL_BASENAMES as readonly string[]).includes(b)
    ? (b as SpecialBasename)
    : null;
}

export function ObjectList({
  objects,
  prefix,
  loading,
  error,
  onPreview,
}: ObjectListProps) {
  const folderPath = prefix.replace(/\/+$/, '');

  const { specialMap, others } = useMemo(() => {
    const map = new Map<SpecialBasename, ObjectMeta>();
    const rest: ObjectMeta[] = [];
    for (const o of objects) {
      const sp = isSpecial(o.key);
      if (sp && !map.has(sp)) {
        map.set(sp, o);
      } else {
        rest.push(o);
      }
    }
    return { specialMap: map, others: rest };
  }, [objects]);

  const hasAnySpecial = specialMap.size > 0;
  const hasPlaylist = specialMap.has('playlist.m3u8');

  return (
    <section className="rounded-lg border border-atlas-line bg-atlas-surface">
      <header className="flex items-center justify-between border-b border-atlas-line px-3 py-2 text-xs font-medium uppercase tracking-wide text-atlas-muted-2">
        <span>
          Arquivos {prefix ? `em /${prefix}` : 'na raiz'}
          {' · '}
          <span className="normal-case">{objects.length}</span>
        </span>
        <div className="flex items-center gap-2">
          {hasPlaylist && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(folderPath)}
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              Preview HLS
            </Button>
          )}
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        </div>
      </header>

      {hasAnySpecial && (
        <div className="border-b border-atlas-line bg-atlas-surface-2/40 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-atlas-muted-2">
            Manifest desta pasta
          </p>
          <ul className="space-y-2">
            {SPECIAL_BASENAMES.map((name) => {
              const obj = specialMap.get(name);
              const meta = SPECIAL_META[name];
              const Icon = meta.icon;
              const present = !!obj;
              return (
                <li
                  key={name}
                  className="flex flex-col gap-2 rounded-md border border-atlas-line bg-atlas-surface px-3 py-2 md:flex-row md:items-center"
                >
                  <Icon
                    className={
                      present
                        ? 'h-4 w-4 shrink-0 text-atlas-primary'
                        : 'h-4 w-4 shrink-0 text-atlas-muted-2'
                    }
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-atlas-ink dark:text-atlas-ink-2">
                        {name}
                      </span>
                      {present ? (
                        <span className="rounded bg-atlas-primary-soft px-1.5 py-0.5 text-[10px] font-medium uppercase text-atlas-primary-2">
                          presente
                        </span>
                      ) : (
                        <span className="rounded bg-atlas-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase text-atlas-muted-2">
                          ausente
                        </span>
                      )}
                      {present && (
                        <span className="text-[11px] text-atlas-muted-2">
                          {bytes(obj.size)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-atlas-muted-2">
                      {meta.label} — {meta.hint}
                    </p>
                  </div>
                  {present && (
                    <CopyCdnLink
                      url={cdnUrl(obj.key)}
                      label="Copiar URL"
                      size="sm"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {hasPlaylist && (
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyCdnLink
                url={cdnUrl(playlistKeyFor(folderPath))}
                label="Copiar URL HLS (atalho)"
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border-b border-atlas-line bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {error}
        </div>
      )}

      {!loading && !error && objects.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-atlas-muted-2">
          Pasta vazia.
        </p>
      )}

      {others.length > 0 && (
        <ul className="divide-y divide-atlas-line">
          {others.map((o) => {
            const Icon = iconFor(o.key);
            return (
              <li
                key={o.key}
                className="flex flex-col gap-2 px-3 py-2 text-sm md:flex-row md:items-center"
              >
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <Icon
                    className="h-4 w-4 shrink-0 text-atlas-muted-2"
                    aria-hidden
                  />
                  <span className="truncate font-mono text-xs text-atlas-ink dark:text-atlas-ink-2">
                    {basename(o.key)}
                  </span>
                  <span className="hidden text-xs text-atlas-muted-2 md:inline">
                    {bytes(o.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CopyCdnLink
                    url={cdnUrl(o.key)}
                    label="Copiar link"
                    size="sm"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
