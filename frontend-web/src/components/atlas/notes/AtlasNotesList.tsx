"use client";

import * as React from "react";
import { StickyNote, Plus, Loader2 } from "lucide-react";
import {
  AtlasCard,
  AtlasCardContent,
  AtlasCardHeader,
  AtlasCardTitle,
} from "@/components/atlas/primitives/AtlasCard";
import { AtlasButton } from "@/components/atlas/primitives/AtlasButton";
import { cn } from "@/lib/utils";

interface AtlasNotesListProps {
  /** Título — default "Anotações ancoradas no vídeo" */
  title?: string;
  /** Quantidade pra exibir ao lado do título */
  count?: number;
  /** Texto curto sob o header — default "Anote pontos-chave da aula" */
  hint?: string;
  /** Timestamp atual formatado pra usar no botão — ex "1:25" */
  currentTimestamp?: string;
  /** Click "Nova em X:XX" */
  onNew?: () => void;
  /** Bloqueia botão de criar quando true (form aberto) */
  disabled?: boolean;
  /** Conteúdo — AtlasNoteRow children, ou empty state, ou skeleton */
  children: React.ReactNode;
  /** Quando true: renderiza Loader inline em vez de children */
  loading?: boolean;
  /** Quando true: variant compacta (mobile) */
  compact?: boolean;
  className?: string;
}

export function AtlasNotesList({
  title = "Anotações ancoradas",
  count,
  hint,
  currentTimestamp,
  onNew,
  disabled = false,
  children,
  loading = false,
  compact = false,
  className,
}: AtlasNotesListProps) {
  return (
    <AtlasCard className={className}>
      <AtlasCardHeader
        className={cn(
          "flex-col sm:flex-row sm:items-center items-start gap-3 sm:gap-3",
          compact && "px-4 py-3",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <StickyNote
            className="size-4 text-atlas-warn-deep shrink-0"
            strokeWidth={1.5}
          />
          <AtlasCardTitle className={cn(compact && "text-[14px]")}>
            {title}
          </AtlasCardTitle>
          {count !== undefined && count > 0 && (
            <span className="atlas-mono text-[10.5px] text-atlas-muted atlas-num">
              {count}
            </span>
          )}
        </div>
        {onNew && (
          <AtlasButton
            variant="outline"
            size="sm"
            onClick={onNew}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Plus strokeWidth={1.75} />
            {currentTimestamp ? (
              <>
                Nova em{" "}
                <span className="atlas-mono">{currentTimestamp}</span>
              </>
            ) : (
              "Nova nota"
            )}
          </AtlasButton>
        )}
      </AtlasCardHeader>
      <AtlasCardContent className={cn(compact ? "px-4 py-3" : "px-[22px] py-3")}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              className="size-5 animate-spin text-atlas-muted-2"
              strokeWidth={1.75}
            />
          </div>
        ) : (
          hint && !React.Children.count(children) ? null : children
        )}
        {!loading && hint && React.Children.count(children) === 0 && (
          <p className="text-[12.5px] text-atlas-muted text-center py-6 leading-[1.55]">
            {hint}
          </p>
        )}
      </AtlasCardContent>
    </AtlasCard>
  );
}
