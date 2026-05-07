'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FolderSync, Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type ListResponse,
  getHealth,
  listPrefix,
  reindexFull,
  reindexCurrentFolder,
} from '@/lib/api/r2-browser.service';
import { SearchBar } from './search-bar';
import { FolderTree } from './folder-tree';
import { ObjectList } from './object-list';
import { PreviewDrawer } from './preview-drawer';
import { UploadDrawer } from './upload-drawer';

interface PreviewState {
  open: boolean;
  folder: string | null;
}

export function R2Browser() {
  const [prefix, setPrefix] = useState('');
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [indexBuiltAt, setIndexBuiltAt] = useState<string | null>(null);
  const [folderCount, setFolderCount] = useState<number>(0);
  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    folder: null,
  });
  const [uploadOpen, setUploadOpen] = useState(false);

  const refreshHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setIndexBuiltAt(h.indexBuiltAt);
      setFolderCount(h.folderCount);
    } catch {
      // ignore — health is best-effort
    }
  }, []);

  const loadPrefix = useCallback(async (next: string) => {
    setLoading(true);
    setError(null);
    try {
      // R2 list pagina por orcamento de scan interno: pastas com muitos
      // descendentes (ex: HLS com milhares de .ts) retornam truncated=true
      // com poucos delimitedPrefixes por pagina. Itera cursor ate done.
      const SAFETY_CAP = 30;
      const seenFolders = new Set<string>();
      const seenObjects = new Set<string>();
      const folders: string[] = [];
      const objects: ListResponse['objects'] = [];
      let cursor: string | undefined;
      let truncated = true;
      let i = 0;

      while (truncated && i++ < SAFETY_CAP) {
        const page: ListResponse = await listPrefix(next, cursor, 1000);
        for (const f of page.folders) {
          if (!seenFolders.has(f)) {
            seenFolders.add(f);
            folders.push(f);
          }
        }
        for (const o of page.objects) {
          if (!seenObjects.has(o.key)) {
            seenObjects.add(o.key);
            objects.push(o);
          }
        }
        truncated = page.truncated;
        cursor = page.cursor;
      }

      setData({
        prefix: next,
        folders,
        objects,
        cursor: undefined,
        truncated: truncated, // true significa que cap foi atingido
      });

      if (truncated) {
        const msg = `Listagem incompleta: cap de ${SAFETY_CAP} paginas atingido. R2 retornou ${folders.length} pastas/${objects.length} arquivos.`;
        setError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao listar';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrefix(prefix);
  }, [prefix, loadPrefix]);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const [reindexProgress, setReindexProgress] = useState<{
    scanned: number;
    folders: number;
  } | null>(null);

  const handleReindex = useCallback(async () => {
    setReindexing(true);
    setReindexProgress({ scanned: 0, folders: 0 });
    const toastId = toast.loading('Indexando...', {
      description: 'Iniciando',
    });
    try {
      const res = await reindexFull((p) => {
        setReindexProgress({ scanned: p.scanned, folders: p.folderCount });
        toast.loading('Indexando...', {
          id: toastId,
          description: `${p.scanned} objs · ${p.folderCount} pastas${p.done ? ' · finalizando' : ''}`,
        });
      });
      if (res.done) {
        toast.success(`Index reconstruído: ${res.folderCount} pastas`, {
          id: toastId,
          description: `${res.scanned} objs scanned · ${res.playlistsFound} playlists`,
        });
        setIndexBuiltAt(res.builtAt ?? null);
        setFolderCount(res.folderCount);
      } else {
        // reindexFull tem soft-cap de 50 chunks; se atingir antes de done=true
        // o build esta incompleto e o KV index NAO foi finalizado.
        toast.warning('Reindex incompleto', {
          id: toastId,
          description: `Cap de chunks atingido apos ${res.scanned} objs/${res.folderCount} pastas. Rode novamente para continuar.`,
        });
      }
      // Refresh listagem atual: arquivos podem ter sido adicionados/removidos
      // em R2 durante o reindex. Listagem le R2 direto (nao usa o index KV).
      void loadPrefix(prefix);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no reindex';
      toast.error('Reindex falhou', { id: toastId, description: msg });
    } finally {
      setReindexing(false);
      setReindexProgress(null);
    }
  }, [prefix, loadPrefix]);

  const handleReindexFolder = useCallback(async () => {
    if (!prefix) return;
    setReindexing(true);
    const toastId = toast.loading('Reindexando pasta atual...', {
      description: prefix,
    });
    try {
      const res = await reindexCurrentFolder(prefix);
      toast.success(`Pasta reindexada: ${res.playlistsFound} playlists`, {
        id: toastId,
        description: `${res.scanned} objs · ${res.folderCount} pastas no índice`,
      });
      setIndexBuiltAt(res.builtAt ?? null);
      setFolderCount(res.folderCount);
      // refresh listing pra refletir mudanças
      void loadPrefix(prefix);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no reindex';
      toast.error('Reindex da pasta falhou', { id: toastId, description: msg });
    } finally {
      setReindexing(false);
    }
  }, [prefix, loadPrefix]);

  const breadcrumbs = useMemo(() => {
    const parts = prefix.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; prefix: string }> = [
      { label: 'raiz', prefix: '' },
    ];
    let acc = '';
    for (const p of parts) {
      acc += `${p}/`;
      crumbs.push({ label: p, prefix: acc });
    }
    return crumbs;
  }, [prefix]);

  const handleOpenPreview = useCallback((folder: string) => {
    setPreview({ open: true, folder });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreview({ open: false, folder: null });
  }, []);

  const handleSelectSearchHit = useCallback((fullPath: string) => {
    // Set prefix to parent of the matched folder so user lands inside it
    setPrefix(`${fullPath.replace(/\/+$/, '')}/`);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <SearchBar
            onSelect={handleSelectSearchHit}
            onPreview={handleOpenPreview}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-atlas-muted-2">
          <span>
            {reindexing && reindexProgress
              ? `Indexando: ${reindexProgress.scanned} objs · ${reindexProgress.folders} pastas`
              : indexBuiltAt
                ? `Index: ${formatRelative(indexBuiltAt)} · ${folderCount} pastas`
                : 'Index ainda não disponível'}
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={() => setUploadOpen(true)}
            title="Subir vídeos pra inbox/"
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload
          </Button>
          {prefix && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReindexFolder}
              disabled={reindexing}
              title={`Reindexa apenas ${prefix}`}
            >
              {reindexing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FolderSync className="mr-2 h-4 w-4" />
              )}
              Reindex pasta
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReindex}
            disabled={reindexing}
            title="Reconstrói o índice inteiro (chunked)"
          >
            {reindexing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reindex tudo
          </Button>
        </div>
      </div>

      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-sm text-atlas-muted-2"
      >
        {breadcrumbs.map((c, i) => (
          <span key={c.prefix} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            <button
              type="button"
              onClick={() => setPrefix(c.prefix)}
              className="rounded px-1.5 py-0.5 hover:bg-atlas-surface-2 hover:text-atlas-ink"
            >
              {c.label}
            </button>
          </span>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <FolderTree
          folders={data?.folders ?? []}
          currentPrefix={prefix}
          loading={loading}
          onSelect={setPrefix}
          onPreview={handleOpenPreview}
        />
        <ObjectList
          objects={data?.objects ?? []}
          prefix={prefix}
          loading={loading}
          error={error}
          onPreview={handleOpenPreview}
        />
      </div>

      <PreviewDrawer
        open={preview.open}
        folder={preview.folder}
        onClose={handleClosePreview}
      />

      <UploadDrawer
        open={uploadOpen}
        initialPrefix={
          prefix && prefix.startsWith('inbox/') ? prefix : 'inbox/'
        }
        onClose={() => {
          setUploadOpen(false);
          // refresh listing in case current view is inside inbox/
          if (prefix.startsWith('inbox/')) void loadPrefix(prefix);
        }}
        onUploaded={() => {
          // optimistic refresh
          if (prefix.startsWith('inbox/')) void loadPrefix(prefix);
        }}
      />
    </div>
  );
}

function formatRelative(iso: string): string {
  const built = new Date(iso).getTime();
  if (!Number.isFinite(built)) return 'desconhecido';
  const diffMs = Date.now() - built;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'há instantes';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}
