"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RailItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Override do match — quando ausente, exact match ou prefix com slash */
  matchPrefix?: string;
  /** Força matching exato (`pathname === href`). Útil em rotas raiz tipo
   *  "/admin" que senão casariam com qualquer subrota via startsWith. */
  matchExact?: boolean;
}

export interface RailSection {
  /** Caps label do grupo. Vazio/null = sem header */
  label?: string;
  items: RailItem[];
}

interface AtlasRailProps {
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
    <motion.aside
      className={cn(
        "relative bg-atlas-surface border-r border-atlas-line",
        "h-full",
        className,
      )}
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{
        type: "tween",
        duration: 0.32,
        ease: [0.32, 0.72, 0, 1],
      }}
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
          className="flex items-center min-w-0"
          onClick={onItemClick}
          aria-label="Projeto Cirurgião"
        >
          <AnimatePresence mode="wait" initial={false}>
            {collapsed ? (
              <motion.div
                key="brand-collapsed"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex items-center"
              >
                <Image
                  src="/vaies.svg"
                  alt="Projeto Cirurgião"
                  width={32}
                  height={32}
                  priority
                  // dark: silhueta branca via filtro (marca azul vira branca; SVG já sem fundo)
                  className="size-8 shrink-0 object-contain rounded-md dark:brightness-0 dark:invert"
                />
              </motion.div>
            ) : (
              <motion.div
                key="brand-expanded"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-center"
              >
                {/* Versões claro/escuro da marca (SVGs oficiais), swap por CSS — sem flash de tema */}
                <Image
                  src="/logo-horizontal.svg"
                  alt="Projeto Cirurgião"
                  width={200}
                  height={28}
                  priority
                  className="h-9 w-auto object-contain dark:hidden"
                />
                <Image
                  src="/logo-horizontal-dark.svg"
                  alt="Projeto Cirurgião"
                  width={200}
                  height={28}
                  priority
                  className="hidden h-9 w-auto object-contain dark:block"
                />
              </motion.div>
            )}
          </AnimatePresence>
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
                const isActive = item.matchExact
                  ? pathname === item.href
                  : pathname === item.href ||
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
    </motion.aside>
  );
}
