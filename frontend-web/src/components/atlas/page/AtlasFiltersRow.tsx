"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

interface AtlasFiltersRowProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  chips?: FilterChip[];
  activeChipId?: string;
  onChipClick?: (id: string) => void;
  trailing?: React.ReactNode;
  className?: string;
}

export function AtlasFiltersRow({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Filtrar...",
  chips = [],
  activeChipId,
  onChipClick,
  trailing,
  className,
}: AtlasFiltersRowProps) {
  return (
    <div
      className={cn(
        // Mobile: search ocupa primeira linha full-width; chips wrappam em segunda linha
        // Desktop: tudo inline com gap
        "flex flex-col sm:flex-row sm:items-center gap-2.5 mb-[18px]",
        className,
      )}
    >
      <div className="relative w-full sm:flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-atlas-muted"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={cn(
            "w-full bg-atlas-surface border border-atlas-line rounded-md",
            "py-2.5 pl-9 pr-3 text-[13px] text-atlas-ink placeholder:text-atlas-muted-2",
            "outline-none focus:border-atlas-ink-2 transition-colors duration-150",
          )}
        />
      </div>
      {chips.length > 0 && (
        <div
          className={cn(
            // Mobile: row scroll-x com snap pra evitar wrap quebrado / overflow vertical
            // Desktop: chips inline normais
            "flex gap-2 sm:gap-2.5",
            "overflow-x-auto sm:overflow-visible scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0",
            "scroll-snap-type-x mandatory",
          )}
        >
          {chips.map((chip) => {
            const active = chip.id === activeChipId;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChipClick?.(chip.id)}
                className={cn(
                  "px-3 py-1.5 rounded-sm border text-xs font-medium shrink-0",
                  "inline-flex items-center gap-1.5 transition-colors duration-150",
                  "scroll-snap-align-start",
                  active
                    ? "bg-atlas-primary-soft border-atlas-primary text-atlas-primary-2"
                    : "bg-atlas-surface border-atlas-line-strong text-atlas-muted hover:border-atlas-ink-2 hover:text-atlas-ink",
                )}
              >
                {chip.label}
                {chip.count !== undefined && (
                  <span className="font-mono text-[10.5px] opacity-70 atlas-num">
                    {chip.count}
                  </span>
                )}
              </button>
            );
          })}
          {trailing && <div className="shrink-0">{trailing}</div>}
        </div>
      )}
      {chips.length === 0 && trailing}
    </div>
  );
}
