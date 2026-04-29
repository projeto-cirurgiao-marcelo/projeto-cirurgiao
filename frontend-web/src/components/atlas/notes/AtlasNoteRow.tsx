"use client";

import * as React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasNoteRowProps {
  /** "0:38" — timestamp formatado mono. Pode ser undefined para nota sem timestamp */
  timestamp?: string;
  /** Texto da nota */
  body: string;
  /** Texto extra opcional — chapter, data ("Cap · Anatomia") */
  meta?: string;
  /** Click no row inteiro ou no timestamp = seek */
  onSeek?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function AtlasNoteRow({
  timestamp,
  body,
  meta,
  onSeek,
  onEdit,
  onDelete,
  className,
}: AtlasNoteRowProps) {
  const Wrapper = onSeek ? "button" : "div";
  return (
    <Wrapper
      type={onSeek ? "button" : undefined}
      onClick={onSeek}
      className={cn(
        "group grid grid-cols-[44px_1fr_auto] sm:grid-cols-[56px_1fr_auto] gap-3 sm:gap-4 items-baseline",
        "w-full text-left py-3 px-2 -mx-2 rounded-sm",
        "border-t border-atlas-line first:border-t-0",
        onSeek && "hover:bg-atlas-surface-2 transition-colors duration-150 cursor-pointer",
        className,
      )}
    >
      <span className="atlas-mono text-[11px] sm:text-[11.5px] font-medium text-atlas-warn-deep pt-0.5">
        {timestamp ?? "—:—"}
      </span>
      <div className="text-[13.5px] leading-[1.55] text-atlas-ink-2 whitespace-pre-line min-w-0">
        {body}
        {meta && (
          <span className="block mt-1 atlas-mono text-[10.5px] text-atlas-muted tracking-wide">
            {meta}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-sm hover:bg-atlas-surface text-atlas-muted hover:text-atlas-ink"
            aria-label="Editar nota"
          >
            <Edit2 className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-sm hover:bg-atlas-surface text-atlas-muted hover:text-atlas-accent"
            aria-label="Excluir nota"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </Wrapper>
  );
}
