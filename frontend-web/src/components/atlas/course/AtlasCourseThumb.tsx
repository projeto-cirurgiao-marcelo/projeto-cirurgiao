import * as React from "react";
import { cn } from "@/lib/utils";

export type AtlasCourseThumbVariant =
  | "default"
  | "alt"
  | "alt2"
  | "alt3"
  | "alt4";
export type AtlasCourseStatus = "new" | "in-progress" | "completed";

interface AtlasCourseThumbProps {
  title: string;
  variant?: AtlasCourseThumbVariant;
  status?: AtlasCourseStatus;
  /** Imagem real do curso, se houver. Tem prioridade sobre o placeholder. */
  imageUrl?: string;
  className?: string;
}

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

export function AtlasCourseThumb({
  title,
  variant = "default",
  status,
  imageUrl,
  className,
}: AtlasCourseThumbProps) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] border-b border-atlas-line overflow-hidden",
        "bg-gradient-to-br",
        VARIANT_GRADIENT[variant],
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
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
            <span className="font-serif font-medium text-[17px] tracking-[-0.005em] leading-[1.2] text-white/85 line-clamp-3">
              {title}
            </span>
          </div>
        </>
      )}

      {status && (
        <div
          className={cn(
            "absolute top-2.5 left-2.5",
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
      )}
    </div>
  );
}
