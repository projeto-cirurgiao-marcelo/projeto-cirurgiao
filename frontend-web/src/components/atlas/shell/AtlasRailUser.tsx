"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasRailUserProps {
  /** Iniciais ou nome curto pra avatar fallback */
  initials: string;
  name: string;
  role?: string;
  /** Foto de perfil URL (opcional) */
  photoUrl?: string | null;
  /** Trigger pro dropdown menu — passado pelo container */
  onClick?: () => void;
  collapsed?: boolean;
  /** Slot direita (ex: chevron / menu trigger) */
  trailing?: React.ReactNode;
  className?: string;
}

export function AtlasRailUser({
  initials,
  name,
  role,
  photoUrl,
  onClick,
  collapsed = false,
  trailing,
  className,
}: AtlasRailUserProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5",
        "hover:bg-atlas-surface-2 transition-colors text-left",
        className,
      )}
    >
      <div className="size-7 shrink-0 rounded-full bg-atlas-primary text-white flex items-center justify-center text-[11px] font-semibold tracking-[0.02em] overflow-hidden">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div
        className={cn(
          "flex-1 min-w-0 transition-opacity duration-200",
          collapsed && "opacity-0 pointer-events-none w-0",
        )}
      >
        <div className="text-[13px] font-medium text-atlas-ink truncate">
          {name}
        </div>
        {role && (
          <div className="text-[11px] text-atlas-muted truncate">{role}</div>
        )}
      </div>
      {!collapsed && trailing}
    </button>
  );
}
