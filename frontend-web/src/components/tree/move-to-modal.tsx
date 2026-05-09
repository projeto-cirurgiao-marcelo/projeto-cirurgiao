'use client';

/**
 * Modal "Mover para" generico. Reusado por:
 * - /admin/media (mover MediaFolder ou Video).
 * - /admin/courses/[id]/edit (mover Module entre raiz e submodulo).
 *
 * Caller converte seu modelo pra TreeNodeData[] e passa.
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
import type { TreeNodeData } from './types';

interface MoveToModalProps {
  open: boolean;
  onClose: () => void;
  /** Arvore inteira (flat). */
  nodes: TreeNodeData[];
  /** Pasta atualmente containing o item (no-op se igual). null = raiz. */
  currentParentId: string | null;
  /**
   * Quando o item movido e um node da propria arvore (ex: mover pasta),
   * passa o id pra bloquear destino == self ou descendente.
   */
  movingNodeId?: string;
  itemLabel: string;
  /** Texto pro destino "Raiz" — default "Raiz (sem pasta)". */
  rootLabel?: string;
  /** Permite escolher Raiz como destino. Default true. */
  allowRoot?: boolean;
  onConfirm: (targetParentId: string | null) => Promise<void> | void;
  /** Texto descritivo no header. Default explica que e logico. */
  description?: string;
}

interface InternalNode extends TreeNodeData {
  children: InternalNode[];
}

function buildTree(nodes: TreeNodeData[]): InternalNode[] {
  const map = new Map<string, InternalNode>();
  for (const n of nodes) map.set(n.id, { ...n, children: [] });
  const roots: InternalNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (arr: InternalNode[]) => {
    arr.sort(
      (a, b) =>
        (a.position ?? 0) - (b.position ?? 0) || a.label.localeCompare(b.label),
    );
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function collectDescendantIds(node: InternalNode, out: Set<string>) {
  out.add(node.id);
  node.children.forEach((c) => collectDescendantIds(c, out));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function filterTree(
  roots: InternalNode[],
  query: string,
): { visible: Set<string>; hasAnyMatch: boolean } {
  const q = normalize(query.trim());
  if (!q) return { visible: new Set(), hasAnyMatch: true };
  const visible = new Set<string>();
  function walk(node: InternalNode, ancestors: string[]): boolean {
    const selfMatch = normalize(node.label).includes(q);
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
  nodes,
  currentParentId,
  movingNodeId,
  itemLabel,
  rootLabel = 'Raiz (sem pasta)',
  allowRoot = true,
  onConfirm,
  description = 'Escolha a pasta destino. A organização é apenas lógica; arquivos não são movidos.',
}: MoveToModalProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(currentParentId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId(currentParentId);
      setQuery('');
    }
  }, [open, currentParentId]);

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const invalidIds = useMemo(() => {
    const set = new Set<string>();
    if (!movingNodeId) return set;
    const findNode = (arr: InternalNode[]): InternalNode | null => {
      for (const n of arr) {
        if (n.id === movingNodeId) return n;
        const f = findNode(n.children);
        if (f) return f;
      }
      return null;
    };
    const node = findNode(tree);
    if (node) collectDescendantIds(node, set);
    return set;
  }, [tree, movingNodeId]);

  const { visible, hasAnyMatch } = useMemo(
    () => filterTree(tree, query),
    [tree, query],
  );

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

  function renderNode(node: InternalNode, depth: number): React.ReactNode {
    const isVisible = !query.trim() || visible.has(node.id);
    if (!isVisible) return null;
    const isExpanded = expanded.has(node.id);
    const isInvalid = invalidIds.has(node.id) || node.disabled === true;
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
          title={
            isInvalid
              ? 'Destino invalido (mesmo item, descendente ou desabilitado)'
              : undefined
          }
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
          <span className="flex-1 truncate">{node.label}</span>
          {node.hint && (
            <span className="text-xs text-muted-foreground">{node.hint}</span>
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

  const selectedPath = useMemo(() => {
    if (selectedId === null) return [rootLabel];
    const path: string[] = [];
    let cursor: string | null = selectedId;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    while (cursor) {
      const node = byId.get(cursor);
      if (!node) break;
      path.unshift(node.label);
      cursor = node.parentId;
    }
    return path;
  }, [selectedId, nodes, rootLabel]);

  const isNoop = selectedId === currentParentId;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mover &ldquo;{itemLabel}&rdquo; para</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-72 rounded-md border">
            <div className="p-1">
              {allowRoot && (
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
                  <span className="flex-1">{rootLabel}</span>
                </button>
              )}
              {tree.map((root) => renderNode(root, 0))}
              {!hasAnyMatch && query.trim() && (
                <p className="px-3 py-4 text-xs text-muted-foreground">
                  Nenhum resultado para &ldquo;{query}&rdquo;.
                </p>
              )}
              {tree.length === 0 && !query.trim() && !allowRoot && (
                <p className="px-3 py-4 text-xs text-muted-foreground">
                  Nenhuma pasta disponível.
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
            disabled={submitting || isNoop || (!allowRoot && selectedId === null)}
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
