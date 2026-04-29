"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RailItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Override do match — quando ausente, exact match ou prefix com slash */
  matchPrefix?: string;
}

export interface RailSection {
  /** Caps label do grupo. Vazio/null = sem header */
  label?: string;
  items: RailItem[];
}

interface AtlasRailProps {
  /** "Projeto Cirurgião" — title serif renderizado quando expanded */
  brandTitle?: React.ReactNode;
  /** Href do brand mark */
  brandHref: string;
  /** Sections ordenadas */
  sections: RailSection[];
  /** Estado collapsed externo (useSidebarStore) */
  collapsed: boolean;
  onToggle: () => void;
  /** Footer slot — tipicamente AtlasRailUser */
  footer?: React.ReactNode;
  /** Click em item dispara callback (usado em mobile drawer pra fechar) */
  onItemClick?: () => void;
  className?: string;
}

const COLLAPSED_W = 80; // 5rem (w-20) — alinhado a md:ml-20 do layout
const EXPANDED_W = 240; // 15rem (w-60) — alinhado a md:ml-60 do layout

export function AtlasRail({
  brandTitle = (
    <>
      Projeto <em className="italic font-normal text-atlas-muted">Cirurgião</em>
    </>
  ),
  brandHref,
  sections,
  collapsed,
  onToggle,
  footer,
  onItemClick,
  className,
}: AtlasRailProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative bg-atlas-surface border-r border-atlas-line",
        "transition-[width] duration-300 ease-out",
        "h-full",
        className,
      )}
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
    >
      {/* Inner container — overflow hidden pra clipar texto durante collapse animation */}
      <div className="flex flex-col h-full overflow-hidden">
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-atlas-line shrink-0",
          "h-[60px]",
          collapsed ? "justify-center px-3" : "px-4",
        )}
      >
        <Link
          href={brandHref}
          className="flex items-center gap-2.5 min-w-0"
          onClick={onItemClick}
        >
          <div className="size-7 shrink-0 rounded-sm bg-atlas-primary flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="size-4 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 20l8-16 8 16" />
              <path d="M8 14h8" />
            </svg>
          </div>
          <span
            className={cn(
              "font-serif text-[15px] font-semibold tracking-[-0.01em] text-atlas-ink whitespace-nowrap",
              "transition-opacity duration-200",
              collapsed && "opacity-0 pointer-events-none w-0 overflow-hidden",
            )}
          >
            {brandTitle}
          </span>
        </Link>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section, si) => (
          <div key={`${section.label ?? "sec"}-${si}`} className="px-3 pt-3 pb-1">
            {section.label && (
              <div
                className={cn(
                  "atlas-caps text-atlas-muted-2 px-2 pb-2",
                  "transition-opacity duration-200 whitespace-nowrap",
                  collapsed && "opacity-0 pointer-events-none h-0 pb-0 overflow-hidden",
                )}
              >
                {section.label}
              </div>
            )}
            <ul className="space-y-px">
              {section.items.map((item) => {
                const Icon = item.icon;
                const matchHref = item.matchPrefix ?? item.href;
                const isActive =
                  pathname === item.href ||
                  pathname === matchHref ||
                  pathname.startsWith(matchHref + "/");
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      onClick={onItemClick}
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-2 rounded-sm relative",
                        "text-[13.5px] whitespace-nowrap",
                        "transition-colors duration-150",
                        isActive
                          ? "bg-atlas-primary-soft text-atlas-primary-2"
                          : "text-atlas-ink-2 hover:bg-atlas-surface-2",
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-atlas-primary rounded-sm" />
                      )}
                      <Icon
                        className={cn(
                          "size-[17px] shrink-0",
                          isActive
                            ? "text-atlas-primary"
                            : "text-atlas-muted",
                        )}
                        strokeWidth={1.5}
                      />
                      <span
                        className={cn(
                          "min-w-0 truncate transition-opacity duration-200",
                          collapsed && "opacity-0 pointer-events-none w-0",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-atlas-line shrink-0">{footer}</div>
      )}
      </div>

      {/* Toggle pull-tab — flutua na borda direita do rail, fora do overflow inner */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className={cn(
          "hidden md:flex absolute z-20 top-[14px] -right-3",
          "size-6 rounded-full bg-atlas-surface border border-atlas-line-strong",
          "items-center justify-center text-atlas-muted",
          "shadow-[0_2px_4px_rgba(0,0,0,0.04)]",
          "hover:text-atlas-ink hover:border-atlas-ink-2 transition-colors",
        )}
      >
        <ChevronLeft
          className={cn(
            "size-3 transition-transform duration-300",
            collapsed && "rotate-180",
          )}
          strokeWidth={2.25}
        />
      </button>
    </aside>
  );
}
