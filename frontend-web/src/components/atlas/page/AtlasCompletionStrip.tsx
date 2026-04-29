import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasCompletionStripProps {
  title: string;
  description?: string;
  onDismiss?: () => void;
  variant?: "success" | "info";
  className?: string;
}

export function AtlasCompletionStrip({
  title,
  description,
  onDismiss,
  variant = "success",
  className,
}: AtlasCompletionStripProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-[18px] px-4 sm:px-5 py-4 mb-6 sm:mb-7",
        "bg-atlas-surface border border-atlas-line rounded-md",
        variant === "success" && "border-l-[3px] border-l-atlas-success",
        variant === "info" && "border-l-[3px] border-l-atlas-primary",
        className,
      )}
    >
      <div
        className={cn(
          "size-9 shrink-0 rounded-full flex items-center justify-center",
          variant === "success" && "bg-atlas-success/10 text-atlas-success",
          variant === "info" && "bg-atlas-primary/10 text-atlas-primary",
        )}
      >
        <Check className="size-4" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink mb-0.5">
          {title}
        </div>
        {description && (
          <div className="text-atlas-muted text-[12.5px]">{description}</div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-atlas-muted hover:text-atlas-ink hover:bg-atlas-surface-2 px-3 h-8 text-xs rounded-sm transition-colors self-start sm:self-auto shrink-0"
        >
          Dispensar
        </button>
      )}
    </div>
  );
}
