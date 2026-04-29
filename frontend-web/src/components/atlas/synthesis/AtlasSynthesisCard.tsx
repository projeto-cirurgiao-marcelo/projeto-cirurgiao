"use client";

import * as React from "react";
import { Sparkles, Download, RotateCcw } from "lucide-react";
import { AtlasButton } from "@/components/atlas/primitives/AtlasButton";
import {
  AtlasCard,
  AtlasCardContent,
  AtlasCardFooter,
  AtlasCardHeader,
  AtlasCardTitle,
} from "@/components/atlas/primitives/AtlasCard";
import { cn } from "@/lib/utils";

interface AtlasSynthesisCardProps {
  /** Título do card. Default "Pontos-chave da aula" */
  title?: string;
  /** Label de uso — ex: "02 / 03 disponíveis" */
  usageLabel?: string;
  /** Label de atualização — ex: "Atualizado · 4 min de leitura" */
  updatedLabel?: string;
  /** Conteúdo da síntese — paragraphs com possíveis spans .atlas-key dentro */
  children: React.ReactNode;
  onExport?: () => void;
  onRegenerate?: () => void;
  /** Desabilita botões durante operação */
  busy?: boolean;
  /** Slot adicional no footer (ex: ações extras) */
  extraActions?: React.ReactNode;
  className?: string;
}

export function AtlasSynthesisCard({
  title = "Pontos-chave da aula",
  usageLabel,
  updatedLabel,
  children,
  onExport,
  onRegenerate,
  busy = false,
  extraActions,
  className,
}: AtlasSynthesisCardProps) {
  return (
    <AtlasCard className={className}>
      <AtlasCardHeader>
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles
            className="size-4 text-atlas-primary shrink-0"
            strokeWidth={1.5}
          />
          <AtlasCardTitle>{title}</AtlasCardTitle>
        </div>
        {updatedLabel && (
          <span className="atlas-mono text-[10.5px] text-atlas-muted shrink-0">
            {updatedLabel}
          </span>
        )}
      </AtlasCardHeader>

      <AtlasCardContent
        className={cn(
          "font-serif text-[14.5px] leading-[1.65] text-atlas-ink-2",
          "[&_p]:mb-3 [&_p:last-child]:mb-0",
          "[&_strong]:text-atlas-ink [&_strong]:font-medium",
          "[&_em]:italic [&_em]:text-atlas-muted",
        )}
      >
        {children}
      </AtlasCardContent>

      {(onExport || onRegenerate || usageLabel || extraActions) && (
        <AtlasCardFooter className="flex-wrap gap-y-2">
          {onExport && (
            <AtlasButton
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={busy}
            >
              <Download strokeWidth={1.5} />
              Exportar
            </AtlasButton>
          )}
          {onRegenerate && (
            <AtlasButton
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={busy}
            >
              <RotateCcw strokeWidth={1.5} />
              {busy ? "Regenerando..." : "Regenerar"}
            </AtlasButton>
          )}
          {extraActions}
          {usageLabel && (
            <span className="ml-auto w-full sm:w-auto sm:ml-auto atlas-mono text-[10.5px] text-atlas-muted text-right sm:text-left">
              {usageLabel}
            </span>
          )}
        </AtlasCardFooter>
      )}
    </AtlasCard>
  );
}
