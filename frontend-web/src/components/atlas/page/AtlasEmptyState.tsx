import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AtlasEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: AtlasEmptyStateProps) {
  return (
    <div
      className={cn(
        "px-5 sm:px-7 pt-10 sm:pt-14 pb-12 sm:pb-16 text-center",
        "bg-atlas-surface border border-dashed border-atlas-line rounded-md",
        className,
      )}
    >
      <div className="size-12 mx-auto mb-[18px] text-atlas-muted-2 flex items-center justify-center">
        <Icon className="size-12" strokeWidth={1.25} />
      </div>
      <h3 className="font-serif text-[17px] font-medium tracking-[-0.005em] mb-1.5 text-atlas-ink">
        {title}
      </h3>
      {description && (
        <p className="text-atlas-muted text-[13px] max-w-[360px] mx-auto mb-[18px] leading-[1.55]">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
