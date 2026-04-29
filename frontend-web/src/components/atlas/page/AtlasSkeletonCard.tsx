import * as React from "react";

export function AtlasSkeletonCard() {
  return (
    <div className="bg-atlas-surface border border-atlas-line rounded-md overflow-hidden">
      <div className="aspect-[16/10] bg-atlas-surface-2 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="px-4 pt-3.5 pb-4 space-y-2">
        <div className="h-[9px] bg-atlas-surface-2 rounded-sm w-2/5 relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="h-[9px] bg-atlas-surface-2 rounded-sm relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="h-[9px] bg-atlas-surface-2 rounded-sm w-3/4 relative overflow-hidden">
          <Shimmer />
        </div>
      </div>
      <style>{`
        @keyframes atlas-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function Shimmer() {
  return (
    <div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
      style={{ animation: "atlas-shimmer 1.6s infinite" }}
    />
  );
}
