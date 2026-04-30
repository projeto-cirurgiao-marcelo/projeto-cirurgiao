# Handoff — Video Player Skin Modernization

**Data**: 2026-04-23
**Origem**: análise comparativa entre player atual (`frontend-web`) e Video.js 10 (`F:\v10-main`)
**Destinatário**: time de frontend do projeto dashboard
**Status**: proposta — aguardando alinhamento antes de iniciar

---

## Contexto

Temos dois projetos em estudo:

1. **Projeto atual** (`D:\dashboard\next-shadcn-admin-dashboard-main`)
   Player em `frontend-web/src/components/video-player/hls-video-player.tsx`.
   Stack: React 19 + Next 15 + HLS.js 1.6.15 + Tailwind 4 + shadcn/ui.
   Mídia servida via Cloudflare R2 (HLS público, custo operacional mínimo).
   Features já implementadas: legendas (CC), velocidade, qualidade.

2. **Projeto referência** (Video.js 10 — `F:\v10-main`)
   Monorepo pnpm/Turbo com player modular (core + SPF + HTML/React bindings).
   Expõe skin sofisticado em `packages/skins/`, design tokens via Tailwind, e integra **Mux Data** como analytics.

## Objetivo geral do trabalho

Trazer para nosso player três camadas inspiradas no Video.js 10, **sem trocar o engine**:

1. **Estilo/skin moderno** (fase A/B — escopo deste handoff)
2. **Botões de ação** (share, download, bookmark, chapters) — fase posterior
3. **Analytics tipo Mux Data** (quartis, abandono, rebuffer, QoS) — fase posterior

HLS.js permanece. Bucket R2 permanece. API pública do componente (`HlsVideoPlayer` props + ref) permanece compatível.

## Escopo imediato — fases A e B

Este handoff cobre **apenas** as duas primeiras fases de estilo. Nada de engine, analytics ou actions por enquanto.

---

### Fase A — Extrair CSS/tokens do Video.js 10 skin

**Objetivo**: ganhar aparência profissional reutilizando tokens de design e estrutura de overlay do Video.js 10, sem dependência nova.

**Tarefas**:

1. Copiar estilos-fonte do Video.js 10:
   - `packages/skins/src/default/css/` (CSS base do skin default)
   - Tokens Tailwind em `packages/html/src/define/video/minimal-skin.tailwind.ts` (paleta, espaçamento, raios)

2. Adaptar variáveis CSS em `frontend-web/src/app/globals.css`:
   - Definir tokens equivalentes: `--media-primary-color`, `--media-control-bg`, `--media-text-color`, `--media-control-hover-bg`, `--slider-fill-percentage`
   - Integrar com `@custom-variant dark` já existente (tema claro/escuro)

3. Refatorar overlay em `hls-video-player.tsx:327-419`:
   - Substituir classes inline hardcoded (`bg-black/70`, `hover:bg-black/90`, etc.) por variáveis CSS
   - Manter estrutura de componentes (CC toggle, playback rate dropdown, quality dropdown) — apenas trocar visual
   - Preservar handlers, refs, estado React

**Critérios de aceite**:

- Visual alinhado ao skin default do Video.js 10 (screenshot referência em `F:\v10-main\apps\sandbox`)
- API pública de `HlsVideoPlayer` inalterada (props + ref)
- Tema light/dark funcional via token CSS
- Bundle sem pacotes novos
- Testes de smoke: CC, velocidade, qualidade continuam funcionando
- Zero regressão em `watch/[videoId]/page.tsx`

**Esforço estimado**: 3 a 5 dias dev frontend.

**Ganho**: aparência profissional sem trocar engine nem aumentar bundle.

**Riscos**:

- Licenciamento: verificar licença de `packages/skins/src/default/css/` antes de copiar. Se Apache 2.0 ou MIT, manter cabeçalho de atribuição.
- Tailwind 4 no projeto atual usa `@tailwindcss/postcss` — confirmar que tokens extraídos do Video.js 10 (também Tailwind 4) são compatíveis.

---

### Fase B — Trocar overlay por `media-chrome`

**Objetivo**: substituir overlay manual por web components acessíveis e temáveis, ganhando manutenibilidade e a11y de graça.

**Pré-requisitos**:

- Fase A concluída e validada (tokens CSS consolidados).
- `media-chrome@4.18.2` **já está no `package.json`**, não requer nova instalação.

**Tarefas**:

1. Wrapper `<MediaController>` em volta de `<video>`:
   - Substitui overlay custom atual
   - Mantém `videoRef` funcional para integração HLS.js

2. Reescrever controles usando web components nativos:
   - `<media-play-button>`, `<media-time-range>`, `<media-volume-range>`
   - `<media-playback-rate-button>`, `<media-captions-button>`, `<media-fullscreen-button>`
   - `<media-pip-button>` (novo — ganho gratuito de feature)
   - Popover de qualidade customizado (media-chrome não tem built-in; usar slot + Radix Popover)

3. Aplicar tokens CSS da fase A via CSS vars do media-chrome:
   - `--media-primary-color`, `--media-control-background`, `--media-text-color`
   - Slots para posicionamento de ações

4. Garantir compatibilidade SSR Next.js 15:
   - `'use client'` obrigatório
   - Dynamic import se houver erro de hydration em web components
   - Fallback loading state

**Critérios de aceite**:

- Todos os controles da fase A funcionando via media-chrome
- Ganho: botão PiP funcional
- Teclas de atalho (espaço, setas, M, F) operantes por padrão do media-chrome
- A11y: navegação por teclado + ARIA labels validados (axe-core ou Lighthouse)
- Bundle final com incremento ≤ 35 KB gzipped
- API pública de `HlsVideoPlayer` inalterada

**Esforço estimado**: 1 semana dev frontend.

**Ganho**:

- Skinnable via CSS vars (centraliza tema)
- A11y nativa (ARIA, foco, leitores de tela)
- Tema claro/escuro via data-attribute
- Hotkeys built-in
- PiP grátis

**Trade-off**: +30 KB gzipped no bundle (media-chrome já é peer do hls-video-element que está em `package.json`, custo aceitável).

**Riscos**:

- Web components + Next.js App Router: hydration pode conflitar com SSR. Mitigação: `dynamic(() => import(...), { ssr: false })`.
- Custom popover de qualidade: media-chrome não provê menu de níveis HLS nativo. Precisa integrar com `hls.levels[]` manualmente via `<media-settings-menu>` + slot.

---

## Fora de escopo (fases posteriores)

Para não espalhar o trabalho atual, **NÃO** iniciar nesta sprint:

- Botões de ação (share, download, bookmark, chapters, notes timeline)
- Plugin de analytics (eventos, beacons, dashboard)
- Troca de engine HLS (manter `hls.js`)
- Suporte DRM, multi-áudio, thumbnails sprite, gestos touch
- Migração para `@videojs/react` ou `@videojs/html`

Essas entram em handoffs separados após validação das fases A e B.

## Pontos de integração já mapeados

Para referência do time ao executar:

- **Player component**: `frontend-web/src/components/video-player/hls-video-player.tsx`
- **Overlay atual**: linhas 327–419
- **Instanciação**: `frontend-web/src/app/(dashboard)/student/courses/[id]/watch/[videoId]/page.tsx:553-565`
- **Estilos globais**: `frontend-web/src/app/globals.css`
- **Config Next**: `frontend-web/next.config.ts` (domínios R2 já permitidos)

## Decisões que precisam ser tomadas antes de iniciar

1. **Licença do skin Video.js 10**: validar com jurídico/arquitetura se podemos copiar arquivos CSS. Caso negativo, reimplementar com inspiração (sem cópia literal).
2. **Escopo PiP**: habilitar botão PiP na fase B ou aguardar fase de actions? Recomendação: habilitar na B (custo zero).
3. **Fallback de browsers sem suporte a web components**: Safari 13+, Chrome 67+, Firefox 63+, Edge 79+ suportam. Cobertura atual do produto? Se suporta IE11 ou navegadores muito antigos, fase B não se aplica.
4. **Paleta de cores**: usar tokens do Video.js 10 como ponto de partida, ou derivar da paleta shadcn já usada no dashboard? Recomendação: derivar da paleta shadcn para consistência visual com resto do produto.

## Definição de pronto

Fase A:

- [ ] Tokens CSS adicionados em `globals.css`
- [ ] Overlay refatorado, visual aprovado por design
- [ ] Tema light/dark funcional
- [ ] Smoke test aprovado (CC, velocidade, qualidade)
- [ ] Sem aumento de bundle

Fase B:

- [ ] media-chrome integrado, hls.js preserved
- [ ] Todos os controles funcionais + PiP
- [ ] Hotkeys ativas
- [ ] A11y auditada (Lighthouse ≥ 95 na página de watch)
- [ ] Bundle incremento ≤ 35 KB gzipped
- [ ] API do `HlsVideoPlayer` inalterada
- [ ] QA manual em Chrome, Firefox, Safari, Edge

## Contato

Dúvidas técnicas sobre o projeto de referência (Video.js 10) ou sobre análise comparativa:
time arquitetura — `gustavobressanin6@gmail.com`.

---

**Próximo handoff previsto** (após fases A e B aprovadas):
`HANDOFF-video-player-actions.md` — botões de ação (share, download, bookmark, chapters).
