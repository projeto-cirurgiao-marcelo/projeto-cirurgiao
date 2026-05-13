'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarArrowDown,
  CalendarArrowUp,
  ChevronDown,
  ChevronRight,
  Eye,
  File,
  FileText,
  FileVideo,
  Folder,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  ListMusic,
  Subtitles,
  Captions,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type FolderIndexEntry,
  type ObjectMeta,
  cdnUrl,
  playlistKeyFor,
} from '@/lib/api/r2-browser.service';
import { videosService, type VideoByR2Basename } from '@/lib/api/videos.service';
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
  /** Subfolders enriquecidas do índice KV (com lastUpdated quando disponível). */
  subfolderEntries: FolderIndexEntry[];
  prefix: string;
  loading: boolean;
  error: string | null;
  onPreview: (folder: string) => void;
  onSelectFolder: (prefix: string) => void;
  /** Abre o MoveToModal com a lista de Videos do r2Basename atual. */
  onCatalogClick: (
    videoIds: string[],
    currentFolderId: string | null,
    label: string,
  ) => void;
  /** Incrementado pelo parent após Move bem-sucedido pra forçar refetch. */
  catalogRefreshKey: number;
}

type ViewMode = 'cards' | 'list';
type SortMode = 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';

const VIEW_STORAGE_KEY = 'r2-browser-view-mode';
const SORT_STORAGE_KEY = 'r2-browser-sort';

function isViewMode(v: string | null): v is ViewMode {
  return v === 'cards' || v === 'list';
}

function isSortMode(v: string | null): v is SortMode {
  return (
    v === 'name-asc' ||
    v === 'name-desc' ||
    v === 'date-desc' ||
    v === 'date-asc'
  );
}

function relativeDate(iso?: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'há instantes';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `há ${mo}mes${mo > 1 ? 'es' : ''}`;
  return `há ${Math.floor(mo / 12)}a`;
}

function SortIcon({ mode }: { mode: SortMode }) {
  switch (mode) {
    case 'name-asc':
      return (
        <ArrowDownAZ
          className="h-3.5 w-3.5 text-atlas-muted-2"
          aria-hidden
        />
      );
    case 'name-desc':
      return (
        <ArrowUpAZ className="h-3.5 w-3.5 text-atlas-muted-2" aria-hidden />
      );
    case 'date-desc':
      return (
        <CalendarArrowDown
          className="h-3.5 w-3.5 text-atlas-muted-2"
          aria-hidden
        />
      );
    case 'date-asc':
      return (
        <CalendarArrowUp
          className="h-3.5 w-3.5 text-atlas-muted-2"
          aria-hidden
        />
      );
  }
}

function sortSubfolders(
  entries: FolderIndexEntry[],
  mode: SortMode,
): FolderIndexEntry[] {
  const copy = entries.slice();
  copy.sort((a, b) => {
    switch (mode) {
      case 'name-asc':
        return a.parentName.localeCompare(b.parentName, 'pt-BR', {
          sensitivity: 'base',
        });
      case 'name-desc':
        return b.parentName.localeCompare(a.parentName, 'pt-BR', {
          sensitivity: 'base',
        });
      case 'date-desc':
      case 'date-asc': {
        // Sem data: vai pro final em ambas direções. Empate (ambos
        // sem data) cai no name-asc pra ordem estável.
        const ta = a.lastUpdated ? Date.parse(a.lastUpdated) : NaN;
        const tb = b.lastUpdated ? Date.parse(b.lastUpdated) : NaN;
        if (!Number.isFinite(ta) && !Number.isFinite(tb)) {
          return a.parentName.localeCompare(b.parentName);
        }
        if (!Number.isFinite(ta)) return 1;
        if (!Number.isFinite(tb)) return -1;
        return mode === 'date-desc' ? tb - ta : ta - tb;
      }
    }
  });
  return copy;
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
  subfolderEntries,
  prefix,
  loading,
  error,
  onPreview,
  onSelectFolder,
  onCatalogClick,
  catalogRefreshKey,
}: ObjectListProps) {
  const folderPath = prefix.replace(/\/+$/, '');
  const [rawOpen, setRawOpen] = useState(false);

  // Estado do catálogo (Videos registrados com este r2Basename + atribuição
  // de MediaFolder). Fetcheado quando a aula muda OU quando o parent
  // sinaliza refresh via catalogRefreshKey++.
  const [catalogVideos, setCatalogVideos] = useState<VideoByR2Basename[] | null>(
    null,
  );
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Persistência localStorage. Hidrato no useEffect pra evitar mismatch
  // de SSR (state inicial é o default sem ler storage).
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortMode, setSortMode] = useState<SortMode>('name-asc');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (isViewMode(v)) setViewMode(v);
    const s = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (isSortMode(s)) setSortMode(s);
  }, []);

  function changeViewMode(next: ViewMode) {
    setViewMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  }

  function changeSortMode(next: SortMode) {
    setSortMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SORT_STORAGE_KEY, next);
    }
  }

  // Fallback: se o índice KV ainda não carregou (cold start) mas /list
  // já devolveu folders como strings, monta entries mínimas. Sort por data
  // não funciona neste caso (lastUpdated undefined em todos) — sort por
  // nome continua funcionando.
  const effectiveSubfolders = useMemo(() => {
    if (subfolderEntries.length > 0) {
      return sortSubfolders(subfolderEntries, sortMode);
    }
    const fallback: FolderIndexEntry[] = folders.map((f) => {
      const trimmed = f.replace(/\/+$/, '');
      const lastSlash = trimmed.lastIndexOf('/');
      const parentName =
        lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
      return {
        fullPath: trimmed,
        parentName,
        hasPlaylist: false,
        fileCount: 0,
        depth: trimmed.split('/').length,
      };
    });
    return sortSubfolders(fallback, sortMode);
  }, [subfolderEntries, folders, sortMode]);

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

  // Basename = ultimo segmento do prefix (sem trailing slash). Bate com
  // Video.r2Basename gravado pelo /from-r2-hls.
  const aulaBasename = useMemo(() => {
    if (!isAula || !folderPath) return null;
    const idx = folderPath.lastIndexOf('/');
    return idx === -1 ? folderPath : folderPath.slice(idx + 1);
  }, [isAula, folderPath]);

  // Carrega Videos com este r2Basename quando a aula muda ou após move.
  useEffect(() => {
    if (!aulaBasename) {
      setCatalogVideos(null);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    videosService
      .findByR2Basename(aulaBasename)
      .then((videos) => {
        if (!cancelled) setCatalogVideos(videos);
      })
      .catch(() => {
        if (!cancelled) setCatalogVideos([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aulaBasename, catalogRefreshKey]);

  // Heurística de "catálogo atual": pega o folderId do 1o Video do lote
  // como referência. Se todos estão na mesma pasta, mostra; se variam,
  // sinaliza "múltiplos". Usuário pode bulk-mover pra um único destino.
  const catalogState = useMemo(() => {
    if (!catalogVideos || catalogVideos.length === 0) return null;
    const uniqueFolderIds = Array.from(
      new Set(catalogVideos.map((v) => v.folderId ?? '__root__')),
    );
    const allSameFolder = uniqueFolderIds.length === 1;
    const firstFolder = catalogVideos[0].folder;
    return {
      count: catalogVideos.length,
      videoIds: catalogVideos.map((v) => v.id),
      allSameFolder,
      currentFolderName: allSameFolder
        ? (firstFolder?.name ?? null)
        : null,
      currentFolderId: allSameFolder
        ? (catalogVideos[0].folderId ?? null)
        : null,
      modules: catalogVideos.map((v) => ({
        id: v.moduleId,
        title: v.module.title,
        courseTitle: v.module.course.title,
        folderName: v.folder?.name ?? null,
      })),
    };
  }, [catalogVideos]);

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

      {/* Modo Aula: catálogo (MediaFolder) + módulos onde a aula vive */}
      {isAula && aulaBasename && (
        <div className="space-y-2 border-b border-atlas-line bg-atlas-surface-2/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-atlas-muted-2">
                Catálogo
              </p>
              {catalogLoading && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-atlas-muted-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando catálogo...
                </p>
              )}
              {!catalogLoading && catalogState && (
                <>
                  <p className="mt-1 text-sm text-atlas-ink dark:text-atlas-ink-2">
                    Registrada em{' '}
                    <strong>{catalogState.count}</strong>{' '}
                    {catalogState.count === 1 ? 'módulo' : 'módulos'} ·{' '}
                    {catalogState.allSameFolder ? (
                      catalogState.currentFolderName ? (
                        <>
                          Pasta de catálogo:{' '}
                          <strong>{catalogState.currentFolderName}</strong>
                        </>
                      ) : (
                        <span className="text-atlas-muted-2">
                          Sem pasta de catálogo
                        </span>
                      )
                    ) : (
                      <span className="text-amber-700">
                        Pastas diferentes (revisar)
                      </span>
                    )}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-atlas-muted-2">
                    {catalogState.modules.map((m, i) => (
                      <li key={`${m.id}-${i}`}>
                        <span className="font-mono">›</span>{' '}
                        {m.courseTitle} / {m.title}
                        {m.folderName && (
                          <span className="text-atlas-muted-2/80">
                            {' '}— {m.folderName}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {!catalogLoading &&
                catalogVideos !== null &&
                catalogVideos.length === 0 && (
                  <p className="mt-1 text-xs text-atlas-muted-2">
                    Aula ainda não registrada no DB. Vá em{' '}
                    <code>/admin/modules/&lt;id&gt;/videos</code> no modo R2
                    HLS pra cadastrar primeiro.
                  </p>
                )}
            </div>
            {catalogState && catalogState.count > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onCatalogClick(
                    catalogState.videoIds,
                    catalogState.currentFolderId,
                    aulaBasename,
                  )
                }
                title="Mover esta aula entre pastas do catálogo (não afeta R2)"
              >
                <Folder className="mr-2 h-3.5 w-3.5" />
                {catalogState.currentFolderName
                  ? 'Mover catálogo'
                  : 'Catalogar em...'}
              </Button>
            )}
          </div>
          <p className="text-[10px] text-atlas-muted-2">
            Catálogo = organização lógica no DB. Mover entre pastas é só
            metadata; o arquivo R2 e a URL HLS permanecem inalterados.
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

      {/* Modo Navegação: subpastas com toggles de view + sort */}
      {!isAula && effectiveSubfolders.length > 0 && (
        <div className="border-b border-atlas-line p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-atlas-muted-2">
              Subpastas ({effectiveSubfolders.length})
            </p>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="sort-mode">
                Ordenar subpastas
              </label>
              <select
                id="sort-mode"
                value={sortMode}
                onChange={(e) => changeSortMode(e.target.value as SortMode)}
                className="h-7 rounded border border-atlas-line bg-atlas-surface px-2 text-xs text-atlas-ink hover:border-atlas-primary/50 focus:border-atlas-primary focus:outline-none dark:text-atlas-ink-2"
              >
                <option value="name-asc">Nome A → Z</option>
                <option value="name-desc">Nome Z → A</option>
                <option value="date-desc">Mais recentes primeiro</option>
                <option value="date-asc">Mais antigos primeiro</option>
              </select>
              <SortIcon mode={sortMode} />
              <div
                className="inline-flex items-center rounded border border-atlas-line bg-atlas-surface"
                role="group"
                aria-label="Modo de visualização"
              >
                <button
                  type="button"
                  onClick={() => changeViewMode('cards')}
                  aria-pressed={viewMode === 'cards'}
                  title="Cards (grid)"
                  className={
                    viewMode === 'cards'
                      ? 'inline-flex h-7 w-7 items-center justify-center bg-atlas-primary-soft text-atlas-primary-2'
                      : 'inline-flex h-7 w-7 items-center justify-center text-atlas-muted-2 hover:text-atlas-ink'
                  }
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => changeViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  title="Lista (linhas)"
                  className={
                    viewMode === 'list'
                      ? 'inline-flex h-7 w-7 items-center justify-center bg-atlas-primary-soft text-atlas-primary-2'
                      : 'inline-flex h-7 w-7 items-center justify-center text-atlas-muted-2 hover:text-atlas-ink'
                  }
                >
                  <ListIcon className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'cards' ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {effectiveSubfolders.map((entry) => {
                const slashPath = `${entry.fullPath}/`;
                return (
                  <li key={entry.fullPath}>
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelectFolder(slashPath)}
                        className="flex w-full flex-col gap-1 rounded-md border border-atlas-line bg-atlas-surface px-3 py-3 text-left text-sm transition-colors hover:border-atlas-primary/50 hover:bg-atlas-surface-2"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="h-5 w-5 shrink-0 text-atlas-primary" />
                          <span className="truncate font-medium text-atlas-ink dark:text-atlas-ink-2">
                            {entry.parentName}
                          </span>
                        </div>
                        {entry.lastUpdated && (
                          <span className="text-[10px] text-atlas-muted-2">
                            {relativeDate(entry.lastUpdated)}
                          </span>
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => onPreview(entry.fullPath)}
                        title="Tentar preview HLS (válido se for aula)"
                        aria-label={`Preview HLS de ${entry.parentName}`}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-atlas-line rounded-md border border-atlas-line bg-atlas-surface">
              {effectiveSubfolders.map((entry) => {
                const slashPath = `${entry.fullPath}/`;
                return (
                  <li
                    key={entry.fullPath}
                    className="group flex items-center gap-3 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectFolder(slashPath)}
                      className="flex flex-1 items-center gap-2 text-left text-sm"
                    >
                      <Folder className="h-4 w-4 shrink-0 text-atlas-primary" />
                      <span className="truncate font-medium text-atlas-ink dark:text-atlas-ink-2">
                        {entry.parentName}
                      </span>
                    </button>
                    <span className="hidden text-[11px] text-atlas-muted-2 sm:inline">
                      {entry.lastUpdated ? relativeDate(entry.lastUpdated) : '—'}
                    </span>
                    {entry.fileCount > 0 && (
                      <span className="hidden rounded bg-atlas-surface-2 px-1.5 py-0.5 text-[10px] text-atlas-muted-2 md:inline">
                        {entry.fileCount} arq
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => onPreview(entry.fullPath)}
                      title="Tentar preview HLS (válido se for aula)"
                      aria-label={`Preview HLS de ${entry.parentName}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Empty state: nem aula, nem subpastas, nem arquivos */}
      {!loading &&
        !error &&
        !isAula &&
        effectiveSubfolders.length === 0 &&
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
