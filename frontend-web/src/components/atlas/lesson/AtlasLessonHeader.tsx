"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasLessonHeaderProps {
  /** Caps acima do título — ex: "Curso · Procedimentos de Emergência" */
  metaLabel: string;
  /** Título do curso */
  title: string;
  /** Sufixo italico opcional do título — ex: "— técnica e indicações" */
  titleEm?: string;
  /** Numerador da progresso (ex: "01") */
  progressDone?: string;
  /** Denominador da progresso (ex: "05") */
  progressTotal?: string;
  /** Label sob o número — default "aulas concluídas" */
  progressLabel?: string;
  /** % de progresso (0-100) — usado em mobile para barra fina abaixo do compact header */
  progressPercent?: number;
  /** Texto do back link */
  backLabel?: string;
  /** Texto compacto do back em mobile (default "Voltar") */
  backLabelMobile?: string;
  onBack?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function AtlasLessonHeader({
  metaLabel,
  title,
  titleEm,
  progressDone,
  progressTotal,
  progressLabel = "aulas concluídas",
  progressPercent,
  backLabel = "Voltar aos cursos",
  backLabelMobile = "Voltar",
  onBack,
  className,
  children,
}: AtlasLessonHeaderProps) {
  return (
    <>
      {/* === MOBILE COMPACT (< md) === */}
      <div className={cn("md:hidden", className)}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-atlas-line bg-atlas-bg">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[13px] text-atlas-ink-2 hover:text-atlas-ink transition-colors"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              {backLabelMobile}
            </button>
          )}
          {(progressDone !== undefined || progressTotal !== undefined) && (
            <div className="font-mono text-[12.5px] tracking-tight atlas-num">
              <strong className="font-semibold text-atlas-ink">
                {progressDone}
              </strong>
              {progressTotal && (
                <span className="text-atlas-muted-2">
                  {" "}/ {progressTotal}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Progress bar fina (2px) */}
        {progressPercent !== undefined && (
          <div
            className="h-0.5 bg-atlas-line relative overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLabel}
          >
            <div
              className="absolute left-0 top-0 h-full bg-atlas-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      {/* === DESKTOP FULL (md+) === */}
      <section
        className={cn(
          "hidden md:block px-8 pt-7 pb-[22px] border-b border-atlas-line bg-atlas-bg",
          className,
        )}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-atlas-muted hover:text-atlas-ink transition-colors mb-3"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            {backLabel}
          </button>
        )}

        <div className="flex items-baseline justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="atlas-caps text-atlas-muted mb-1.5">
              {metaLabel}
            </div>
            <h1 className="font-serif text-[26px] font-medium tracking-[-0.015em] leading-[1.15] text-atlas-ink">
              {title}
              {titleEm && (
                <>
                  {" "}
                  <em className="italic font-normal text-atlas-muted">
                    {titleEm}
                  </em>
                </>
              )}
            </h1>
          </div>

          {(progressDone !== undefined || progressTotal !== undefined) && (
            <div className="text-right shrink-0">
              <div className="font-serif text-[22px] font-medium tracking-[-0.01em] leading-[1.1] atlas-num">
                {progressDone}
                {progressTotal && (
                  <span className="text-atlas-muted-2 font-normal">
                    {" "}/ {progressTotal}
                  </span>
                )}
              </div>
              <div className="atlas-caps text-atlas-muted mt-1">
                {progressLabel}
              </div>
            </div>
          )}
        </div>

        {children}
      </section>
    </>
  );
}
