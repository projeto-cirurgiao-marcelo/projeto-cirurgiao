"use client";

import * as React from "react";
import { ListOrdered, Loader2 } from "lucide-react";
import {
  AtlasCard,
  AtlasCardContent,
  AtlasCardHeader,
  AtlasCardTitle,
} from "@/components/atlas/primitives/AtlasCard";
import { cn } from "@/lib/utils";

interface AtlasChaptersListProps {
  /** Default "Capítulos" */
  title?: string;
  count?: number;
  loading?: boolean;
  hint?: string;
  compact?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AtlasChaptersList({
  title = "Capítulos",
  count,
  loading = false,
  hint,
  compact = false,
  children,
  className,
}: AtlasChaptersListProps) {
  return (
    <AtlasCard className={className}>
      <AtlasCardHeader className={cn(compact && "px-4 py-3")}>
        <div className="flex items-center gap-2.5 min-w-0">
          <ListOrdered
            className="size-4 text-atlas-muted shrink-0"
            strokeWidth={1.5}
          />
          <AtlasCardTitle className={cn(compact && "text-[14px]")}>
            {title}
          </AtlasCardTitle>
          {count !== undefined && count > 0 && (
            <span className="atlas-mono text-[10.5px] text-atlas-muted atlas-num">
              {count}
            </span>
          )}
        </div>
      </AtlasCardHeader>
      <AtlasCardContent className={cn(compact ? "px-4 py-2" : "px-[22px] py-2")}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              className="size-5 animate-spin text-atlas-muted-2"
              strokeWidth={1.75}
            />
          </div>
        ) : React.Children.count(children) === 0 ? (
          hint ? (
            <p className="text-[12.5px] text-atlas-muted text-center py-6 leading-[1.55]">
              {hint}
            </p>
          ) : null
        ) : (
          children
        )}
      </AtlasCardContent>
    </AtlasCard>
  );
}
