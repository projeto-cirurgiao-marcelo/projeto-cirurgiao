"use client";

/**
 * AtlasToast — wrapper Atlas em volta do Sonner.
 *
 * Não use `toast` diretamente do sonner em código novo. Use `atlasToast.*`.
 *
 * Spec: docs/atlas/DESIGN_SYSTEM.md §8 (feedback patterns).
 *
 * Hierarquia (4 níveis):
 *   0 — silencioso: ação tem feedback visual no DOM imediato (like, marcador, nota)
 *   1 — toast minimal: ações sem feedback visual contextual. Auto 2.5s.
 *   2 — toast com undo: ações reversíveis. Auto 5s + action button.
 *   3 — toast persistente: erros, falhas. Sem auto-dismiss.
 */

import * as React from "react";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";
import {
  CheckCircle2,
  Info,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export interface AtlasToastOptions {
  /** Texto secundário menor abaixo do título */
  description?: string;
  /** Ação clicável (ex: "Desfazer") */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Override de duração — default depende do nível */
  duration?: number;
  /** ID pra dedupe / replace toasts */
  id?: string | number;
}

const TIMINGS = {
  level1: 2500, // minimal — auto-dismiss curto
  level2: 5000, // com action — espera mais pro user clicar
  level3: Infinity, // persistente — só dismiss manual
} as const;

function buildOptions(
  base: AtlasToastOptions | undefined,
  defaultDuration: number,
) {
  return {
    description: base?.description,
    action: base?.action,
    duration: base?.duration ?? defaultDuration,
    id: base?.id,
  };
}

export const atlasToast = {
  /** Sucesso silencioso — minimal, auto 2.5s */
  success(message: string, options?: AtlasToastOptions) {
    return sonnerToast.success(
      message,
      buildOptions(options, TIMINGS.level1),
    );
  },

  /** Erro — persistente até dismiss manual */
  error(message: string, options?: AtlasToastOptions) {
    return sonnerToast.error(message, buildOptions(options, TIMINGS.level3));
  },

  /** Aviso — auto 5s (mais tempo pra ler) */
  warning(message: string, options?: AtlasToastOptions) {
    return sonnerToast.warning(
      message,
      buildOptions(options, TIMINGS.level2),
    );
  },

  /** Info — auto 2.5s */
  info(message: string, options?: AtlasToastOptions) {
    return sonnerToast.info(message, buildOptions(options, TIMINGS.level1));
  },

  /** Toast com action (undo). Auto 5s. */
  withAction(
    message: string,
    action: { label: string; onClick: () => void },
    options?: Omit<AtlasToastOptions, "action">,
  ) {
    return sonnerToast(message, {
      ...buildOptions({ ...options, action }, TIMINGS.level2),
    });
  },

  /** Loading toast persistente — retorna id pra .promise/.dismiss */
  loading(message: string, options?: AtlasToastOptions) {
    return sonnerToast.loading(message, buildOptions(options, Infinity));
  },

  /** Dismiss programatico (id retornado por .loading/.success/etc) */
  dismiss(id?: string | number) {
    return sonnerToast.dismiss(id);
  },

  /** Promise wrapper — mostra loading → success/error baseado em resolve/reject */
  promise<T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) {
    return sonnerToast.promise(promise, msgs);
  },
};

/**
 * Toaster — drop-in replacement de `<Toaster />` do sonner com presets Atlas:
 * - top-right desktop, top-center mobile (não conflita com bottom bar mobile)
 * - position respeita safe-area
 * - icons custom por tipo
 */
export function AtlasToaster() {
  return (
    <SonnerToaster
      position="top-right"
      mobileOffset={{ top: "16px", left: "16px", right: "16px" }}
      offset={{ top: "16px", right: "16px" }}
      icons={{
        success: <CheckCircle2 className="size-4" strokeWidth={1.75} />,
        info: <Info className="size-4" strokeWidth={1.75} />,
        warning: <AlertTriangle className="size-4" strokeWidth={1.75} />,
        error: <AlertCircle className="size-4" strokeWidth={1.75} />,
        loading: (
          <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
        ),
      }}
      toastOptions={{
        className: "atlas-toast",
      }}
      duration={TIMINGS.level1}
      visibleToasts={4}
      gap={8}
    />
  );
}
