"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StickyAction {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Marca tom (warn = "concluído", primary = "próxima") */
  tone?: "default" | "primary" | "success" | "warn";
}

interface AtlasStickyActionsProps {
  actions: StickyAction[];
  className?: string;
}

/**
 * Barra fixa inferior mobile. Subs do antigo "fixed bottom-0 ... bg-white border-t-2".
 */
export function AtlasStickyActions({
  actions,
  className,
}: AtlasStickyActionsProps) {
  return (
    <div
      className={cn(
        "sm:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-atlas-surface border-t border-atlas-line",
        "shadow-[0_-1px_0_rgb(var(--atlas-line))]",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <div className="flex items-center justify-between px-2 py-1.5 gap-1">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-sm",
                "transition-colors duration-150",
                a.disabled && "opacity-40",
                !a.disabled && "hover:bg-atlas-surface-2",
                a.tone === "primary" &&
                  !a.disabled &&
                  "text-atlas-primary-2",
                a.tone === "success" &&
                  !a.disabled &&
                  "text-atlas-success",
                a.tone === "warn" &&
                  !a.disabled &&
                  "text-atlas-warn-deep",
                (!a.tone || a.tone === "default") && "text-atlas-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              <span className="text-[10px] font-medium">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
