import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasLessonInfoProps {
  /** "Aula 02 · Técnica" */
  lessonNum?: string;
  /** Título da aula em serif 22px */
  title: string;
  /** Slot inline ao lado direito do título (ex: VideoLikeButton) — fica row com title flex-1 */
  inlineAction?: React.ReactNode;
  /** Linha de contexto curta abaixo do título (sans 12 muted) — ex: "Curso · aula 05 / 05" */
  contextLine?: React.ReactNode;
  /** Descrição / sublabel em texto comum 13.5px max-w-640px */
  description?: string;
  /** Slot direita — botões Anterior / Concluir (md+ only quando watch tem bottom bar) */
  actions?: React.ReactNode;
  className?: string;
}

export function AtlasLessonInfo({
  lessonNum,
  title,
  inlineAction,
  contextLine,
  description,
  actions,
  className,
}: AtlasLessonInfoProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-6 mb-1.5",
        className,
      )}
    >
      <div className="min-w-0 md:flex-1">
        {lessonNum && (
          <div className="atlas-mono text-[12px] text-atlas-muted-2 tracking-[0.05em] uppercase mb-1.5 truncate">
            {lessonNum}
          </div>
        )}

        {/* Title row — title flex-1 + inlineAction shrink-0 (Like button) */}
        <div className="flex items-start gap-3">
          <h2 className="flex-1 min-w-0 font-serif text-[22px] font-medium tracking-[-0.01em] leading-[1.2] text-atlas-ink">
            {title}
          </h2>
          {inlineAction && <div className="shrink-0">{inlineAction}</div>}
        </div>

        {contextLine && (
          <div className="text-[12px] text-atlas-muted mt-1.5">
            {contextLine}
          </div>
        )}

        {description && (
          <p className="text-[13.5px] text-atlas-muted leading-[1.55] max-w-[640px] mt-2">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap gap-2 shrink-0 md:items-start">
          {actions}
        </div>
      )}
    </div>
  );
}
