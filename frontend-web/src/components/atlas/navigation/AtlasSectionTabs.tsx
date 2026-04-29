"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionTab {
  id: string;
  label: string;
  count?: number;
}

interface AtlasSectionTabsProps {
  tabs: SectionTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function AtlasSectionTabs({
  tabs,
  activeId,
  onChange,
  className,
}: AtlasSectionTabsProps) {
  return (
    <div
      className={cn(
        // Mobile: scroll horizontal com snap pra evitar wrap em narrow com 4+ tabs
        // Desktop: linha única
        "flex gap-0 border-b border-atlas-line mb-[18px] sm:mb-[22px]",
        "overflow-x-auto sm:overflow-visible scrollbar-hide",
        "-mx-5 px-5 sm:mx-0 sm:px-0",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 pt-2.5 pb-3 text-[13px] font-medium shrink-0",
              "border-b-2 -mb-px inline-flex items-center gap-2 whitespace-nowrap",
              "transition-colors duration-150",
              active
                ? "text-atlas-ink border-atlas-primary"
                : "text-atlas-muted border-transparent hover:text-atlas-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "font-mono text-[10.5px] px-1.5 py-px rounded-sm atlas-num",
                  active
                    ? "text-atlas-primary-2 bg-atlas-primary-soft"
                    : "text-atlas-muted-2 bg-atlas-surface-2",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
