"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasAdminStripProps {
  /** Texto principal — default "Visualizando como estudante" */
  label?: string;
  /** Texto do botão de retorno — default "Voltar ao painel" */
  backLabel?: string;
  /** Click do botão de retorno */
  onBack?: () => void;
  /** Slot extra à direita */
  trailing?: React.ReactNode;
  className?: string;
}

export function AtlasAdminStrip({
  label = "Visualizando como estudante",
  backLabel = "Voltar ao painel",
  onBack,
  trailing,
  className,
}: AtlasAdminStripProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 sm:px-8 h-10",
        "bg-atlas-ink text-white text-[12px]",
        className,
      )}
      role="status"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm shrink-0",
            "hover:bg-white/10 transition-colors",
          )}
        >
          <ArrowLeft className="size-3" strokeWidth={2} />
          <span className="hidden xs:inline sm:inline">{backLabel}</span>
          <span className="xs:hidden sm:hidden">Voltar</span>
        </button>
      </div>
      <div className="flex items-center gap-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="size-1.5 rounded-full bg-atlas-warn shrink-0"
            aria-hidden
          />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">Modo aluno</span>
        </div>
        {trailing}
      </div>
    </div>
  );
}
