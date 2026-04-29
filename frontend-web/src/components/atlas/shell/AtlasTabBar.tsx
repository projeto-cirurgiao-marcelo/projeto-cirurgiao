"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabBarItem {
  /** ID único — usado como key */
  id: string;
  /** Label curta exibida abaixo do ícone (≤ 10 chars ideal) */
  label: string;
  href: string;
  icon: LucideIcon;
  /** Override do match — quando ausente, exact match ou prefix com "/" */
  matchPrefix?: string;
}

interface AtlasTabBarProps {
  /** Itens da bar — máximo 5 slots (acima disso ergonomia degrada) */
  items: TabBarItem[];
  /** Esconde a bar quando true. Útil para rotas que assumem barra contextual (watch). */
  hidden?: boolean;
  /** Classes extras */
  className?: string;
}

/**
 * Bottom tab bar global mobile (< md). Substitui o drawer hamburger
 * em /student/**. Hidden em rotas com barra contextual (passar `hidden=true`).
 *
 * Spec: docs/atlas/reference-mobile.html linhas 481-502.
 */
export function AtlasTabBar({
  items,
  hidden = false,
  className,
}: AtlasTabBarProps) {
  const pathname = usePathname();

  if (hidden) return null;
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-atlas-surface/92 backdrop-blur-xl",
        "border-t border-atlas-line",
        "flex items-stretch px-2 pt-1.5",
        "pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const matchHref = item.matchPrefix ?? item.href;
        const isActive =
          pathname === item.href ||
          pathname === matchHref ||
          pathname.startsWith(matchHref + "/");
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-end gap-1",
              "py-1.5 px-1 rounded-sm",
              "min-h-[44px]",
              "transition-colors duration-150",
              isActive
                ? "text-atlas-primary"
                : "text-atlas-muted hover:text-atlas-ink",
            )}
          >
            <Icon
              className="size-5"
              strokeWidth={isActive ? 1.9 : 1.5}
            />
            <span
              className={cn(
                "text-[10px] font-medium tracking-[0.01em] leading-none",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
