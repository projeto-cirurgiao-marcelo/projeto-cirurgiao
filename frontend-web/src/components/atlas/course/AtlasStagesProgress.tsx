import * as React from "react";
import { cn } from "@/lib/utils";

export type StageStatus = "done" | "current" | "future" | "locked";

export interface Stage {
  num: number;
  name: string;
  /** "1 / 1 concluída" — texto livre */
  count: string;
  status: StageStatus;
}

interface AtlasStagesProgressProps {
  stages: Stage[];
  className?: string;
}

export function AtlasStagesProgress({
  stages,
  className,
}: AtlasStagesProgressProps) {
  return (
    <div
      className={cn(
        "flex pt-3.5 mt-[14px] border-t border-atlas-line",
        className,
      )}
    >
      {stages.map((stage, i) => (
        <div
          key={stage.num}
          className={cn(
            "flex-1 px-5",
            i > 0 && "border-l border-atlas-line",
            i === 0 && "pl-0",
          )}
        >
          <div className="atlas-mono text-[10.5px] text-atlas-muted-2 mb-1 tracking-[0.04em]">
            {String(stage.num).padStart(2, "0")}
          </div>
          <div
            className={cn(
              "flex items-center gap-2 text-[13px] font-medium mb-1.5",
              stage.status === "current" && "text-atlas-primary",
              stage.status === "locked" && "text-atlas-muted-2",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                stage.status === "done" && "bg-atlas-primary",
                stage.status === "current" &&
                  "bg-atlas-warn shadow-[0_0_0_3px_rgb(var(--atlas-warn-deep)/0.18)]",
                stage.status === "future" && "bg-atlas-line-strong",
                stage.status === "locked" && "bg-atlas-line-strong",
              )}
            />
            <span className="truncate">{stage.name}</span>
          </div>
          <div className="text-xs text-atlas-muted atlas-num">{stage.count}</div>
        </div>
      ))}
    </div>
  );
}
