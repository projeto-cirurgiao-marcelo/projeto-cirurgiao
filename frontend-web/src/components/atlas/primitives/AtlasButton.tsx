"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const atlasButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-sm font-medium transition-colors duration-150",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atlas-primary",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-atlas-primary text-white border border-atlas-primary",
          "hover:bg-atlas-primary-2 hover:border-atlas-primary-2",
          "active:bg-atlas-primary-2",
        ],
        outline: [
          "bg-atlas-surface text-atlas-ink-2 border border-atlas-line-strong",
          "hover:bg-atlas-surface-2 hover:border-atlas-ink-2",
        ],
        ghost: [
          "bg-transparent text-atlas-muted border border-transparent",
          "hover:bg-atlas-surface-2 hover:text-atlas-ink",
        ],
      },
      size: {
        // Mobile: sm bumped pra h-9 (36px) — viola Apple HIG estrito 44px mas evita 32px
        // Desktop: sm = h-8 (32px) preserva density
        // Spec: docs/atlas/sprint-6-audit.md item 34
        sm: "h-9 sm:h-8 px-3 text-[12.5px] [&_svg]:size-3.5",
        md: "h-10 sm:h-9 px-3.5 text-[13px] [&_svg]:size-3.5",
        lg: "h-11 sm:h-10 px-4 text-sm [&_svg]:size-4",
        icon: "size-10 sm:size-9 [&_svg]:size-4",
        // icon-sm: mobile 36px, desktop 32px
        "icon-sm": "size-9 sm:size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export interface AtlasButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof atlasButtonVariants> {
  asChild?: boolean;
}

export const AtlasButton = React.forwardRef<HTMLButtonElement, AtlasButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(atlasButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
AtlasButton.displayName = "AtlasButton";

export { atlasButtonVariants };
