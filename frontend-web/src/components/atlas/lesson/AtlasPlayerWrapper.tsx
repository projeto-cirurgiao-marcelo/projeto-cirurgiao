import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasPlayerWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper visual para o video player. Envolve o HlsVideoPlayer (ou iframe)
 * no shell preto Atlas — bg #0A0A0A + border 1px line + sombra hairline.
 * Não toca lógica do player.
 */
export function AtlasPlayerWrapper({
  children,
  className,
}: AtlasPlayerWrapperProps) {
  return (
    <div
      className={cn(
        "relative aspect-video rounded-md overflow-hidden bg-[#0A0A0A]",
        "shadow-[0_1px_0_rgba(0,0,0,0.04),0_0_0_1px_rgb(var(--atlas-line))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
