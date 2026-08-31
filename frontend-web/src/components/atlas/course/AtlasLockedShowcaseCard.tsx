"use client";

import * as React from "react";
import { Lock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AtlasCourseThumb,
  type AtlasCourseThumbVariant,
} from "./AtlasCourseThumb";

interface AtlasLockedShowcaseCardProps {
  title: string;
  /** Nº de aulas da vitrine (publicadas). */
  lessonsCount: number;
  /** URL de checkout TheMembers (derivada do produto). null = sem compra ainda. */
  checkoutUrl: string | null;
  thumbVariant?: AtlasCourseThumbVariant;
  thumbImageUrl?: string;
  className?: string;
}

/**
 * Card de "provocação": vitrine que o aluno ainda NÃO possui. Aponta para o
 * checkout TheMembers (nova aba). Sem checkoutUrl vinculado, o card aparece
 * mas sem ação (produto ainda não vendável).
 */
export function AtlasLockedShowcaseCard({
  title,
  lessonsCount,
  checkoutUrl,
  thumbVariant = "default",
  thumbImageUrl,
  className,
}: AtlasLockedShowcaseCardProps) {
  const inner = (
    <>
      <div className="relative">
        <AtlasCourseThumb
          title={title}
          variant={thumbVariant}
          status="new"
          imageUrl={thumbImageUrl}
        />
        <div className="absolute top-2 right-2 size-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Lock className="size-3.5 text-white" strokeWidth={2} />
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-4 flex-1 flex flex-col">
        <div className="font-mono text-[10px] text-atlas-muted tracking-[0.04em] mb-2 flex items-center gap-1.5 uppercase">
          <span>Bloqueado</span>
          <span className="text-atlas-muted-2">·</span>
          <span className="atlas-num">{lessonsCount} aulas</span>
        </div>

        <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] leading-[1.3] text-atlas-ink mb-1 line-clamp-2">
          {title}
        </h3>

        <div className="mt-auto pt-3 border-t border-atlas-line flex items-center justify-between text-xs">
          <span className="font-mono text-atlas-muted atlas-num">
            {lessonsCount} aulas
          </span>
          {checkoutUrl ? (
            <span className="text-atlas-primary-2 font-medium inline-flex items-center gap-1">
              Desbloquear
              <ArrowUpRight className="size-3" strokeWidth={2} />
            </span>
          ) : (
            <span className="text-atlas-muted font-medium">Em breve</span>
          )}
        </div>
      </div>
    </>
  );

  const base = cn(
    "group bg-atlas-surface border border-atlas-line rounded-md overflow-hidden flex flex-col transition-colors duration-150",
    checkoutUrl && "cursor-pointer hover:bg-atlas-surface-2",
    className,
  );

  if (checkoutUrl) {
    return (
      <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className={base}>
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}
