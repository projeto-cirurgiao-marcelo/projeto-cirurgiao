"use client";

import { ArrowRight, Download, RotateCcw, Sparkles } from "lucide-react";
import {
  AtlasButton,
  AtlasCard,
  AtlasCardContent,
  AtlasCardFooter,
  AtlasCardHeader,
  AtlasCardTitle,
} from "@/components/atlas";

export default function AtlasSmokePage() {
  return (
    <main className="min-h-screen bg-atlas-bg px-7 py-12 text-atlas-ink">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2">
          <div className="atlas-caps text-atlas-muted">Atlas · Smoke test</div>
          <h1 className="font-serif text-[26px] font-medium tracking-[-0.015em] leading-[1.15]">
            Sprint 1 —{" "}
            <em className="italic font-normal text-atlas-muted">
              tokens + primitives
            </em>
          </h1>
          <p className="text-sm text-atlas-muted">
            Confirma que tokens semânticos, font-serif e classes utilitárias
            resolvem corretamente.
          </p>
        </header>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em]">
            AtlasButton
          </h2>

          <AtlasCard>
            <AtlasCardHeader>
              <AtlasCardTitle>Variantes × tamanhos</AtlasCardTitle>
              <span className="atlas-mono text-[10.5px] text-atlas-muted">
                primary · outline · ghost
              </span>
            </AtlasCardHeader>
            <AtlasCardContent className="space-y-5">
              <Row label="primary">
                <AtlasButton variant="primary" size="sm">
                  Pequeno
                </AtlasButton>
                <AtlasButton variant="primary" size="md">
                  Médio
                </AtlasButton>
                <AtlasButton variant="primary" size="lg">
                  Grande
                </AtlasButton>
                <AtlasButton variant="primary" size="md">
                  Continuar
                  <ArrowRight strokeWidth={1.75} />
                </AtlasButton>
              </Row>

              <Row label="outline">
                <AtlasButton variant="outline" size="sm">
                  Filtros
                </AtlasButton>
                <AtlasButton variant="outline" size="md">
                  <Download strokeWidth={1.5} />
                  Exportar
                </AtlasButton>
                <AtlasButton variant="outline" size="lg">
                  Voltar
                </AtlasButton>
                <AtlasButton variant="outline" size="icon">
                  <RotateCcw strokeWidth={1.5} />
                </AtlasButton>
              </Row>

              <Row label="ghost">
                <AtlasButton variant="ghost" size="sm">
                  Cancelar
                </AtlasButton>
                <AtlasButton variant="ghost" size="md">
                  Ver tudo
                </AtlasButton>
                <AtlasButton variant="ghost" size="md" disabled>
                  Desabilitado
                </AtlasButton>
              </Row>
            </AtlasCardContent>
            <AtlasCardFooter>
              <AtlasButton variant="outline" size="sm">
                Reset
              </AtlasButton>
              <AtlasButton variant="primary" size="sm">
                Aplicar
              </AtlasButton>
            </AtlasCardFooter>
          </AtlasCard>
        </section>

        {/* Card spec */}
        <section className="space-y-4">
          <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em]">
            AtlasCard — síntese editorial
          </h2>

          <AtlasCard>
            <AtlasCardHeader>
              <div className="flex items-center gap-2.5">
                <Sparkles
                  className="size-4 text-atlas-primary"
                  strokeWidth={1.5}
                />
                <AtlasCardTitle>Pontos-chave da aula</AtlasCardTitle>
              </div>
              <span className="atlas-mono text-[10.5px] text-atlas-muted">
                Atualizado · 4 min de leitura
              </span>
            </AtlasCardHeader>
            <AtlasCardContent className="font-serif text-[14.5px] leading-[1.65] text-atlas-ink-2 space-y-3">
              <p>
                A toracocentese é definida por{" "}
                <span className="atlas-key">localização anatômica</span>: no
                tórax, diferentemente da abdominocentese. Confira o{" "}
                <span className="atlas-mono text-atlas-warn-deep">0:38</span>{" "}
                para ver o EIC.
              </p>
              <p>
                Pontos variam entre{" "}
                <span className="atlas-key">4º e 7º EIC direito</span> e 6º e 8º
                EIC esquerdo.
              </p>
            </AtlasCardContent>
            <AtlasCardFooter>
              <AtlasButton variant="outline" size="sm">
                <Download strokeWidth={1.5} />
                Exportar
              </AtlasButton>
              <AtlasButton variant="outline" size="sm">
                <RotateCcw strokeWidth={1.5} />
                Regenerar
              </AtlasButton>
              <span className="ml-auto atlas-mono text-[10.5px] text-atlas-muted">
                02 / 03 disponíveis
              </span>
            </AtlasCardFooter>
          </AtlasCard>
        </section>

        {/* Token swatches */}
        <section className="space-y-4">
          <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em]">
            Tokens (visual sanity check)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["bg-atlas-primary", "primary"],
              ["bg-atlas-primary-2", "primary-2"],
              ["bg-atlas-primary-soft", "primary-soft"],
              ["bg-atlas-warn", "warn"],
              ["bg-atlas-warn-deep", "warn-deep"],
              ["bg-atlas-accent", "accent"],
              ["bg-atlas-success", "success"],
              ["bg-atlas-surface-2", "surface-2"],
            ].map(([cls, label]) => (
              <div
                key={cls}
                className="border border-atlas-line rounded-md overflow-hidden"
              >
                <div className={`h-14 ${cls}`} />
                <div className="px-3 py-2 atlas-mono text-[10.5px] text-atlas-muted">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography utilities */}
        <section className="space-y-3">
          <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em]">
            Typography utilities
          </h2>
          <AtlasCard>
            <AtlasCardContent className="space-y-2 text-sm">
              <div>
                <span className="atlas-caps text-atlas-muted">
                  Aula 02 · Técnica
                </span>
              </div>
              <div>
                <span className="atlas-mono text-atlas-warn-deep">0:38</span> /{" "}
                <span className="atlas-mono text-atlas-muted">18:42</span>
              </div>
              <div className="atlas-num">
                Tabular nums: 1234567890 · 9876543210
              </div>
              <div>
                font-serif:{" "}
                <span className="font-serif text-atlas-ink">
                  Source Serif 4 deve renderizar aqui
                </span>
              </div>
            </AtlasCardContent>
          </AtlasCard>
        </section>
      </div>
    </main>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="atlas-caps text-atlas-muted-2 w-20 shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}
