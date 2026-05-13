'use client';

/**
 * Painel central com videos. Mostra:
 * - Quando selectedFolderId === 'INBOX': videos com folderId=null (Video.r2_hls
 *   ja cadastrados no DB) + lista pending do sync-status (R2 sem Video).
 * - Quando selectedFolderId === <id>: videos da pasta selecionada.
 */

import { ExternalLink, FileVideo, Loader2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  SyncStatusPending,
  UnassignedVideo,
} from '@/lib/types/media-folder.types';

interface VideoCard {
  id: string;
  title: string;
  hlsUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  folderId: string | null;
}

interface VideosPanelProps {
  loading: boolean;
  selectedFolderId: string | null | 'INBOX';
  selectedFolderName: string;
  videos: VideoCard[];
  unassigned: UnassignedVideo[];
  pending: SyncStatusPending[];
  onMoveVideo: (videoId: string, currentFolderId: string | null, label: string) => void;
}

function formatDuration(sec: number) {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VideosPanel({
  loading,
  selectedFolderId,
  selectedFolderName,
  videos,
  unassigned,
  pending,
  onMoveVideo,
}: VideosPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isInbox = selectedFolderId === 'INBOX';

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{selectedFolderName}</h2>
        {isInbox ? (
          <span className="text-xs text-muted-foreground">
            {unassigned.length} no DB · {pending.length} no R2 sem Video
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {videos.length} vídeo{videos.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Videos unassigned (DB) ou videos de uma pasta */}
      {isInbox ? (
        <>
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Vídeos no DB sem pasta ({unassigned.length})
            </h3>
            {unassigned.length === 0 ? (
              <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                Nenhum vídeo sem pasta. Tudo organizado.
              </p>
            ) : (
              <ul className="space-y-2">
                {unassigned.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-3 rounded-md border bg-card p-3"
                  >
                    <FileVideo className="h-5 w-5 shrink-0 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{v.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {v.r2Basename ?? '—'} · {formatDuration(v.duration)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMoveVideo(v.id, null, v.title)}
                    >
                      <Move className="mr-1 h-3.5 w-3.5" />
                      Mover para
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Pastas no R2 sem Video cadastrado ({pending.length})
            </h3>
            {pending.length === 0 ? (
              <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                Tudo sincronizado. R2 e DB batem.
              </p>
            ) : (
              <ul className="space-y-2">
                {pending.map((p) => (
                  <li
                    key={p.fullPath}
                    className="flex items-center gap-3 rounded-md border border-dashed border-amber-300 bg-amber-50 p-3"
                  >
                    <FileVideo className="h-5 w-5 shrink-0 text-amber-600" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{p.r2Basename}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.fullPath} · {p.fileCount} arq
                      </p>
                    </div>
                    <Badge variant="outline" className="border-amber-400 text-amber-700">
                      Pendente
                    </Badge>
                    <a
                      href={p.hlsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded p-1.5 hover:bg-amber-100"
                      title="Abrir master playlist"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-amber-700" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {pending.length > 0 && (
              <p className="mt-2 break-words text-xs text-muted-foreground">
                Esses paths existem no R2 mas não tem Video no DB. Adicione
                via <code className="break-all">/admin/modules/&lt;moduleId&gt;/videos</code> no modo
                R2 HLS — depois aparecem aqui no Inbox e podem ser movidos
                para a árvore.
              </p>
            )}
          </section>
        </>
      ) : (
        <ul className="space-y-2">
          {videos.length === 0 && (
            <li className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              Pasta vazia.
            </li>
          )}
          {videos.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-md border bg-card p-3"
            >
              <FileVideo className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{v.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDuration(v.duration)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMoveVideo(v.id, v.folderId, v.title)}
              >
                <Move className="mr-1 h-3.5 w-3.5" />
                Mover
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
