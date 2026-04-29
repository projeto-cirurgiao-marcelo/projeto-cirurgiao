"use client";

import * as React from "react";
import { ArrowRight, Loader2, Lock, Trophy, type LucideIcon } from "lucide-react";
import { AtlasButton } from "@/components/atlas/primitives/AtlasButton";
import { cn } from "@/lib/utils";

export interface AssessmentMetaItem {
  /** Texto curto. Ex: "5 questões", "≥ 70% p/ aprovação", "tentativas ilimitadas" */
  text: string;
  /** Quando true: renderiza em font-mono atlas-num */
  mono?: boolean;
}

export interface AssessmentStat {
  /** Label curto. Ex: "Melhor", "Tentativas", "Média" */
  label: string;
  /** Valor formatado. Ex: "85%", "3", "78%" */
  value: string;
  /** Ícone opcional à esquerda do valor */
  icon?: LucideIcon;
  /** Tom semântico — primary (default) / success / warn */
  tone?: "default" | "success" | "warn";
}

interface AtlasAssessmentCTAProps {
  /** Caps em cima — ex: "Avaliação da aula" */
  label?: string;
  /** Título serif — ex: "Teste seu conhecimento" */
  title: string;
  /** Linha de meta com pontos — ex: 5 questões · ≥ 70% · ilimitadas */
  meta?: AssessmentMetaItem[];
  /** Stats opcionais quando há tentativas anteriores. Renderiza grid 3-col */
  stats?: AssessmentStat[];
  /** Texto do botão CTA */
  ctaLabel: string;
  /** Callback ao clicar. Sem callback = botão disabled */
  onStart?: () => void;
  /** Quando true: spinner + label diferente */
  busy?: boolean;
  /** Texto de busy. Default "Preparando…" */
  busyLabel?: string;
  /** Quando true: mostra ícone success + variant success */
  passed?: boolean;
  /** Quando definido: bloqueia CTA + mostra ícone Lock + reason */
  lockedReason?: string;
  /** Layout: "panel" (default, no sidebar/footer) / "card" (border + rounded standalone) */
  variant?: "panel" | "card";
  className?: string;
}

export function AtlasAssessmentCTA({
  label = "Avaliação da aula",
  title,
  meta = [],
  stats,
  ctaLabel,
  onStart,
  busy = false,
  busyLabel = "Preparando...",
  passed = false,
  lockedReason,
  variant = "panel",
  className,
}: AtlasAssessmentCTAProps) {
  const isLocked = !!lockedReason;

  return (
    <div
      className={cn(
        "px-5 py-[18px]",
        variant === "panel" &&
          "bg-atlas-surface-2 border-t border-atlas-line",
        variant === "card" &&
          "bg-atlas-surface-2 border border-atlas-line rounded-md",
        passed && "border-l-[3px] border-l-atlas-success",
        className,
      )}
    >
      <div className="atlas-caps text-atlas-muted mb-1.5 flex items-center gap-2">
        {passed && (
          <Trophy
            className="size-3 text-atlas-success"
            strokeWidth={1.75}
          />
        )}
        {label}
      </div>

      <h4
        className={cn(
          "font-serif text-[15px] font-medium tracking-[-0.005em] mb-1",
          passed ? "text-atlas-success" : "text-atlas-ink",
        )}
      >
        {title}
      </h4>

      {meta.length > 0 && (
        <div className="text-xs text-atlas-muted flex items-center flex-wrap gap-x-2 gap-y-1 mb-3.5">
          {meta.map((m, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span
                  aria-hidden
                  className="size-[2px] bg-atlas-muted-2 rounded-full shrink-0"
                />
              )}
              <span
                className={cn(
                  m.mono && "font-mono atlas-num text-[11px]",
                )}
              >
                {m.text}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {stats && stats.length > 0 && (
        <div
          className={cn(
            "grid gap-3 mb-3.5 px-3 py-2.5 rounded-sm",
            "bg-atlas-surface border border-atlas-line",
            stats.length === 2 && "grid-cols-2",
            // 3 stats em narrow extreme (<380px) ficam apertados — mantém 3-col mas font menor
            stats.length === 3 && "grid-cols-3",
            stats.length >= 4 && "grid-cols-2 sm:grid-cols-4",
          )}
        >
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={`${s.label}-${i}`} className="min-w-0">
                <div
                  className={cn(
                    "atlas-caps text-atlas-muted-2 mb-0.5",
                  )}
                >
                  {s.label}
                </div>
                <div
                  className={cn(
                    "font-mono text-[13px] sm:text-[14px] font-medium atlas-num inline-flex items-center gap-1 sm:gap-1.5 truncate",
                    s.tone === "success" && "text-atlas-success",
                    s.tone === "warn" && "text-atlas-warn-deep",
                    (!s.tone || s.tone === "default") && "text-atlas-ink",
                  )}
                >
                  {Icon && (
                    <Icon
                      className="size-3.5"
                      strokeWidth={1.75}
                    />
                  )}
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AtlasButton
        variant="primary"
        size="md"
        onClick={onStart}
        disabled={busy || isLocked || !onStart}
        className="w-full"
      >
        {busy ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {busyLabel}
          </>
        ) : (
          <>
            {ctaLabel}
            <ArrowRight strokeWidth={1.75} />
          </>
        )}
      </AtlasButton>

      {isLocked && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-atlas-muted">
          <Lock className="size-3" strokeWidth={1.75} />
          {lockedReason}
        </div>
      )}
    </div>
  );
}
