"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const AtlasSheet = DialogPrimitive.Root;
export const AtlasSheetTrigger = DialogPrimitive.Trigger;
export const AtlasSheetClose = DialogPrimitive.Close;
export const AtlasSheetTitle = DialogPrimitive.Title;
export const AtlasSheetDescription = DialogPrimitive.Description;

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content>;

interface AtlasSheetContentProps
  extends Omit<DialogContentProps, "title"> {
  /** Altura percentual do viewport. Default 78vh */
  height?: string;
  /** Mostra botão close no canto superior direito */
  showClose?: boolean;
  /** Título visível (renderizado como heading + atribuído ao DialogTitle) */
  title?: React.ReactNode;
  /** Caps acima do título */
  metaLabel?: string;
}

export function AtlasSheetContent({
  className,
  children,
  height = "78vh",
  showClose = true,
  title,
  metaLabel,
  ...props
}: AtlasSheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50",
          "bg-[rgb(10_10_10_/_0.45)] backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "duration-200",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed bottom-0 inset-x-0 z-50",
          "bg-atlas-bg rounded-t-lg",
          "shadow-[0_-10px_40px_rgba(0,0,0,0.08)]",
          "flex flex-col overflow-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "duration-300",
          "pb-[env(safe-area-inset-bottom)]",
          className,
        )}
        style={{ height, ...(props.style ?? {}) }}
        {...props}
      >
        <div
          className="w-[42px] h-1 bg-atlas-line-strong rounded-full mx-auto mt-2.5 mb-2 shrink-0"
          aria-hidden
        />

        {(title || metaLabel || showClose) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 border-b border-atlas-line shrink-0">
            <div className="min-w-0 flex-1">
              {metaLabel && (
                <div className="atlas-caps text-atlas-muted mb-1">
                  {metaLabel}
                </div>
              )}
              {title && (
                <DialogPrimitive.Title className="font-serif text-[16px] font-medium tracking-[-0.005em] leading-[1.25] text-atlas-ink line-clamp-2">
                  {title}
                </DialogPrimitive.Title>
              )}
            </div>
            {showClose && (
              <DialogPrimitive.Close
                aria-label="Fechar"
                className="size-8 shrink-0 rounded-sm flex items-center justify-center text-atlas-muted hover:text-atlas-ink hover:bg-atlas-surface-2 transition-colors"
              >
                <X className="size-4" strokeWidth={1.75} />
              </DialogPrimitive.Close>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
