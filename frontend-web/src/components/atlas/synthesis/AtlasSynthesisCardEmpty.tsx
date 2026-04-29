"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { AtlasButton } from "@/components/atlas/primitives/AtlasButton";
import {
  AtlasCard,
  AtlasCardContent,
} from "@/components/atlas/primitives/AtlasCard";
import { cn } from "@/lib/utils";

interface AtlasSynthesisCardEmptyProps {
  /** Título do estado vazio */
  title?: string;
  /** Descrição secundária */
  description?: string;
  /** Texto auxiliar — ex: "03 disponíveis · IA aplica anotações da aula" */
  hint?: string;
  /** Label do botão CTA primário */
  ctaLabel?: string;
  /** Callback ao clicar gerar */
  onGenerate?: () => void;
  /** Quando true: gera em andamento (botão disabled + spinner) */
  generating?: boolean;
  /** Quando true: bloqueia geração (sem transcrição, sem cota, etc) */
  disabled?: boolean;
  /** Mensagem de bloqueio quando disabled — variant warn */
  disabledReason?: string;
  className?: string;
}

export function AtlasSynthesisCardEmpty({
  title = "Sem síntese gerada ainda",
  description = "A IA condensa a aula em pontos-chave, integrando suas anotações quando disponíveis.",
  hint,
  ctaLabel = "Gerar síntese com IA",
  onGenerate,
  generating = false,
  disabled = false,
  disabledReason,
  className,
}: AtlasSynthesisCardEmptyProps) {
  return (
    <AtlasCard
      className={cn(
        "border-dashed",
        className,
      )}
    >
      <AtlasCardContent className="text-center px-7 py-10">
        <div className="size-10 mx-auto mb-3.5 flex items-center justify-center text-atlas-muted-2">
          <Sparkles className="size-9" strokeWidth={1.25} />
        </div>
        <h4 className="font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink mb-1.5">
          {title}
        </h4>
        <p className="text-[13px] text-atlas-muted leading-[1.55] max-w-[360px] mx-auto mb-4">
          {description}
        </p>

        {disabledReason && disabled && (
          <div
            className={cn(
              "max-w-[360px] mx-auto mb-4 px-3 py-2 rounded-sm",
              "border border-atlas-line border-l-[3px] border-l-atlas-warn",
              "bg-atlas-surface-2 text-[12px] text-atlas-ink-2 text-left leading-[1.5]",
            )}
          >
            {disabledReason}
          </div>
        )}

        {onGenerate && (
          <AtlasButton
            variant="primary"
            size="md"
            onClick={onGenerate}
            disabled={disabled || generating}
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles strokeWidth={1.5} />
            )}
            {generating ? "Gerando..." : ctaLabel}
          </AtlasButton>
        )}

        {hint && (
          <div className="atlas-mono text-[10.5px] text-atlas-muted mt-3">
            {hint}
          </div>
        )}
      </AtlasCardContent>
    </AtlasCard>
  );
}
