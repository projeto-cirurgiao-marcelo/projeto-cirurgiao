"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AtlasCourseThumb,
  type AtlasCourseStatus,
  type AtlasCourseThumbVariant,
} from "./AtlasCourseThumb";

interface AtlasCourseCardProps {
  href: string;
  title: string;
  category: string;
  instructor?: string;
  lessonsCount: number;
  totalDuration?: string;

  /** Status do curso para o estudante */
  status: AtlasCourseStatus;
  /** % de progresso (0–100). Obrigatório se status !== "new" */
  progressPercent?: number;
  /** "3 / 5" — fração de aulas completadas */
  lessonsProgress?: string;
  /** Data de conclusão formatada (apenas se completed) */
  completedAt?: string;
  /** Variant visual da thumb (cor de gradient) */
  thumbVariant?: AtlasCourseThumbVariant;
  thumbImageUrl?: string;

  className?: string;
}

export function AtlasCourseCard({
  href,
  title,
  category,
  instructor,
  lessonsCount,
  totalDuration,
  status,
  progressPercent,
  lessonsProgress,
  completedAt,
  thumbVariant = "default",
  thumbImageUrl,
  className,
}: AtlasCourseCardProps) {
  const ctaLabel =
    status === "new" && progressPercent === undefined
      ? "Matricular"
      : "Iniciar curso";

  return (
    <Link
      href={href}
      className={cn(
        "group bg-atlas-surface border border-atlas-line rounded-md overflow-hidden",
        "flex flex-col cursor-pointer transition-colors duration-150",
        "hover:bg-atlas-surface-2",
        className,
      )}
    >
      <AtlasCourseThumb
        title={title}
        variant={thumbVariant}
        status={status}
        imageUrl={thumbImageUrl}
      />

      <div className="px-4 pt-3.5 pb-4 flex-1 flex flex-col">
        <div className="font-mono text-[10px] text-atlas-muted tracking-[0.04em] mb-2 flex items-center gap-1.5 uppercase">
          <span className="truncate">{category}</span>
          <span className="text-atlas-muted-2">·</span>
          <span className="atlas-num">{lessonsCount} aulas</span>
          {totalDuration && (
            <>
              <span className="text-atlas-muted-2">·</span>
              <span className="atlas-num">{totalDuration}</span>
            </>
          )}
        </div>

        <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] leading-[1.3] text-atlas-ink mb-1 line-clamp-2">
          {title}
        </h3>

        {instructor && (
          <div className="text-xs text-atlas-muted mb-3 truncate">
            {instructor}
          </div>
        )}

        {status === "new" ? (
          <div className="mt-auto pt-3 border-t border-atlas-line flex items-center justify-between text-xs">
            <span className="font-mono text-atlas-muted atlas-num">
              {lessonsCount} aulas
            </span>
            <span className="text-atlas-primary-2 font-medium inline-flex items-center gap-1">
              {ctaLabel}
              <ArrowRight className="size-3" strokeWidth={2} />
            </span>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-atlas-line">
            <div className="flex justify-between font-mono text-[11px] text-atlas-muted mb-1.5">
              <span className="atlas-num">
                <strong className="text-atlas-ink font-medium">
                  {lessonsProgress?.split(" / ")[0] ?? "0"}
                </strong>{" "}
                / {lessonsProgress?.split(" / ")[1] ?? lessonsCount} aulas
              </span>
              <span className="atlas-num">
                <strong className="text-atlas-ink font-medium">
                  {progressPercent ?? 0}%
                </strong>
              </span>
            </div>
            <div className="h-0.5 bg-atlas-line rounded-sm overflow-hidden relative">
              <div
                className={cn(
                  "absolute left-0 top-0 h-full rounded-sm",
                  status === "completed" && "bg-atlas-success",
                  status === "in-progress" &&
                    ((progressPercent ?? 0) >= 50
                      ? "bg-atlas-warn"
                      : "bg-atlas-primary"),
                )}
                style={{ width: `${progressPercent ?? 0}%` }}
              />
            </div>
            {completedAt && (
              <div className="mt-2 pt-2 border-t border-atlas-line font-mono text-[10px] text-atlas-muted tracking-[0.04em] text-center uppercase atlas-num">
                Concluído em {completedAt}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
