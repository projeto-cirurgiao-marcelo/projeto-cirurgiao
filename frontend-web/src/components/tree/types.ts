/**
 * Tipo generico de node de arvore. Reusado por:
 * - /admin/media (MediaFolder hierarquia)
 * - /admin/courses/[id]/edit (Module hierarquia, chunk 4)
 *
 * Cada caller converte seu modelo pra essa shape antes de passar pro
 * MoveToModal ou TreeView.
 */
export interface TreeNodeData {
  id: string;
  parentId: string | null;
  label: string;
  /** Ordem dentro do mesmo parent. Default 0 se ausente. */
  position?: number;
  /** Subtitulo opcional (ex: "5 vídeos"). */
  hint?: string;
  /** Bloqueia este node como destino selecionavel. Default false. */
  disabled?: boolean;
}
