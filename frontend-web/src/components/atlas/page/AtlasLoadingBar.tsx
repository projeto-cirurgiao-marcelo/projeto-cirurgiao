import * as React from "react";
import { cn } from "@/lib/utils";

export function AtlasLoadingBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-0.5 bg-atlas-line relative overflow-hidden rounded-sm",
        className,
      )}
      role="progressbar"
      aria-label="Carregando"
    >
      <div
        className="absolute top-0 h-full w-[30%] bg-atlas-primary"
        style={{
          animation: "atlas-loading 1.4s cubic-bezier(.2,.7,.2,1) infinite",
        }}
      />
      <style>{`
        @keyframes atlas-loading {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
