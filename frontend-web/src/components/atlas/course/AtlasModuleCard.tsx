"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AtlasCourseStatus,
  type AtlasCourseThumbVariant,
} from "./AtlasCourseThumb";

const VARIANT_GRADIENT: Record<AtlasCourseThumbVariant, string> = {
  default: "from-[#0F172A] to-[#1E3A8A]",
  alt: "from-[#1E293B] to-[#047857]",
  alt2: "from-[#1E293B] to-[#92400E]",
  alt3: "from-[#0F172A] to-[#7F1D1D]",
  alt4: "from-[#1E293B] to-[#1E40AF]",
};

const STATUS_LABEL: Record<AtlasCourseStatus, string> = {
  "in-progress": "Em curso",
  completed: "Concluído",
  new: "Novo",
};

interface AtlasModuleCardProps {
  href: string;
  /** Número do módulo (1-based) — exibido como "Módulo 01" caps */
  moduleIndex: number;
  /** Título do módulo (serif) */
  title: string;
  /** Descrição opcional do módulo */
  description?: string | null;
  /** Total de aulas (vídeos) no módulo */
  totalLessons: number;
  /** Aulas concluídas (0..total) */
  completedLessons: number;
  /** % de progresso (0-100) */
  progressPercent: number;
  /** Status derivado pra badge de canto */
  status: AtlasCourseStatus;
  /** Variant visual da thumb (cor de gradient) */
  thumbVariant?: AtlasCourseThumbVariant;
  /** Imagem real do módulo (prioridade sobre placeholder) */
  thumbImageUrl?: string | null;
  className?: string;
}

export function AtlasModuleCard({
  href,
  moduleIndex,
  title,
  description,
  totalLessons,
  completedLessons,
  progressPercent,
  status,
  thumbVariant = "default",
  thumbImageUrl,
  className,
}: AtlasModuleCardProps) {
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
      {/* Thumb */}
      <div
        className={cn(
          "relative aspect-[16/10] border-b border-atlas-line overflow-hidden",
          "bg-gradient-to-br",
          VARIANT_GRADIENT[thumbVariant],
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
              className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(47,128,237,0.25)_0%,transparent_50%),radial-gradient(circle_at_75%_70%,rgba(255,255,255,0.06)_0%,transparent_40%)]"
            />
            <div className="absolute inset-0 flex items-center justify-center text-center px-4">
              <BookOpen
                className="size-9 text-white/30"
                strokeWidth={1.25}
                aria-hidden
              />
            </div>
          </>
        )}

        {/* Badge "Módulo NN" no topo esquerda */}
        <div
          className={cn(
            "absolute top-2.5 left-2.5",
            "font-mono text-[10px] uppercase tracking-[0.06em]",
            "px-2 py-0.5 bg-black/50 backdrop-blur-md text-white",
            "rounded-[2px] inline-flex items-center gap-1",
          )}
        >
          Módulo {String(moduleIndex).padStart(2, "0")}
        </div>

        {/* Status badge no topo direita */}
        <div
          className={cn(
            "absolute top-2.5 right-2.5",
            "font-mono text-[10px] uppercase tracking-[0.06em]",
            "px-2 py-0.5 bg-black/50 backdrop-blur-md text-white",
            "rounded-[2px] inline-flex items-center gap-1.5",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              status === "in-progress" && "bg-atlas-warn",
              status === "completed" && "bg-atlas-success",
              status === "new" && "bg-atlas-primary",
            )}
          />
          {STATUS_LABEL[status]}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4 flex-1 flex flex-col">
        <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] leading-[1.3] text-atlas-ink mb-1 line-clamp-2">
          {title}
        </h3>

        {description && (
          <p className="text-[13px] text-atlas-muted leading-[1.55] line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Progress row */}
        <div className="mt-auto pt-3 border-t border-atlas-line">
          <div className="flex justify-between font-mono text-[11px] text-atlas-muted mb-1.5">
            <span className="atlas-num">
              <strong className="text-atlas-ink font-medium">
                {completedLessons}
              </strong>{" "}
              / {totalLessons} aulas
            </span>
            <span className="atlas-num">
              <strong className="text-atlas-ink font-medium">
                {progressPercent}%
              </strong>
            </span>
          </div>
          <div className="h-0.5 bg-atlas-line rounded-sm overflow-hidden relative">
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-sm",
                status === "completed" && "bg-atlas-success",
                status === "in-progress" &&
                  (progressPercent >= 50
                    ? "bg-atlas-warn"
                    : "bg-atlas-primary"),
                status === "new" && "bg-atlas-line-strong",
              )}
              style={{ width: `${Math.max(progressPercent, status === "new" ? 0 : 2)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
