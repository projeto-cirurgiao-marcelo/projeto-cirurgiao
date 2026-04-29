"use client";

import * as React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AtlasCourseThumbVariant,
} from "./AtlasCourseThumb";

const VARIANT_GRADIENT: Record<AtlasCourseThumbVariant, string> = {
  default: "from-[#0F172A] to-[#1E3A8A]",
  alt: "from-[#1E293B] to-[#047857]",
  alt2: "from-[#1E293B] to-[#92400E]",
  alt3: "from-[#0F172A] to-[#7F1D1D]",
  alt4: "from-[#1E293B] to-[#1E40AF]",
};

interface AtlasCourseRowProps {
  href: string;
  title: string;
  category: string;
  instructor?: string;
  /** Texto opcional sobre a última aula assistida ("Anastomose intestinal") */
  lastLessonTitle?: string;
  /** Timestamp opcional formatado (ex: "2:14 / 18:42") */
  lastTimestamp?: string;
  /** Texto alternativo de meta quando não há última aula (ex: "Acessado em 22 abr") */
  lastMeta?: string;
  progressPercent: number;
  /** "5 / 8" — fração de aulas */
  lessonsProgress: string;
  thumbVariant?: AtlasCourseThumbVariant;
  /** Texto curto exibido na thumb compacta quando não há imagem */
  thumbLabel: string;
  thumbImageUrl?: string;
  className?: string;
}

export function AtlasCourseRow({
  href,
  title,
  category,
  instructor,
  lastLessonTitle,
  lastTimestamp,
  lastMeta,
  progressPercent,
  lessonsProgress,
  thumbVariant = "default",
  thumbLabel,
  thumbImageUrl,
  className,
}: AtlasCourseRowProps) {
  const [doneStr, totalStr] = lessonsProgress.split(" / ");

  return (
    <Link
      href={href}
      className={cn(
        "group block sm:grid sm:grid-cols-[96px_1fr_200px_110px] sm:gap-[18px] sm:items-center",
        "px-4 sm:px-[18px] py-3 sm:py-3.5 border-b border-atlas-line last:border-b-0",
        "hover:bg-atlas-surface-2 transition-colors duration-150",
        className,
      )}
    >
      {/* Mobile: linha 1 — thumb + info principal lado a lado */}
      <div className="flex items-start gap-3 sm:contents">
        {/* Thumb compacta */}
        <div
          className={cn(
            "relative w-20 sm:w-24 h-[52px] sm:h-[60px] rounded-sm overflow-hidden shrink-0",
            !thumbImageUrl && "bg-gradient-to-br",
            !thumbImageUrl && VARIANT_GRADIENT[thumbVariant],
          )}
        >
          {thumbImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbImageUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(47,128,237,0.2)_0%,transparent_50%)]"
              />
              <div className="absolute inset-0 flex items-center justify-center text-center px-1.5">
                <span className="font-serif text-[10px] sm:text-[11px] font-medium leading-[1.2] text-white/80 line-clamp-2">
                  {thumbLabel}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Info principal */}
        <div className="min-w-0 flex-1 sm:flex-none">
          <div className="font-mono text-[10px] text-atlas-muted tracking-[0.04em] mb-1 flex items-center gap-1.5 uppercase">
            <span className="truncate">{category}</span>
            {instructor && (
              <>
                <span className="text-atlas-muted-2">·</span>
                <span className="truncate hidden sm:inline">{instructor}</span>
              </>
            )}
          </div>
          <div className="font-serif text-[15px] sm:text-base font-medium tracking-[-0.005em] leading-[1.25] text-atlas-ink mb-1 line-clamp-2 sm:line-clamp-1">
            {title}
          </div>
          <div className="text-xs text-atlas-muted flex items-center gap-1.5 min-w-0">
            {lastLessonTitle ? (
              <>
                <span className="shrink-0">Última:</span>
                <strong className="font-medium text-atlas-ink truncate">
                  {lastLessonTitle}
                </strong>
                {lastTimestamp && (
                  <>
                    <span className="text-atlas-muted-2">·</span>
                    <span className="font-mono text-atlas-warn-deep shrink-0">
                      {lastTimestamp}
                    </span>
                  </>
                )}
              </>
            ) : lastMeta ? (
              <span className="font-mono text-[11px] text-atlas-muted-2 truncate">
                {lastMeta}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile: linha 2 — progresso full-width */}
      <div className="flex flex-col gap-1.5 mt-3 sm:mt-0">
        <div className="flex justify-between font-mono text-[11px] text-atlas-muted">
          <span className="atlas-num">
            <strong className="font-medium text-atlas-ink">{doneStr}</strong> /{" "}
            {totalStr}
          </span>
          <span className="atlas-num">
            <strong className="font-medium text-atlas-ink">
              {progressPercent}%
            </strong>
          </span>
        </div>
        <div className="h-0.5 bg-atlas-line rounded-sm overflow-hidden relative">
          <div
            className={cn(
              "absolute left-0 top-0 h-full bg-atlas-primary",
              progressPercent >= 50 && "bg-atlas-warn",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Mobile: linha 3 — CTA full-width / Desktop: coluna direita */}
      <div className="flex justify-stretch sm:justify-end mt-3 sm:mt-0">
        <span
          className={cn(
            "bg-atlas-primary text-white border border-atlas-primary",
            "rounded-sm px-2.5 h-9 sm:h-8 text-xs font-medium",
            "inline-flex items-center justify-center gap-1.5 transition-colors",
            "w-full sm:w-auto",
            "group-hover:bg-atlas-primary-2 group-hover:border-atlas-primary-2",
          )}
        >
          Retomar
          <Play className="size-3" fill="currentColor" />
        </span>
      </div>
    </Link>
  );
}
