import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LessonStat {
  icon?: LucideIcon;
  label: string;
  value: string;
  /** Se true, value usa font-mono tabular */
  mono?: boolean;
}

interface AtlasLessonStatsProps {
  stats: LessonStat[];
  className?: string;
}

export function AtlasLessonStats({ stats, className }: AtlasLessonStatsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-6 gap-y-2 px-0 py-3",
        "border-y border-atlas-line text-xs text-atlas-muted",
        className,
      )}
    >
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={`${s.label}-${i}`} className="flex items-center gap-1.5">
            {Icon && (
              <Icon
                className="size-3.5 text-atlas-muted-2"
                strokeWidth={1.75}
              />
            )}
            <span>{s.label}</span>
            <strong
              className={cn(
                "font-medium text-atlas-ink atlas-num",
                s.mono && "font-mono",
              )}
            >
              {s.value}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
