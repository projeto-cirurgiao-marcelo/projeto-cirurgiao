'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  File,
  FileText,
  FileVideo,
  Folder,
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

// HlsVideoPlayer fica fora do SSR — depende de <video> + hls.js.
const HlsVideoPlayer = dynamic(
  () => import('@/components/video-player/hls-video-player'),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    ),
  },
);

interface ObjectListProps {
  objects: ObjectMeta[];
  folders: string[];
  prefix: string;
  loading: boolean;
  error: string | null;
  onPreview: (folder: string) => void;
  onSelectFolder: (prefix: string) => void;
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

function lastSegment(folder: string): string {
  const trimmed = folder.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

function isSpecial(key: string): SpecialBasename | null {
  const b = basename(key);
  return (SPECIAL_BASENAMES as readonly string[]).includes(b)
    ? (b as SpecialBasename)
    : null;
}

// Variante HLS: 720p.m3u8, 1080p.m3u8, 2160p.m3u8 etc. Nunca o master.
const VARIANT_MANIFEST_RE = /^\d+p\.m3u8$/i;

function isVariantManifest(key: string): boolean {
  return VARIANT_MANIFEST_RE.test(basename(key));
}

function isSegment(key: string): boolean {
  return key.toLowerCase().endsWith('.ts');
}

export function ObjectList({
  objects,
  folders,
  prefix,
  loading,
  error,
  onPreview,
  onSelectFolder,
}: ObjectListProps) {
  const folderPath = prefix.replace(/\/+$/, '');
  const [rawOpen, setRawOpen] = useState(false);

  const { specialMap, segments, variants, others } = useMemo(() => {
    const map = new Map<SpecialBasename, ObjectMeta>();
    const segs: ObjectMeta[] = [];
    const vars: ObjectMeta[] = [];
    const rest: ObjectMeta[] = [];
    for (const o of objects) {
      const sp = isSpecial(o.key);
      if (sp && !map.has(sp)) {
        map.set(sp, o);
        continue;
      }
      if (isSegment(o.key)) {
        segs.push(o);
        continue;
      }
      if (isVariantManifest(o.key)) {
        vars.push(o);
        continue;
      }
      rest.push(o);
    }
    return { specialMap: map, segments: segs, variants: vars, others: rest };
  }, [objects]);

  const isAula = specialMap.has('playlist.m3u8');
  const hasAnySpecial = specialMap.size > 0;
  const playerSrc = isAula ? cdnUrl(playlistKeyFor(folderPath)) : null;
  const vttUrl = isAula
    ? cdnUrl(`${folderPath}/subtitles_pt.vtt`)
    : null;

  const segmentBytes = segments.reduce((acc, o) => acc + o.size, 0);
  const variantBytes = variants.reduce((acc, o) => acc + o.size, 0);
  const totalRawCount = segments.length + variants.length;

  return (
    <section className="rounded-lg border border-atlas-line bg-atlas-surface">
      <header className="flex items-center justify-between border-b border-atlas-line px-3 py-2 text-xs font-medium uppercase tracking-wide text-atlas-muted-2">
        <span>
          {isAula ? 'Aula' : 'Pasta'}
          {prefix ? ` · /${prefix}` : ' · raiz'}
        </span>
        <div className="flex items-center gap-2">
          {isAula && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(folderPath)}
              title="Abrir preview HLS em painel lateral"
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              Abrir em painel
            </Button>
          )}
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        </div>
      </header>

      {/* Modo Aula: player inline + URLs em destaque */}
      {isAula && playerSrc && (
        <div className="space-y-3 border-b border-atlas-line p-3">
          <div className="overflow-hidden rounded-lg bg-black">
            <HlsVideoPlayer src={playerSrc} />
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyCdnLink url={playerSrc} label="Copiar URL HLS" />
            {specialMap.has('subtitles_pt.vtt') && vttUrl && (
              <CopyCdnLink url={vttUrl} label="Copiar VTT pt-BR" />
            )}
          </div>
          <p className="text-xs text-atlas-muted-2">
            Cole a URL HLS no campo <code>videoUrl</code> ao registrar a aula no
            módulo (modo R2 HLS).
          </p>
        </div>
      )}

      {/* Manifest desta pasta — compacto quando em modo Aula, em destaque caso contrário */}
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
                    <div className="flex flex-wrap items-center gap-2">
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
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border-b border-atlas-line bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {error}
        </div>
      )}

      {/* Modo Navegação: cards de subpastas em destaque no painel central */}
      {!isAula && folders.length > 0 && (
        <div className="border-b border-atlas-line p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-atlas-muted-2">
            Subpastas ({folders.length})
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((f) => {
              const name = lastSegment(f);
              return (
                <li key={f}>
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelectFolder(f)}
                      className="flex w-full items-center gap-2 rounded-md border border-atlas-line bg-atlas-surface px-3 py-3 text-left text-sm transition-colors hover:border-atlas-primary/50 hover:bg-atlas-surface-2"
                    >
                      <Folder className="h-5 w-5 shrink-0 text-atlas-primary" />
                      <span className="truncate font-medium text-atlas-ink dark:text-atlas-ink-2">
                        {name}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => onPreview(f.replace(/\/+$/, ''))}
                      title="Tentar preview HLS (válido se for aula)"
                      aria-label={`Preview HLS de ${name}`}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Empty state: nem aula, nem subpastas, nem arquivos */}
      {!loading &&
        !error &&
        !isAula &&
        folders.length === 0 &&
        others.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-atlas-muted-2">
            Pasta vazia.
          </p>
        )}

      {/* Outros arquivos não-classificados (ex: thumbnails soltas) */}
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

      {/* Accordion: arquivos brutos escondidos por padrão no modo Aula
          (segmentos .ts + variantes 720p/1080p/2160p.m3u8). Admin avançado
          pode abrir pra debug ou copiar link de variante específica. */}
      {isAula && totalRawCount > 0 && (
        <div className="border-t border-atlas-line">
          <button
            type="button"
            onClick={() => setRawOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-atlas-muted-2 hover:bg-atlas-surface-2"
            aria-expanded={rawOpen}
          >
            <span className="flex items-center gap-2">
              {rawOpen ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              )}
              Arquivos brutos ({segments.length} segmentos ·{' '}
              {variants.length} variante{variants.length === 1 ? '' : 's'})
            </span>
            <span className="text-[11px]">
              {bytes(segmentBytes + variantBytes)}
            </span>
          </button>
          {rawOpen && (
            <div className="border-t border-atlas-line">
              {variants.length > 0 && (
                <div className="px-3 py-2">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-atlas-muted-2">
                    Variantes ({variants.length})
                  </p>
                  <ul className="divide-y divide-atlas-line">
                    {variants.map((o) => (
                      <li
                        key={o.key}
                        className="flex flex-col gap-2 py-2 text-sm md:flex-row md:items-center"
                      >
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <FileVideo
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
                        <CopyCdnLink
                          url={cdnUrl(o.key)}
                          label="Copiar link"
                          size="sm"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {segments.length > 0 && (
                <div className="border-t border-atlas-line px-3 py-2">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-atlas-muted-2">
                    Segmentos ({segments.length})
                  </p>
                  <p className="text-[11px] text-atlas-muted-2">
                    {bytes(segmentBytes)} em {segments.length} arquivos .ts
                    distribuídos por qualidade. Não há motivo prático pra abrir
                    arquivo por arquivo daqui — o player consome a playlist e
                    busca os segmentos automaticamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
