'use client';

/**
 * Painel lateral com a arvore de MediaFolders. Suporta:
 * - Expand/collapse de subtrees
 * - Selecao da pasta corrente (lista videos no painel central)
 * - Botoes inline: criar subfolder, renomear, mover, deletar
 * - "Inbox" virtual no topo (folderId=null)
 */

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Inbox,
  MoreHorizontal,
  Move,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MediaFolderNode } from '@/lib/types/media-folder.types';

interface FolderTreePanelProps {
  folders: MediaFolderNode[];
  selectedFolderId: string | null | 'INBOX';
  onSelect: (id: string | null | 'INBOX') => void;
  onCreate: (parentId: string | null) => void;
  onRename: (folder: MediaFolderNode) => void;
  onMove: (folder: MediaFolderNode) => void;
  onDelete: (folder: MediaFolderNode) => void;
}

interface TreeNode extends MediaFolderNode {
  children: TreeNode[];
}

function buildTree(folders: MediaFolderNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const f of folders) map.set(f.id, { ...f, children: [] });
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function FolderTreePanel({
  folders,
  selectedFolderId,
  onSelect,
  onCreate,
  onRename,
  onMove,
  onDelete,
}: FolderTreePanelProps) {
  const tree = useMemo(() => buildTree(folders), [folders]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(node: TreeNode, depth: number) {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;
    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded px-1 py-1.5 text-sm hover:bg-muted',
            isSelected && 'bg-blue-100 hover:bg-blue-100',
          )}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(node.id)}
              className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground"
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="inline-block w-5" />
          )}
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className="flex flex-1 items-center gap-2 truncate text-left"
          >
            {isExpanded && hasChildren ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-blue-600" />
            )}
            <span className="truncate">{node.name}</span>
            {node._count && node._count.videos > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {node._count.videos}
              </span>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreate(node.id)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Nova subpasta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(node)}>
                <Pencil className="mr-2 h-4 w-4" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(node)}>
                <Move className="mr-2 h-4 w-4" />
                Mover para…
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(node)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  }

  return (
    <aside className="flex flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Pastas</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onCreate(null)}
          title="Nova pasta na raiz"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        <button
          type="button"
          onClick={() => onSelect('INBOX')}
          className={cn(
            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted',
            selectedFolderId === 'INBOX' && 'bg-blue-100 hover:bg-blue-100',
          )}
        >
          <Inbox className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="flex-1 truncate text-left">Inbox</span>
        </button>
        {tree.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            Sem pastas. Clique em <FolderPlus className="inline h-3 w-3" /> pra
            criar a primeira.
          </p>
        ) : (
          tree.map((root) => renderNode(root, 0))
        )}
      </div>
    </aside>
  );
}
