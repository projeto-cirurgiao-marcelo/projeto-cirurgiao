"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasChapterRowProps {
  /** "0:38" — timestamp formatado */
  timestamp: string;
  /** Nome do capítulo */
  title: string;
  /** Duração formatada compacta (ex: "1:42") — opcional */
  duration?: string;
  /** Ativo quando currentTime cai neste capítulo */
  active?: boolean;
  onSeek?: () => void;
  className?: string;
}

export function AtlasChapterRow({
  timestamp,
  title,
  duration,
  active = false,
  onSeek,
  className,
}: AtlasChapterRowProps) {
  return (
    <button
      type="button"
      onClick={onSeek}
      className={cn(
        "w-full grid grid-cols-[56px_1fr_auto] gap-4 items-baseline",
        "py-3 px-2 -mx-2 rounded-sm text-left",
        "border-t border-atlas-line first:border-t-0",
        "transition-colors duration-150",
        active ? "bg-atlas-primary-soft" : "hover:bg-atlas-surface-2",
        className,
      )}
    >
      <span
        className={cn(
          "atlas-mono text-[11.5px]",
          active ? "text-atlas-primary" : "text-atlas-muted",
        )}
      >
        {timestamp}
      </span>
      <span
        className={cn(
          "text-[13.5px] leading-[1.4] line-clamp-2 min-w-0",
          active
            ? "font-medium text-atlas-primary-2"
            : "text-atlas-ink-2",
        )}
      >
        {title}
      </span>
      {duration && (
        <span
          className={cn(
            "atlas-mono text-[11px] atlas-num text-right",
            active ? "text-atlas-primary-2" : "text-atlas-muted-2",
          )}
        >
          {duration}
        </span>
      )}
    </button>
  );
}
