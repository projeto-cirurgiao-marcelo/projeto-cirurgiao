"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AtlasCourseThumb,
  type AtlasCourseThumbVariant,
} from "./AtlasCourseThumb";

interface AtlasLockedShowcaseCardProps {
  title: string;
  /** Slug da vitrine — o card abre `/student/showcases/[slug]?locked=1` (prévia). */
  slug: string;
  /** Nº de aulas da vitrine (publicadas). */
  lessonsCount: number;
  /** URL de checkout TheMembers (derivada do produto). null = sem compra ainda. */
  checkoutUrl: string | null;
  thumbVariant?: AtlasCourseThumbVariant;
  thumbImageUrl?: string;
  className?: string;
}

/**
 * Card de "provocação": vitrine que o aluno ainda NÃO possui. O card abre a
 * vitrine em modo prévia (índice das aulas, cada uma assistível até
 * `previewSeconds`) — a "visão do curso" antes do checkout. O CTA
 * "Desbloquear" é atalho direto pro checkout TheMembers (nova aba); sem
 * checkoutUrl vira "Em breve", mas a prévia continua acessível.
 * Espelha o LockedShowcaseCard do mobile.
 */
export function AtlasLockedShowcaseCard({
  title,
  slug,
  lessonsCount,
  checkoutUrl,
  thumbVariant = "default",
  thumbImageUrl,
  className,
}: AtlasLockedShowcaseCardProps) {
  // <a> dentro de <a> é HTML inválido — o CTA é um span clicável que
  // interrompe a navegação do card e abre o checkout em nova aba.
  const openCheckout = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!checkoutUrl) return;
    e.preventDefault();
    e.stopPropagation();
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Link
      href={`/student/showcases/${slug}?locked=1`}
      className={cn(
        "group bg-atlas-surface border border-atlas-line rounded-md overflow-hidden flex flex-col",
        "cursor-pointer transition-colors duration-150 hover:bg-atlas-surface-2",
        className,
      )}
    >
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
          <span className="text-atlas-muted">Ver prévia</span>
          {checkoutUrl ? (
            <span
              role="link"
              tabIndex={0}
              onClick={openCheckout}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openCheckout(e);
              }}
              className="text-atlas-primary-2 font-medium inline-flex items-center gap-1 hover:underline"
            >
              Desbloquear
              <ArrowUpRight className="size-3" strokeWidth={2} />
            </span>
          ) : (
            <span className="text-atlas-muted font-medium">Em breve</span>
          )}
        </div>
      </div>
    </Link>
  );
}
