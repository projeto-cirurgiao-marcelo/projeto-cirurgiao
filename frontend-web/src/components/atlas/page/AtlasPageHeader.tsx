import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasPageHeaderProps {
  metaLabel: string;
  title: string;
  titleEm?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function AtlasPageHeader({
  metaLabel,
  title,
  titleEm,
  actions,
  children,
  className,
}: AtlasPageHeaderProps) {
  return (
    <div
      className={cn(
        "px-5 sm:px-7 pt-5 sm:pt-7 pb-[18px] sm:pb-[22px] border-b border-atlas-line bg-atlas-bg",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6 mb-4 sm:mb-[18px]">
        <div className="min-w-0">
          <div className="atlas-caps text-atlas-muted mb-1.5">{metaLabel}</div>
          <h1 className="font-serif text-[22px] sm:text-[26px] font-medium tracking-[-0.015em] leading-[1.15] text-atlas-ink">
            {title}
            {titleEm && (
              <>
                {" "}
                <em className="italic font-normal text-atlas-muted">
                  {titleEm}
                </em>
              </>
            )}
          </h1>
        </div>
        {actions && (
          <div className="flex gap-2 shrink-0 items-center flex-wrap">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
