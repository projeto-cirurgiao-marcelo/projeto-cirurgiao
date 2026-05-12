'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  type VideoProcessingJob,
  deleteFailedVideoJobs,
  deleteVideoJob,
  listVideoJobs,
} from '@/lib/api/video-jobs.service';
import { cn } from '@/lib/utils';

const POLL_MS = 10000;

function statusColor(status: VideoProcessingJob['status']): string {
  switch (status) {
    case 'completed':
      return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950/30';
    case 'failed':
      return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/30';
    case 'processing':
      return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30';
    default:
      return 'text-atlas-muted-2 bg-atlas-surface-2';
  }
}

function StatusIcon({ status }: { status: VideoProcessingJob['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'failed') return <AlertCircle className="h-4 w-4" />;
  if (status === 'processing')
    return <Loader2 className="h-4 w-4 animate-spin" />;
  return <Clock className="h-4 w-4" />;
}

function relative(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'há instantes';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

type ConfirmState =
  | { kind: 'single'; job: VideoProcessingJob }
  | { kind: 'bulk-failed'; count: number }
  | null;

export function JobsTable() {
  const [jobs, setJobs] = useState<VideoProcessingJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const seenCompletions = useRef<Set<string>>(new Set());
  const initialLoad = useRef(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listVideoJobs(50);
      if (!initialLoad.current) {
        for (const j of next) {
          if (
            (j.status === 'completed' || j.status === 'failed') &&
            !seenCompletions.current.has(j.id)
          ) {
            seenCompletions.current.add(j.id);
            if (j.status === 'completed') {
              toast.success('Vídeo processado', { description: j.sourceKey });
            } else {
              toast.error('Falha no processamento', {
                description: j.sourceKey,
              });
            }
          }
        }
      } else {
        for (const j of next) {
          if (j.status === 'completed' || j.status === 'failed') {
            seenCompletions.current.add(j.id);
          }
        }
        initialLoad.current = false;
      }
      setJobs(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
    const interval = setInterval(fetchJobs, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const failedCount = useMemo(
    () => jobs.filter((j) => j.status === 'failed').length,
    [jobs],
  );

  const handleConfirmSingle = useCallback(async () => {
    if (!confirm || confirm.kind !== 'single') return;
    const job = confirm.job;
    setDeletingId(job.id);
    try {
      await deleteVideoJob(job.id);
      seenCompletions.current.delete(job.id);
      toast.success('Job removido', { description: job.sourceKey });
      setConfirm(null);
      await fetchJobs();
    } catch (err) {
      toast.error('Falha ao remover job', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeletingId(null);
    }
  }, [confirm, fetchJobs]);

  const handleConfirmBulk = useCallback(async () => {
    if (!confirm || confirm.kind !== 'bulk-failed') return;
    setBulkDeleting(true);
    try {
      const { deleted } = await deleteFailedVideoJobs();
      toast.success(
        deleted === 1 ? '1 job removido' : `${deleted} jobs removidos`,
      );
      setConfirm(null);
      await fetchJobs();
    } catch (err) {
      toast.error('Falha ao remover jobs', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBulkDeleting(false);
    }
  }, [confirm, fetchJobs]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-atlas-muted-2">
          {jobs.length} jobs · atualiza a cada {POLL_MS / 1000}s
        </p>
        <div className="flex items-center gap-2">
          {failedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setConfirm({ kind: 'bulk-failed', count: failedCount })
              }
              disabled={bulkDeleting}
              className="text-red-700 hover:text-red-800 dark:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar falhas ({failedCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-atlas-line bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-atlas-line bg-atlas-surface">
        <table className="w-full text-sm">
          <thead className="bg-atlas-surface-2/40 text-xs uppercase tracking-wide text-atlas-muted-2">
            <tr>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Destino</th>
              <th className="px-3 py-2 text-left">Qualidades</th>
              <th className="px-3 py-2 text-right">Duração</th>
              <th className="px-3 py-2 text-right">Quando</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-atlas-line">
            {jobs.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-atlas-muted-2"
                >
                  Nenhum job registrado.
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-atlas-surface-2/30">
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium uppercase',
                      statusColor(j.status),
                    )}
                  >
                    <StatusIcon status={j.status} />
                    {j.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="font-mono text-[11px] text-atlas-ink dark:text-atlas-ink-2">
                    {j.sourceKey}
                  </div>
                  {j.errorMessage && (
                    <div className="mt-0.5 text-[11px] text-red-600">
                      {j.errorMessage}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-atlas-muted-2">
                  {j.destinationKey ?? '—'}
                </td>
                <td className="px-3 py-2 text-[11px] text-atlas-muted-2">
                  {j.profiles.length > 0 ? j.profiles.join(', ') : '—'}
                </td>
                <td className="px-3 py-2 text-right text-[11px] text-atlas-muted-2">
                  {j.durationSec
                    ? `${(j.durationSec / 60).toFixed(1)}min`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right text-[11px] text-atlas-muted-2">
                  {relative(j.completedAt ?? j.createdAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    aria-label={`Remover job ${j.sourceKey}`}
                    onClick={() => setConfirm({ kind: 'single', job: j })}
                    disabled={deletingId === j.id}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-atlas-muted-2 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                  >
                    {deletingId === j.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!deletingId && !bulkDeleting) setConfirm(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-lg border border-atlas-line bg-atlas-surface p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-atlas-ink dark:text-atlas-ink-2">
              {confirm.kind === 'single'
                ? 'Remover job?'
                : 'Limpar todas as falhas?'}
            </h3>
            <p className="mb-6 text-sm text-atlas-ink-2 dark:text-atlas-muted-2">
              {confirm.kind === 'single' ? (
                <>
                  Remover o registro do job{' '}
                  <strong className="font-mono break-all">
                    {confirm.job.sourceKey}
                  </strong>
                  ? Esta ação não pode ser desfeita. O arquivo em R2 não é
                  afetado.
                </>
              ) : (
                <>
                  Remover{' '}
                  <strong>
                    {confirm.count === 1
                      ? '1 job com status failed'
                      : `${confirm.count} jobs com status failed`}
                  </strong>
                  ? Esta ação não pode ser desfeita. Arquivos em R2 não são
                  afetados.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                disabled={deletingId !== null || bulkDeleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-atlas-ink-2 transition-colors hover:bg-atlas-surface-2 disabled:opacity-50 dark:text-atlas-muted-2"
              >
                Cancelar
              </button>
              <button
                onClick={
                  confirm.kind === 'single'
                    ? handleConfirmSingle
                    : handleConfirmBulk
                }
                disabled={deletingId !== null || bulkDeleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {(deletingId !== null || bulkDeleting) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
