'use client';

/**
 * Modal "Mover para" — escolhe pasta destino. Suporta:
 * - Search por nome (filtra arvore preservando ancestrais).
 * - Navegacao expand/collapse.
 * - Selecao da raiz (sem pasta) como destino.
 * - Bloqueio visual de destinos invalidos (proprio + descendentes) quando
 *   o que esta sendo movido e uma MediaFolder.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MediaFolderNode } from '@/lib/types/media-folder.types';

interface MoveToModalProps {
  open: boolean;
  onClose: () => void;
  folders: MediaFolderNode[];
  /** Pasta atualmente containing o item — pra destacar e impedir no-op. */
  currentFolderId: string | null;
  /** Quando o item movido e uma pasta, ID dela — pra bloquear self/descendant. */
  movingFolderId?: string;
  /** Label do que esta sendo movido — vai no titulo. */
  itemLabel: string;
  onConfirm: (targetFolderId: string | null) => Promise<void> | void;
}

interface TreeNode extends MediaFolderNode {
  children: TreeNode[];
}

function buildTree(folders: MediaFolderNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Ordenar por position dentro de cada nivel (folders ja vem ordenado mas
  // garantimos pos-build em caso de payload fora de ordem).
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function collectDescendantIds(node: TreeNode, out: Set<string>) {
  out.add(node.id);
  node.children.forEach((c) => collectDescendantIds(c, out));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Filtra a arvore por query: mantem nodes que matcham E todos seus
 * ancestrais (pra preservar contexto na visualizacao).
 */
function filterTree(roots: TreeNode[], query: string): {
  visible: Set<string>;
  hasAnyMatch: boolean;
} {
  const q = normalize(query.trim());
  if (!q) return { visible: new Set(), hasAnyMatch: true };

  const visible = new Set<string>();

  function walk(node: TreeNode, ancestors: string[]): boolean {
    const selfMatch = normalize(node.name).includes(q);
    let childMatch = false;
    for (const c of node.children) {
      if (walk(c, [...ancestors, node.id])) childMatch = true;
    }
    if (selfMatch || childMatch) {
      visible.add(node.id);
      ancestors.forEach((a) => visible.add(a));
      return true;
    }
    return false;
  }

  for (const r of roots) walk(r, []);
  return { visible, hasAnyMatch: visible.size > 0 };
}

export function MoveToModal({
  open,
  onClose,
  folders,
  currentFolderId,
  movingFolderId,
  itemLabel,
  onConfirm,
}: MoveToModalProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId(currentFolderId);
      setQuery('');
    }
  }, [open, currentFolderId]);

  const tree = useMemo(() => buildTree(folders), [folders]);

  // IDs invalidos: proprio + descendentes (apenas se movendo pasta).
  const invalidIds = useMemo(() => {
    const set = new Set<string>();
    if (!movingFolderId) return set;
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const n of nodes) {
        if (n.id === movingFolderId) return n;
        const found = findNode(n.children);
        if (found) return found;
      }
      return null;
    };
    const node = findNode(tree);
    if (node) collectDescendantIds(node, set);
    return set;
  }, [tree, movingFolderId]);

  const { visible, hasAnyMatch } = useMemo(
    () => filterTree(tree, query),
    [tree, query],
  );

  // Auto-expand search hits
  useEffect(() => {
    if (query.trim()) {
      setExpanded(new Set(visible));
    }
  }, [query, visible]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const isVisible = !query.trim() || visible.has(node.id);
    if (!isVisible) return null;
    const isExpanded = expanded.has(node.id);
    const isInvalid = invalidIds.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => !isInvalid && setSelectedId(node.id)}
          disabled={isInvalid}
          className={cn(
            'flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-sm',
            isSelected && 'bg-blue-100 text-blue-900',
            !isSelected && !isInvalid && 'hover:bg-muted',
            isInvalid && 'cursor-not-allowed opacity-40',
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          title={isInvalid ? 'Destino invalido (mesmo item ou descendente)' : undefined}
        >
          {hasChildren ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>
          ) : (
            <span className="inline-block w-4" />
          )}
          {isExpanded && hasChildren ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-blue-600" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-blue-600" />
          )}
          <span className="flex-1 truncate">{node.name}</span>
          {node._count && node._count.videos > 0 && (
            <span className="text-xs text-muted-foreground">
              {node._count.videos}
            </span>
          )}
        </button>
        {isExpanded && hasChildren && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(selectedId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  // Breadcrumb do destino
  const selectedPath = useMemo(() => {
    if (selectedId === null) return ['Raiz'];
    const path: string[] = [];
    let cursor: string | null = selectedId;
    const byId = new Map(folders.map((f) => [f.id, f]));
    while (cursor) {
      const node = byId.get(cursor);
      if (!node) break;
      path.unshift(node.name);
      cursor = node.parentId;
    }
    return path;
  }, [selectedId, folders]);

  const isNoop = selectedId === currentFolderId;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mover &ldquo;{itemLabel}&rdquo; para</DialogTitle>
          <DialogDescription>
            Escolha a pasta destino. A organização é apenas lógica; arquivos
            no R2 não são movidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pasta…"
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-72 rounded-md border">
            <div className="p-1">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                  selectedId === null && 'bg-blue-100 text-blue-900',
                  selectedId !== null && 'hover:bg-muted',
                )}
              >
                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">Raiz (sem pasta)</span>
              </button>
              {tree.map((root) => renderNode(root, 0))}
              {!hasAnyMatch && query.trim() && (
                <p className="px-3 py-4 text-xs text-muted-foreground">
                  Nenhuma pasta para &ldquo;{query}&rdquo;.
                </p>
              )}
              {tree.length === 0 && !query.trim() && (
                <p className="px-3 py-4 text-xs text-muted-foreground">
                  Nenhuma pasta criada ainda. Selecione a raiz ou crie uma
                  pasta antes.
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Destino:</span>{' '}
            {selectedPath.join(' / ')}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || isNoop}
            title={isNoop ? 'Item ja esta nesta pasta' : undefined}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mover aqui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
