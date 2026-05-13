'use client';

/**
 * Admin Media Library — pagina principal.
 * Modelo hibrido: storage R2 imutavel; organizacao logica em DB via
 * MediaFolder + Video.folderId. Toda movimentacao = UPDATE, zero ops em R2.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mediaFoldersService } from '@/lib/api/media-folders.service';
import type {
  MediaFolderNode,
  SyncStatusResponse,
  UnassignedVideo,
} from '@/lib/types/media-folder.types';
import { FolderTreePanel } from './_components/folder-tree-panel';
import { VideosPanel } from './_components/videos-panel';
import { MoveToModal } from '@/components/tree/move-to-modal';
import type { TreeNodeData } from '@/components/tree/types';

type SelectedId = string | null | 'INBOX';

export default function AdminMediaPage() {
  const [folders, setFolders] = useState<MediaFolderNode[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [unassigned, setUnassigned] = useState<UnassignedVideo[]>([]);
  const [pending, setPending] = useState<SyncStatusResponse | null>(null);
  const [videosOfFolder, setVideosOfFolder] = useState<UnassignedVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<SelectedId>('INBOX');
  const [syncing, setSyncing] = useState(false);

  // Modal: criar pasta
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');

  // Modal: renomear pasta
  const [renameTarget, setRenameTarget] = useState<MediaFolderNode | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Modal: mover (pasta ou video)
  const [moveModal, setMoveModal] = useState<{
    open: boolean;
    kind: 'folder' | 'video';
    id: string;
    label: string;
    currentFolderId: string | null;
    movingFolderId?: string;
  } | null>(null);

  const loadFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const data = await mediaFoldersService.listFolders();
      setFolders(data);
    } catch (err) {
      toast.error('Erro ao carregar pastas', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  const loadUnassigned = useCallback(async () => {
    try {
      const data = await mediaFoldersService.listUnassigned();
      setUnassigned(data);
    } catch {
      // silent — toast no sync
    }
  }, []);

  const loadFolderVideos = useCallback(async (folderId: string) => {
    setVideosLoading(true);
    try {
      const data = await mediaFoldersService.listVideosInFolder(folderId);
      setVideosOfFolder(data);
    } catch (err) {
      toast.error('Erro ao listar vídeos', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
    loadUnassigned();
  }, [loadFolders, loadUnassigned]);

  useEffect(() => {
    if (selectedFolderId && selectedFolderId !== 'INBOX') {
      loadFolderVideos(selectedFolderId);
    } else {
      setVideosOfFolder([]);
    }
  }, [selectedFolderId, loadFolderVideos]);

  async function handleSync() {
    setSyncing(true);
    const toastId = toast.loading('Sincronizando com R2...');
    try {
      const data = await mediaFoldersService.getSyncStatus();
      setPending(data);
      toast.success('Sincronização concluída', {
        id: toastId,
        description: `${data.totalInR2} no R2 · ${data.totalInDb} no DB · ${data.pendingCount} pendentes`,
      });
    } catch (err) {
      toast.error('Erro na sincronização', {
        id: toastId,
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreate() {
    if (!createName.trim()) return;
    try {
      await mediaFoldersService.createFolder({
        name: createName.trim(),
        parentId: createParentId,
      });
      toast.success('Pasta criada');
      setCreateOpen(false);
      setCreateName('');
      await loadFolders();
    } catch (err) {
      toast.error('Erro ao criar pasta', {
        description: err instanceof Error ? err.message : '',
      });
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await mediaFoldersService.updateFolder(renameTarget.id, {
        name: renameValue.trim(),
      });
      toast.success('Pasta renomeada');
      setRenameTarget(null);
      setRenameValue('');
      await loadFolders();
    } catch (err) {
      toast.error('Erro ao renomear', {
        description: err instanceof Error ? err.message : '',
      });
    }
  }

  async function handleDelete(folder: MediaFolderNode) {
    const childCount = folder._count?.children ?? 0;
    const videoCount = folder._count?.videos ?? 0;
    const message =
      childCount + videoCount > 0
        ? `Excluir "${folder.name}"? Subpastas (${childCount}) serão removidas em cascata. Vídeos (${videoCount}) voltam para o Inbox.`
        : `Excluir "${folder.name}"?`;
    if (!confirm(message)) return;
    try {
      await mediaFoldersService.deleteFolder(folder.id);
      toast.success('Pasta excluída');
      if (selectedFolderId === folder.id) setSelectedFolderId('INBOX');
      await Promise.all([loadFolders(), loadUnassigned()]);
    } catch (err) {
      toast.error('Erro ao excluir', {
        description: err instanceof Error ? err.message : '',
      });
    }
  }

  async function handleMoveConfirm(targetFolderId: string | null) {
    if (!moveModal) return;
    try {
      if (moveModal.kind === 'folder') {
        await mediaFoldersService.updateFolder(moveModal.id, {
          parentId: targetFolderId,
        });
        toast.success('Pasta movida');
        await loadFolders();
      } else {
        await mediaFoldersService.moveVideo(moveModal.id, targetFolderId);
        toast.success('Vídeo movido');
        // refresh both views
        await Promise.all([
          loadUnassigned(),
          selectedFolderId && selectedFolderId !== 'INBOX'
            ? loadFolderVideos(selectedFolderId)
            : Promise.resolve(),
          loadFolders(), // counts atualizam
        ]);
      }
    } catch (err) {
      toast.error('Erro ao mover', {
        description: err instanceof Error ? err.message : '',
      });
      throw err;
    }
  }

  const selectedFolderName = useMemo(() => {
    if (selectedFolderId === 'INBOX') return 'Inbox';
    if (selectedFolderId === null) return 'Raiz';
    return folders.find((f) => f.id === selectedFolderId)?.name ?? '—';
  }, [selectedFolderId, folders]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catálogo de Vídeos</h1>
          <p className="text-sm text-muted-foreground">
            Organize seus vídeos em pastas customizadas pra encontrá-los rápido.
            Esta é uma camada lógica — o arquivo no R2 e a URL HLS{' '}
            <strong>não são alterados</strong> por nenhuma ação aqui.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sincronizar com R2
        </Button>
      </header>

      {/* Helper de onboarding: 3 dimensões de um Video sempre causam confusão
          no 1o contato. Bloco curto explicando como Catálogo se relaciona
          com R2 (físico) e Módulos (pedagógico). */}
      <div className="rounded-md border border-atlas-line bg-atlas-surface-2/40 p-3 text-xs text-atlas-muted-2">
        <p className="mb-1 font-medium text-atlas-ink dark:text-atlas-ink-2">
          Onde meu vídeo aparece?
        </p>
        <ul className="space-y-0.5">
          <li>
            <strong>R2 Browser</strong> (/admin/r2-browser): arquivo físico
            imutável. Onde fica o player + URL pra copiar.
          </li>
          <li>
            <strong>Catálogo</strong> (aqui): pasta lógica pra você encontrar.
            Mover entre pastas = só metadata.
          </li>
          <li>
            <strong>Módulo do curso</strong> (/admin/modules/.../videos): onde a
            aula vira lição numa sequência. Tem ordem, é publicada/oculta etc.
          </li>
        </ul>
      </div>

      {/* minmax(0,1fr) na 2a track evita o bug classico de CSS Grid em que */}
      {/* conteudo intrinsicamente largo (URLs longas, <code> sem break) */}
      {/* expande a track alem do esperado e estica a pagina toda. */}
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {foldersLoading ? (
          <aside className="flex items-center justify-center rounded-lg border bg-card p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </aside>
        ) : (
          <FolderTreePanel
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
            onCreate={(parentId) => {
              setCreateParentId(parentId);
              setCreateName('');
              setCreateOpen(true);
            }}
            onRename={(f) => {
              setRenameTarget(f);
              setRenameValue(f.name);
            }}
            onMove={(f) => {
              setMoveModal({
                open: true,
                kind: 'folder',
                id: f.id,
                label: f.name,
                currentFolderId: f.parentId,
                movingFolderId: f.id,
              });
            }}
            onDelete={handleDelete}
          />
        )}

        <VideosPanel
          loading={videosLoading}
          selectedFolderId={selectedFolderId}
          selectedFolderName={selectedFolderName}
          videos={videosOfFolder.map((v) => ({
            id: v.id,
            title: v.title,
            hlsUrl: v.hlsUrl,
            thumbnailUrl: v.thumbnailUrl,
            duration: v.duration,
            folderId: v.folderId,
          }))}
          unassigned={unassigned}
          pending={pending?.pending ?? []}
          onMoveVideo={(videoId, currentFolderId, label) => {
            setMoveModal({
              open: true,
              kind: 'video',
              id: videoId,
              label,
              currentFolderId,
            });
          }}
        />
      </div>

      {/* Modal: criar pasta */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => !v && setCreateOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nova pasta
              {createParentId
                ? ` em "${folders.find((f) => f.id === createParentId)?.name}"`
                : ''}
            </DialogTitle>
            <DialogDescription>
              Slug é gerado automaticamente a partir do nome.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ex: Cirurgia abdominal"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!createName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: renomear */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(v) => !v && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: mover (componente generico de tree) */}
      {moveModal && (
        <MoveToModal
          open={moveModal.open}
          onClose={() => setMoveModal(null)}
          nodes={folders.map<TreeNodeData>((f) => ({
            id: f.id,
            parentId: f.parentId,
            label: f.name,
            position: f.position,
            hint:
              f._count && f._count.videos > 0
                ? `${f._count.videos} vídeos`
                : undefined,
          }))}
          currentParentId={moveModal.currentFolderId}
          movingNodeId={moveModal.movingFolderId}
          itemLabel={moveModal.label}
          onConfirm={handleMoveConfirm}
        />
      )}
    </div>
  );
}
