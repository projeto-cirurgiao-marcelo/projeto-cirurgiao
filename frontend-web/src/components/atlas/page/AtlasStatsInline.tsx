import * as React from "react";
import { cn } from "@/lib/utils";

export interface InlineStat {
  /** Valor principal — string formatada. "3", "62%", "182h" */
  value: string;
  /** Label em caps abaixo do valor */
  label: string;
  /** "serif" (padrão, números inteiros) ou "mono" (tempos, %) */
  format?: "serif" | "mono";
  /** Parte secundária do valor, em muted (ex: "/ 24" em "3 / 24") */
  total?: string;
}

interface AtlasStatsInlineProps {
  stats: InlineStat[];
  className?: string;
}

export function AtlasStatsInline({ stats, className }: AtlasStatsInlineProps) {
  return (
    <div
      className={cn(
        // Mobile: 2-col grid sem border-r vertical (usa border-t entre rows naturalmente)
        // Desktop: flex linear com border-r entre stats
        "pt-[14px] sm:pt-[18px] border-t border-atlas-line",
        "grid grid-cols-2 gap-x-4 gap-y-4 sm:flex sm:gap-0",
        className,
      )}
    >
      {stats.map((stat, i) => (
        <div
          key={`${stat.label}-${i}`}
          className={cn(
            "min-w-0",
            // Desktop: flex-1 + border-r entre stats
            "sm:flex-1",
            i < stats.length - 1 && "sm:border-r sm:border-atlas-line sm:pr-7 sm:mr-7",
          )}
        >
          <div
            className={cn(
              "text-[18px] sm:text-[22px] font-medium tracking-[-0.01em] leading-[1.1] mb-1 atlas-num",
              stat.format === "mono" ? "font-mono" : "font-serif",
            )}
          >
            {stat.value}
            {stat.total && (
              <span className="text-atlas-muted-2 font-normal"> {stat.total}</span>
            )}
          </div>
          <div className="atlas-caps text-atlas-muted truncate">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
