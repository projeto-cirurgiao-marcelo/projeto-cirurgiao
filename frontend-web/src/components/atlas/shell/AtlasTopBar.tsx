"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AtlasTopBarProps {
  /** Crumb path. Último é tratado como current (sem href, font-medium) */
  breadcrumbs?: BreadcrumbItem[];
  /** Search visible. Default true */
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: (v: string) => void;
  /** Slot direita pra ícones (notifications, theme, user) */
  trailing?: React.ReactNode;
  className?: string;
}

export function AtlasTopBar({
  breadcrumbs = [],
  showSearch = true,
  searchPlaceholder = "Buscar aulas, módulos, técnicas…",
  searchValue,
  onSearchChange,
  onSearchSubmit,
  trailing,
  className,
}: AtlasTopBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 sm:gap-6 h-16 border-b border-atlas-line bg-atlas-bg",
        // Mobile: padding-left aumentado pra evitar sobreposição com hamburger fixed (left-3 top-3 size-9)
        "pl-14 pr-3 sm:px-8",
        className,
      )}
    >
      {breadcrumbs.length > 0 && (
        <nav
          className="flex items-center gap-2.5 text-[12.5px] text-atlas-muted min-w-0"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            const sep = i > 0 && (
              <span className="text-atlas-muted-2 shrink-0" aria-hidden>
                /
              </span>
            );
            if (isLast || !crumb.href) {
              return (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {sep}
                  <span
                    className={cn(
                      isLast
                        ? "text-atlas-ink font-medium truncate"
                        : "shrink-0",
                    )}
                  >
                    {crumb.label}
                  </span>
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={`${crumb.label}-${i}`}>
                {sep}
                <Link
                  href={crumb.href}
                  className="text-atlas-muted hover:text-atlas-ink transition-colors shrink-0"
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {showSearch && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.(searchValue ?? "");
          }}
          className={cn(
            // Mobile: ocupa flex-1 e centraliza o input — fica entre hamburger e trailing
            // Desktop: ml-auto + max-w-320 fixo (após breadcrumb)
            "flex-1 sm:flex-none sm:ml-auto",
            "flex justify-center sm:justify-end",
          )}
        >
          <div className="relative w-full max-w-[320px]">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-atlas-muted"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "w-full bg-atlas-surface border border-atlas-line rounded-md",
                "h-9 pl-9 pr-3 sm:pr-12 text-[13px] text-atlas-ink placeholder:text-atlas-muted-2",
                "outline-none focus:border-atlas-ink-2 transition-colors",
              )}
            />
            {/* ⌘K kbd hint — só desktop (em mobile não há atalho) */}
            <span
              className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 atlas-mono text-[10px] text-atlas-muted-2 border border-atlas-line px-1.5 py-px rounded-sm items-center"
              aria-hidden
            >
              ⌘K
            </span>
          </div>
        </form>
      )}

      {trailing && (
        <div className={cn("flex items-center gap-1", showSearch ? "" : "ml-auto")}>
          {trailing}
        </div>
      )}
    </div>
  );
}

/** Icon button reutilizável para slot trailing — bell / theme / etc. */
export function AtlasIconButton({
  children,
  badge,
  onClick,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  badge?: number;
  onClick?: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "relative size-9 rounded-sm flex items-center justify-center",
        "text-atlas-ink-2 hover:bg-atlas-surface-2 transition-colors",
        "[&>svg]:size-[17px]",
        className,
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 bg-atlas-accent text-white text-[9px] font-semibold rounded-full flex items-center justify-center font-mono">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
