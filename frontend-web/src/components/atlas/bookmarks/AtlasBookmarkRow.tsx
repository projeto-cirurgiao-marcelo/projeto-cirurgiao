"use client";

import * as React from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasBookmarkRowProps {
  /** Timestamp formatado mono — ex "0:38" */
  timestamp: string;
  /** Label opcional. Quando ausente, usa fallback "Marcador em {timestamp}" */
  label?: string | null;
  /** Thumbnail (data URL ou http) */
  thumbnailUrl?: string | null;
  onSeek?: () => void;
  onDelete?: () => void;
  /** Quando true, botão delete fica disabled + spinner */
  deleting?: boolean;
  className?: string;
}

export function AtlasBookmarkRow({
  timestamp,
  label,
  thumbnailUrl,
  onSeek,
  onDelete,
  deleting = false,
  className,
}: AtlasBookmarkRowProps) {
  const displayLabel = label || `Marcador em ${timestamp}`;
  return (
    <div
      className={cn(
        "group grid grid-cols-[80px_1fr_auto] items-center gap-3",
        "border-t border-atlas-line first:border-t-0",
        "py-2 -mx-2 px-2 rounded-sm",
        onSeek && "hover:bg-atlas-surface-2 transition-colors duration-150",
        className,
      )}
    >
      <button
        type="button"
        onClick={onSeek}
        className="aspect-video rounded-sm overflow-hidden border border-atlas-line bg-atlas-surface-2 cursor-pointer text-left"
        aria-label={`Ir para ${timestamp}`}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bookmark
              className="size-4 text-atlas-muted-2"
              strokeWidth={1.5}
            />
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onSeek}
        className="min-w-0 text-left cursor-pointer"
      >
        <div className="text-[13px] text-atlas-ink-2 font-medium truncate">
          {displayLabel}
        </div>
        <div className="atlas-mono text-[11.5px] text-atlas-warn-deep">
          {timestamp}
        </div>
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Excluir marcador"
          title="Excluir marcador"
          className={cn(
            "p-1.5 rounded-sm text-atlas-muted hover:text-atlas-accent hover:bg-atlas-surface",
            "sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150",
            "disabled:opacity-50",
          )}
        >
          <Trash2 className="size-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
