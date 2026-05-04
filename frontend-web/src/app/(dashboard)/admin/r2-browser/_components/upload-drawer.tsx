'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Loader2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  startMultipartUpload,
  type UploadHandle,
  type UploadProgress,
} from '@/lib/api/multipart-uploader';
import { FolderPicker } from './folder-picker';

interface UploadDrawerProps {
  open: boolean;
  initialPrefix?: string;
  onClose: () => void;
  onUploaded?: (key: string) => void;
}

const ACCEPT_EXTENSIONS = ['.mp4', '.mov', '.mkv'] as const;
const ACCEPT_ATTR = ACCEPT_EXTENSIONS.join(',');

interface PendingUpload {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'failed' | 'aborted';
  progress?: UploadProgress;
  result?: { key: string };
  error?: string;
  handle?: UploadHandle;
}

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function sanitizeFolder(input: string): string {
  let s = input.trim().replace(/^\/+/, '').replace(/\\/g, '/');
  if (s && !s.endsWith('/')) s += '/';
  return s;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function acceptable(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function UploadDrawer({
  open,
  initialPrefix = 'inbox/',
  onClose,
  onUploaded,
}: UploadDrawerProps) {
  const [folder, setFolder] = useState(() => {
    const seed = sanitizeFolder(initialPrefix);
    return seed.startsWith('inbox/') ? seed : 'inbox/';
  });
  const [items, setItems] = useState<PendingUpload[]>([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const folderError = useMemo(() => {
    const s = sanitizeFolder(folder);
    if (!s) return 'Pasta obrigatória';
    if (!s.startsWith('inbox/')) return 'Pasta deve começar com "inbox/"';
    if (s === 'inbox/' && !confirm) return null; // OK at root inbox
    return null;
  }, [folder]);

  const enqueueFiles = useCallback((files: FileList | File[]) => {
    const accepted: PendingUpload[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(files)) {
      if (!acceptable(f)) {
        rejected.push(f.name);
        continue;
      }
      accepted.push({
        id: `${f.name}-${f.size}-${f.lastModified}-${crypto.randomUUID()}`,
        file: f,
        status: 'pending',
      });
    }
    if (rejected.length) {
      toast.error('Arquivos ignorados (extensão não suportada)', {
        description: rejected.join(', '),
      });
    }
    if (accepted.length) {
      setItems((prev) => [...prev, ...accepted]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) {
        enqueueFiles(e.dataTransfer.files);
      }
    },
    [enqueueFiles],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<PendingUpload>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      );
    },
    [],
  );

  const startAll = useCallback(async () => {
    if (folderError) {
      toast.error(folderError);
      return;
    }
    const targetFolder = sanitizeFolder(folder);
    setRunning(true);

    for (const item of items) {
      if (item.status !== 'pending') continue;
      const key = `${targetFolder}${safeFilename(item.file.name)}`;
      const handle = startMultipartUpload({
        key,
        file: item.file,
        onProgress: (p) =>
          updateItem(item.id, {
            status: 'uploading',
            progress: p,
          }),
      });
      updateItem(item.id, { handle, status: 'uploading' });

      try {
        const res = await handle.promise;
        updateItem(item.id, {
          status: 'done',
          result: { key: res.key },
          handle: undefined,
        });
        toast.success(`Upload concluído: ${item.file.name}`, {
          description: res.key,
        });
        onUploaded?.(res.key);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'falha no upload';
        updateItem(item.id, {
          status: 'failed',
          error: msg,
          handle: undefined,
        });
        toast.error(`Upload falhou: ${item.file.name}`, { description: msg });
      }
    }

    setRunning(false);
  }, [folder, folderError, items, onUploaded, updateItem]);

  const removeItem = useCallback(
    (id: string) => {
      const item = items.find((it) => it.id === id);
      if (item?.handle) {
        void item.handle.abort();
        updateItem(id, { status: 'aborted', handle: undefined });
        return;
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
    },
    [items, updateItem],
  );

  const allDone = items.length > 0 && items.every((it) => it.status === 'done');
  const hasPending = items.some((it) => it.status === 'pending');

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !running && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>Upload de vídeos</SheetTitle>
          <SheetDescription>
            Vídeos vão pra <code>inbox/</code> e disparam o pipeline de
            processamento (encode HLS + legendas pt-BR) automaticamente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <FolderPicker
            value={folder}
            onChange={setFolder}
            disabled={running}
            placeholder="inbox/cardio/anatomia/"
            hint='Deve começar com "inbox/". Pastas existentes são sugeridas conforme você digita.'
          />
          {folderError && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {folderError}
            </p>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-atlas-surface-2/30 p-6 text-center transition-colors',
              dragOver
                ? 'border-atlas-primary bg-atlas-primary-soft/30'
                : 'border-atlas-line',
            )}
          >
            <UploadCloud className="h-8 w-8 text-atlas-muted-2" aria-hidden />
            <p className="text-sm text-atlas-ink dark:text-atlas-ink-2">
              Arraste arquivos aqui ou{' '}
              <button
                type="button"
                className="font-medium text-atlas-primary underline-offset-2 hover:underline"
                onClick={() => inputRef.current?.click()}
                disabled={running}
              >
                escolha do computador
              </button>
            </p>
            <p className="text-[11px] text-atlas-muted-2">
              Aceita {ACCEPT_EXTENSIONS.join(', ')} · Multipart 16MB · até 5GB por
              parte
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) enqueueFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {items.length > 0 && (
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="rounded-md border border-atlas-line bg-atlas-surface p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileVideo
                      className="h-4 w-4 shrink-0 text-atlas-muted-2"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-atlas-ink dark:text-atlas-ink-2">
                        {it.file.name}
                      </p>
                      <p className="text-[11px] text-atlas-muted-2">
                        {bytes(it.file.size)}
                      </p>
                    </div>
                    {it.status === 'done' && (
                      <CheckCircle2
                        className="h-4 w-4 text-green-600"
                        aria-hidden
                      />
                    )}
                    {it.status === 'uploading' && (
                      <Loader2
                        className="h-4 w-4 animate-spin text-atlas-primary"
                        aria-hidden
                      />
                    )}
                    {it.status === 'failed' && (
                      <AlertCircle
                        className="h-4 w-4 text-red-600"
                        aria-hidden
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeItem(it.id)}
                      aria-label="Remover/abortar"
                      title="Remover/abortar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {it.progress && it.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-atlas-surface-2">
                        <div
                          className="h-full bg-atlas-primary transition-all"
                          style={{ width: `${it.progress.percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-atlas-muted-2">
                        {it.progress.percent.toFixed(1)}% ·{' '}
                        {bytes(it.progress.uploadedBytes)} /{' '}
                        {bytes(it.progress.totalBytes)} · partes{' '}
                        {it.progress.partsCompleted}/{it.progress.partsTotal}
                      </p>
                    </div>
                  )}

                  {it.status === 'done' && it.result && (
                    <p className="mt-2 truncate font-mono text-[11px] text-atlas-muted-2">
                      {it.result.key}
                    </p>
                  )}

                  {it.status === 'failed' && it.error && (
                    <p className="mt-2 text-[11px] text-red-600">{it.error}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={running}
            >
              {allDone ? 'Fechar' : 'Cancelar'}
            </Button>
            <Button
              onClick={startAll}
              disabled={running || !hasPending || !!folderError}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subindo…
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Iniciar uploads
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
