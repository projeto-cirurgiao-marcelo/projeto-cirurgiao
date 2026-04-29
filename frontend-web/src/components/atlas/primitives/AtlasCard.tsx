import * as React from "react";
import { cn } from "@/lib/utils";

export function AtlasCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-atlas-surface border border-atlas-line rounded-md",
        className,
      )}
      {...props}
    />
  );
}

export function AtlasCardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-[22px] py-[14px]",
        "border-b border-atlas-line",
        className,
      )}
      {...props}
    />
  );
}

export function AtlasCardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        "font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink",
        className,
      )}
      {...props}
    />
  );
}

export function AtlasCardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-[22px] py-[18px]", className)} {...props} />;
}

export function AtlasCardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-[22px] py-[14px] border-t border-atlas-line",
        className,
      )}
      {...props}
    />
  );
}
