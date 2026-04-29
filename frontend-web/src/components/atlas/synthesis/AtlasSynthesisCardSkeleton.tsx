"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import {
  AtlasCard,
  AtlasCardContent,
  AtlasCardHeader,
  AtlasCardTitle,
} from "@/components/atlas/primitives/AtlasCard";

export function AtlasSynthesisCardSkeleton() {
  return (
    <AtlasCard>
      <AtlasCardHeader>
        <div className="flex items-center gap-2.5">
          <Sparkles
            className="size-4 text-atlas-muted-2"
            strokeWidth={1.5}
          />
          <AtlasCardTitle className="text-atlas-muted-2">
            Carregando síntese
          </AtlasCardTitle>
        </div>
      </AtlasCardHeader>
      <AtlasCardContent className="space-y-3">
        <SkeletonLine width="92%" />
        <SkeletonLine width="78%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="60%" />
      </AtlasCardContent>
      <style>{`
        @keyframes atlas-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </AtlasCard>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-3 rounded-sm bg-atlas-surface-2 relative overflow-hidden"
      style={{ width }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        style={{ animation: "atlas-shimmer 1.6s infinite" }}
      />
    </div>
  );
}
