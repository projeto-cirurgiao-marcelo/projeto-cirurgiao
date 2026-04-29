"use client";

import * as React from "react";
import {
  ExternalLink,
  Download,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MaterialKind = "pdf" | "link" | "article" | "file";

export interface AtlasMaterialRowProps {
  /** Tipo — usado pra cor do ícone tag */
  kind: MaterialKind;
  /** Ícone Lucide a renderizar à esquerda */
  icon: LucideIcon;
  /** Título do material */
  title: string;
  /** Descrição opcional ou label do tipo */
  meta?: string;
  /** Tag opcional à direita (ex: tamanho do arquivo "2.4 MB" ou rótulo "PDF") */
  tag?: string;
  href: string;
  /** "open" usa ExternalLink, "download" usa Download */
  action?: "open" | "download";
  /** Compact reduz padding e ícone */
  compact?: boolean;
  className?: string;
}

const KIND_TONE: Record<MaterialKind, string> = {
  pdf: "text-atlas-accent",
  link: "text-atlas-primary",
  article: "text-atlas-success",
  file: "text-atlas-muted",
};

export function AtlasMaterialRow({
  kind,
  icon: Icon,
  title,
  meta,
  tag,
  href,
  action = "open",
  compact = false,
  className,
}: AtlasMaterialRowProps) {
  const ActionIcon = action === "download" ? Download : ExternalLink;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group grid grid-cols-[24px_1fr_auto] items-center gap-3",
        "border-t border-atlas-line first:border-t-0",
        "hover:bg-atlas-surface-2 transition-colors duration-150",
        compact ? "px-2 py-2" : "px-2 py-3",
        "-mx-2",
        className,
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          KIND_TONE[kind],
        )}
        strokeWidth={1.5}
      />
      <div className="min-w-0">
        <div
          className={cn(
            "text-atlas-ink truncate",
            compact ? "text-[12.5px] font-medium" : "text-[13.5px] font-medium",
          )}
        >
          {title}
        </div>
        {meta && (
          <div className="atlas-mono text-[10.5px] text-atlas-muted tracking-[0.04em] truncate uppercase hidden sm:block">
            {meta}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {tag && (
          <span className="atlas-mono text-[10.5px] text-atlas-muted-2 atlas-num">
            {tag}
          </span>
        )}
        <ActionIcon
          className="size-3.5 text-atlas-muted-2 group-hover:text-atlas-primary transition-colors"
          strokeWidth={1.75}
        />
      </div>
    </a>
  );
}
