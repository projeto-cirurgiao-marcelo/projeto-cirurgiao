# Projeto Cirurgião — Design System "Atlas" (v2)

> **Para o agente Claude Code:** este doc é uma **extensão** do stack já existente, não uma substituição. Ele introduz a linguagem visual **Atlas** para a área do **estudante** sem mexer nos componentes shadcn atuais usados no admin e no onboarding. Todas as decisões aqui foram tomadas após análise direta de `src/app/globals-premium.css`, `components.json`, `tailwind` setup e `src/components/ui/*`.

---

## 0. Stack detectada (fatos)

| Item | Valor |
|---|---|
| Framework | Next.js **15.3.8** (App Router, RSC) |
| React | 19.2.5 |
| Tailwind | **v4** (sem `tailwind.config.ts` — config via `@theme inline` no CSS) |
| shadcn/ui | Style `new-york`, baseColor `neutral`, CSS variables habilitadas |
| CSS entry | `src/app/globals-premium.css` (importado por `src/app/layout.tsx`) |
| Fontes atuais | Plus Jakarta Sans + JetBrains Mono |
| Cor primária | `#2F80ED` (já alinhada com Coursera) |
| Format de cor | **RGB triplet** — `rgb(var(--primary-500) / 0.5)` |
| Alias | `@/*` → `./src/*` |
| Utilitário classes | `cn()` em `@/lib/utils` (clsx + twMerge) |
| Ícones | `lucide-react` 0.553 |
| Dark mode | `.dark` class variant via `next-themes` |
| Animações | `framer-motion` + `tw-animate-css` |

---

## 1. Filosofia: "Atlas Cirúrgico"

O Projeto Cirurgião **não é uma plataforma MOOC genérica**. É ferramenta de estudo para profissionais em formação em medicina veterinária. A área do estudante transmite **precisão clínica + densidade editorial** — não entretenimento gamificado.

**Referências corretas:** UpToDate, AMBOSS, Osmosis, atlas anatômicos.
**Referências incorretas:** Udemy, Teachable, qualquer SaaS com gradientes e micro-animações "satisfying".

### Três diretrizes inegociáveis

1. **Hierarquia é mais importante que decoração.** Se dois elementos disputam atenção na mesma dobra, algo está errado.
2. **Vocabulário clínico, não de produto.** "Protocolo", "técnica", "procedimento", "aula 01", "revisão". Nunca "módulos de conteúdo", "jornada", "desafios".
3. **Números merecem respeito tipográfico.** Todo tempo, fração, porcentagem, contagem usa `font-mono` + `tabular-nums`.

### Escopo: onde Atlas se aplica

| Contexto | DS aplicado |
|---|---|
| `src/app/(dashboard)/student/**` — aluno consumindo aulas | **Atlas** |
| `src/app/(dashboard)/admin/**` — criação/gestão | shadcn existente |
| `src/app/(auth)/**` — login/signup | shadcn existente |
| `src/app/(onboarding)/**` | shadcn existente |
| Quiz, fórum (estudante) | **Atlas** |
| Chatbot | pode usar Atlas para consistência |

Gamificação (badges, streaks, níveis) continua existindo no admin/dashboard, **mas não aparece na área de estudo**. Na área de estudo, o progresso é mostrado como protocolo clínico (estágios, aulas numeradas), não como jogo.

### Red flags — pare se estiver fazendo

- Colocando emoji em título ou label
- Adicionando `bg-gradient-to-*` num card da área do estudante
- Usando `card-hover` (translate-y + shadow) em lesson cards
- `font-bold` em `<h1>` sem `font-serif`
- Adicionando `active:scale-[0.98]` em botões primários da área de estudo
- Duas cores saturadas na mesma dobra (ex: primary + warning juntos em CTAs)
- Componente de estudante sem importar da pasta `@/components/atlas/*`

---

## 2. Integração com tokens existentes

### 2.1 Princípio: alias, não duplicação

O projeto **já tem** a infraestrutura de tokens certa. Não vamos recriar — vamos adicionar uma **camada semântica Atlas** em cima do que existe em `globals-premium.css`.

Os tokens existentes que aproveitamos diretamente:

| Token existente | Papel Atlas |
|---|---|
| `--primary-500` (#2F80ED) | Primary — ações, nav ativa, progresso |
| `--primary-600`, `--primary-700` | Hover/pressed |
| `--primary-50` | Background ativo sutil |
| `--warning-500` (#F59E0B) | **Tempo** — timestamps, pins, stage atual |
| `--warning-600` (#D97706) | Highlights de síntese (marca-texto) |
| `--error-500` (#EF4444) | Badges de contagem, estados de erro |
| `--success-500` (#10B981) | Completion apenas |
| `--text-primary` (#0F172A) | Ink — texto principal |
| `--text-secondary` (#475569) | Muted |
| `--text-tertiary` (#64748B) | Muted-2 |
| `--gray-200` (#E2E8F0) | Line padrão |
| `--gray-300` (#CBD5E1) | Line-strong (borders de input/botão) |
| `--bg-primary` (#FFFFFF) | Surface |
| `--bg-secondary` (#F8FAFC) | Bg / surface-2 |

### 2.2 Adições Atlas em `globals-premium.css`

Adicione este bloco **dentro do `:root` existente**, logo após a seção `=== Cores Secundárias ===` e antes de `=== Backgrounds ===`:

```css
  /* ===== ATLAS SEMANTIC TOKENS ===== */
  /* Camada semântica para a área do estudante.
     NÃO cria cores novas — mapeia as existentes para papéis editoriais. */

  /* Ink / texto (aliases mais curtos que text-primary) */
  --atlas-ink: var(--text-primary);         /* 15 23 42 */
  --atlas-ink-2: 45 55 72;                  /* #2D3748 — levemente mais claro que text-primary */
  --atlas-muted: var(--text-secondary);     /* 71 85 105 */
  --atlas-muted-2: var(--text-tertiary);    /* 100 116 139 */

  /* Superfícies */
  --atlas-bg: var(--bg-secondary);          /* 248 250 252 — off-white frio */
  --atlas-surface: var(--bg-primary);       /* 255 255 255 */
  --atlas-surface-2: var(--bg-tertiary);    /* 241 245 249 */

  /* Linhas */
  --atlas-line: var(--gray-200);            /* 226 232 240 */
  --atlas-line-strong: var(--gray-300);     /* 203 213 225 */

  /* Ações e estados semânticos */
  --atlas-primary: var(--primary-500);      /* 47 128 237 */
  --atlas-primary-2: var(--primary-700);    /* 29 78 216 */
  --atlas-primary-soft: var(--primary-50);  /* 239 246 255 */

  /* Tempo / marcadores temporais (pins, timestamps, stage atual) */
  --atlas-warn: var(--warning-500);         /* 245 158 11 */
  --atlas-warn-deep: var(--warning-600);    /* 217 119 6 */

  /* Alertas / contagens */
  --atlas-accent: var(--error-500);         /* 239 68 68 */

  /* Completion */
  --atlas-success: var(--success-500);      /* 16 185 129 */
```

E adicione no bloco `.dark`:

```css
  /* Atlas no dark mode — inverte superfícies e text */
  --atlas-ink: 248 250 252;                 /* slate-50 */
  --atlas-ink-2: 226 232 240;               /* slate-200 */
  --atlas-muted: 203 213 225;               /* slate-300 */
  --atlas-muted-2: 148 163 184;             /* slate-400 */
  --atlas-bg: 15 23 42;                     /* slate-900 */
  --atlas-surface: 30 41 59;                /* slate-800 */
  --atlas-surface-2: 51 65 85;              /* slate-700 */
  --atlas-line: 51 65 85;                   /* slate-700 */
  --atlas-line-strong: 71 85 105;           /* slate-600 */
  --atlas-primary-soft: 30 58 138;          /* primary-900 — escuro para realçar em dark */
```

### 2.3 Tailwind v4 — exponha como classes utilitárias

Dentro do bloco `@theme inline` existente em `globals-premium.css`, adicione:

```css
@theme inline {
  /* ...mantenha tudo que já existe... */

  /* === Atlas semantic colors — disponíveis como classes utilitárias === */
  --color-atlas-ink: rgb(var(--atlas-ink));
  --color-atlas-ink-2: rgb(var(--atlas-ink-2));
  --color-atlas-muted: rgb(var(--atlas-muted));
  --color-atlas-muted-2: rgb(var(--atlas-muted-2));
  --color-atlas-bg: rgb(var(--atlas-bg));
  --color-atlas-surface: rgb(var(--atlas-surface));
  --color-atlas-surface-2: rgb(var(--atlas-surface-2));
  --color-atlas-line: rgb(var(--atlas-line));
  --color-atlas-line-strong: rgb(var(--atlas-line-strong));
  --color-atlas-primary: rgb(var(--atlas-primary));
  --color-atlas-primary-2: rgb(var(--atlas-primary-2));
  --color-atlas-primary-soft: rgb(var(--atlas-primary-soft));
  --color-atlas-warn: rgb(var(--atlas-warn));
  --color-atlas-warn-deep: rgb(var(--atlas-warn-deep));
  --color-atlas-accent: rgb(var(--atlas-accent));
  --color-atlas-success: rgb(var(--atlas-success));
}
```

Isso dá acesso a classes como:

```tsx
<div className="bg-atlas-surface border border-atlas-line text-atlas-ink">
  <span className="text-atlas-warn font-mono">0:38</span>
</div>
```

---

## 3. Tipografia

### 3.1 Decisão: adicionar Source Serif 4

Seu projeto hoje usa **Plus Jakarta Sans** em tudo (títulos e body). Para dar a identidade editorial "Atlas" aos títulos da área de estudo, **recomendo adicionar Source Serif 4** via Google Fonts. É gratuita, variable font (1 request para todos os pesos), e coexiste sem problema com Plus Jakarta.

**No topo de `globals-premium.css`**, adicione à importação de fontes:

```css
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&display=swap');
```

**No bloco `@theme inline`**, registre a nova família:

```css
@theme inline {
  /* ...já existe: */
  --font-sans: 'Plus Jakarta Sans', -apple-system, ...;
  --font-mono: 'JetBrains Mono', ...;

  /* ADICIONE: */
  --font-serif: 'Source Serif 4', Georgia, 'Times New Roman', serif;
}
```

Agora `font-serif` está disponível como utility em qualquer lugar:

```tsx
<h1 className="font-serif font-medium tracking-tight">...</h1>
```

### 3.2 Papéis por família

| Família | Usa para | Pesos |
|---|---|---|
| **Source Serif 4** (`font-serif`) | h1–h4 da área de estudo, corpo da síntese de IA, saudações editoriais na home | 400, 500, 600; itálico 400/500 |
| **Plus Jakarta Sans** (`font-sans`) | UI geral — nav, botões, body, labels, meta | 400, 500, 600 (700 só em CTAs críticos) |
| **JetBrains Mono** (`font-mono`) | Tempos de vídeo, porcentagens, contagens, índices de aula, durações | 400, 500 |

### 3.3 Escala tipográfica Atlas

| Papel | Classes Tailwind | Comentário |
|---|---|---|
| Título de curso | `font-serif text-[26px] font-medium tracking-[-0.015em] leading-[1.15]` | único `<h1>` por tela |
| Título de aula | `font-serif text-[22px] font-medium tracking-[-0.01em] leading-[1.2]` | `<h2>` |
| Título de seção | `font-serif text-[17px] font-medium tracking-[-0.005em]` | `<h3>` em "Minhas Anotações", "Síntese" etc |
| Título de card (síntese) | `font-serif text-[15px] font-medium` | `<h4>` |
| Body padrão | `text-sm leading-relaxed` (14px) | Plus Jakarta |
| Body denso (notas) | `text-[13.5px] leading-[1.55]` | Plus Jakarta |
| Meta / muted | `text-xs text-atlas-muted` (12px) | |
| Caps / labels | `.atlas-caps` (classe utilitária — ver 3.5) | 10.5px uppercase tracking |
| Mono pequeno | `font-mono text-[10.5px] tabular-nums tracking-wide` | tempos, índices |

**Importante:** `tracking-tight` padrão do Tailwind é `-0.025em` — forte demais para serifa. Use valores arbitrários `tracking-[-0.01em]` para títulos serifa.

### 3.4 Opção B (se não quiser adicionar Source Serif 4)

Se o cliente resistir a adicionar outra fonte, use **Plus Jakarta Sans com peso 700 + tracking-tighter** para títulos. Perde-se um pouco da identidade editorial, mas mantém a hierarquia:

```tsx
<h1 className="text-[26px] font-bold tracking-[-0.02em] leading-[1.15] text-atlas-ink">...</h1>
```

Avisa antes de fazer — eu recomendo fortemente a Opção A.

### 3.5 Classes utilitárias — adicionar em `globals-premium.css`

No bloco `@layer utilities` existente, adicione:

```css
@layer utilities {
  /* ...mantenha tudo o que já existe... */

  /* ===== Atlas typography utilities ===== */

  .atlas-caps {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10.5px;
    font-weight: 500;
    line-height: 1.2;
  }

  .atlas-mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }

  .atlas-num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }

  /* Para highlights amarelos de marca-texto na síntese de IA */
  .atlas-key {
    background: linear-gradient(
      180deg,
      transparent 60%,
      rgb(var(--atlas-warn-deep) / 0.22) 60%
    );
    padding: 0 2px;
  }
}
```

Uso:
```tsx
<span className="atlas-caps text-atlas-muted">Aula 02 · Técnica</span>
<span className="atlas-mono text-atlas-warn">0:38</span>
<p>A toracocentese é definida por <span className="atlas-key">localização anatômica</span>.</p>
```

---

## 4. Regras de cor (semântica rígida)

| Token | Use para | NÃO use para |
|---|---|---|
| `atlas-primary` | CTAs principais, nav ativa, progresso, logo | Timestamps, alertas, completion |
| `atlas-warn` | Timestamps, pins de nota, stage "em andamento", marca-texto na síntese | CTAs, links, "concluído" |
| `atlas-accent` | Badges de contagem (6 notificações), estados de erro | CTAs, highlights de texto |
| `atlas-success` | Check de aula concluída | Estado "em andamento" |
| `atlas-muted`, `atlas-muted-2` | Texto secundário, breadcrumbs, meta | Títulos |

**Regra de ouro:** `warn` é a cor do **tempo**, `primary` é a cor da **ação**. Nunca misture.

### Radius

Use **três valores apenas** na área Atlas:

```tsx
rounded-sm   // 3px — botões secundários, chips, pills
rounded-md   // 6–8px — cards, inputs, CTAs primários
rounded-lg   // 18px — bottom sheets, modais (só mobile)
```

**Proibido na área Atlas:** `rounded-xl`, `rounded-2xl`, `rounded-full` (exceto avatares e dots).

### Sombras

**Regra:** prefira `border border-atlas-line` a `shadow-*`.

Exceções permitidas:
- Video player wrapper: `shadow-[0_1px_0_rgba(0,0,0,0.04),0_0_0_1px_rgb(var(--atlas-line))]`
- Bottom sheet mobile: `shadow-[0_-10px_40px_rgba(0,0,0,0.08)]`

**Proibido na área Atlas:** `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-base`, `card-hover`, `shadow-glow-*`.

---

## 5. Anti-padrões — **específicos deste projeto**

Os componentes shadcn atuais (`src/components/ui/button.tsx`, `card.tsx`) **não seguem Atlas**. Isso é OK no admin, mas é **proibido na área do estudante**. Abaixo, o que evitar e a alternativa Atlas.

| ❌ Componente/padrão existente | ✅ Versão Atlas |
|---|---|
| `<Button>` com `bg-gradient-to-r from-blue-600 to-blue-700` e `hover:-translate-y-0.5` | `<AtlasButton>` sólido, sem gradient, sem translate, sem scale |
| `<Card>` com `border-2 border-gray-200 shadow-sm hover:shadow-md` | `<AtlasCard>` com `border border-atlas-line`, sem hover shadow |
| `.card-hover` (translate + shadow) em course cards | Hover `bg-atlas-surface-2` apenas |
| `text-xl font-bold` em `CardTitle` | `font-serif text-[15–17px] font-medium tracking-[-0.005em]` |
| `active:scale-[0.98]` em botões | Sem scale — feedback via `active:bg-atlas-primary-2` |
| `hover:shadow-lg` em cards | `hover:bg-atlas-surface-2` ou sem hover visual |
| `rounded-lg` default (10px) | `rounded-md` (6–8px) |
| Toast Sonner com cores saturadas full-bleed | Usar variants atlas (surface + border colorido 1px + texto colorido) |
| Ícone com `stroke-width` default (2) | Sempre `strokeWidth={1.5}` no JSX do Lucide |
| Emoji em título de card | Ícone Lucide 14px `text-atlas-muted` antes do texto |

### Anti-padrões específicos das listing pages

Os atuais `src/app/(dashboard)/student/{courses,in-progress,completed,my-courses}/page.tsx` repetem o mesmo conjunto de anti-padrões que Atlas combate. Quando refatorar, substitua diretamente:

| ❌ Padrão atual (em todas as 4 rotas) | ✅ Versão Atlas |
|---|---|
| Header com `<div className="p-3 bg-gradient-to-br from-X-500 to-X-600 rounded-xl shadow-lg"><Icon /></div>` + `<h1 text-3xl font-bold>` + `<p text-gray-600>` | `<AtlasPageHeader metaLabel="..." title="..." titleEm="...">` |
| 3 stat cards `<div className="bg-white rounded-xl p-4 border shadow-sm">` com ícone colorido em `bg-X-50 rounded-lg` | `<AtlasStatsInline stats={[...]} />` dentro do `AtlasPageHeader` |
| Empty state com `bg-gray-100 rounded-2xl + Icon h-24 w-24 text-gray-400 + h3 text-2xl font-bold` | `<AtlasEmptyState icon={X} title="..." />` |
| Loading com `<Loader2 className="h-8 w-8 animate-spin text-blue-600" />` centralizado | `<AtlasLoadingBar />` no topo + `<AtlasSkeletonCard />` na área de conteúdo |
| Banner congratulations com `bg-gradient-to-r from-green-50 to-blue-50 + Trophy icon h-8 w-8 text-green-600` | `<AtlasCompletionStrip variant="success" title="..." />` |
| Hero atual estilo Coursera com gradient azul saturado e Title-Case-Em-Tudo | `<AtlasHeroPromo>` com sentence case, gradient slate→blue, fonte serif |
| Cor de ícone no header variando por página (purple/blue/green) | Sem ícone no header. Apenas caps label + serif title |
| Botão CTA com `px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold` | `<AtlasButton variant="primary">` |
| Page wrapper com `<div className="space-y-6">` | `<AtlasPageHeader>` + `<div className="px-7 py-6">` no body |
| Carrossel horizontal "Continue Assistindo" estilo Netflix (`/my-courses`) | Vertical sections com link "ver todos" — ver Template D |
| `text-2xl md:text-3xl font-bold tracking-tight` em h1 | Padronizado: `font-serif text-[26px] font-medium tracking-[-0.015em]` |
| Datas formatadas em `pt-BR` long: "18 de fevereiro de 2026" | Compacto mono: `18 fev 2026` (10–11px, tracking-wide) |
| Filtros separados em mais de uma linha | `<AtlasFiltersRow>` (search + chips na mesma linha) |

---

## 6. Estrutura de pastas Atlas

```
src/
  components/
    atlas/                          # 👈 nova pasta — TODOS os componentes Atlas aqui
      primitives/
        AtlasButton.tsx
        AtlasCard.tsx
        AtlasBadge.tsx
        AtlasInput.tsx
        AtlasChip.tsx               # filter chips com count
      navigation/
        AtlasRail.tsx               # nav lateral desktop (colapsável)
        AtlasTabBar.tsx             # tab bar mobile
        AtlasAdminStrip.tsx
        AtlasTopBar.tsx
        AtlasSectionTabs.tsx        # tabs de filtro por estado dentro da página
      page/                         # 👈 building blocks de página (listing routes)
        AtlasPageHeader.tsx         # caps + serif title + actions + stats-inline
        AtlasStatsInline.tsx        # estatísticas editoriais (substitui stat-cards)
        AtlasStatsLine.tsx          # versão compacta com ícones em linha
        AtlasHeroPromo.tsx          # hero promocional editorial (split text/visual)
        AtlasFiltersRow.tsx         # search + chips na mesma linha
        AtlasEmptyState.tsx         # vazio editorial (dashed border, serif title)
        AtlasLoadingBar.tsx         # barra fina horizontal animada
        AtlasSkeletonCard.tsx       # skeleton tipográfico
        AtlasCompletionStrip.tsx    # banner sutil de reconhecimento (border-left)
      course/
        AtlasCourseHeader.tsx       # header da rota /lessons/[id]
        AtlasStagesProgress.tsx
        AtlasModuleSidebar.tsx      # desktop (lado direito da aula)
        AtlasModuleSheet.tsx        # mobile (bottom sheet)
        AtlasAssessmentCTA.tsx
        AtlasCourseCard.tsx         # card de listagem (grid 4-col)
        AtlasCourseRow.tsx          # linha densa (lista para in-progress)
        AtlasCourseThumb.tsx        # placeholder com gradient + título serif
      lesson/
        AtlasPlayer/
          AtlasPlayer.tsx           # wrapper
          AtlasPlayerTimeline.tsx   # timeline com chapter dividers + note pins
          AtlasPlayerControls.tsx
        AtlasLessonHeader.tsx
        AtlasStatsStrip.tsx
        AtlasStickyActions.tsx
      notes/
        AtlasNoteRow.tsx
        AtlasNotesList.tsx
      synthesis/
        AtlasSynthesisCard.tsx
      index.ts                      # re-exports nomeados
```

**Regras de import:**
```tsx
// ✅ Certo — na área do estudante
import { AtlasButton, AtlasCard } from "@/components/atlas";

// ❌ Errado — isso pega o shadcn que não segue Atlas
import { Button, Card } from "@/components/ui/button";
```

---

## 7. Componentes — implementação de referência

Código de referência em **React 19 + TypeScript + Tailwind v4** no estilo do projeto (clsx + cn helper existente).

### 7.1 `AtlasButton`

```tsx
// src/components/atlas/primitives/AtlasButton.tsx
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const atlasButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-sm font-medium transition-colors duration-150",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atlas-primary",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
    // sem shadow, sem translate, sem scale
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-atlas-primary text-white border border-atlas-primary",
          "hover:bg-atlas-primary-2 hover:border-atlas-primary-2",
          "active:bg-atlas-primary-2",
        ],
        outline: [
          "bg-atlas-surface text-atlas-ink-2 border border-atlas-line-strong",
          "hover:bg-atlas-surface-2 hover:border-atlas-ink-2",
        ],
        ghost: [
          "bg-transparent text-atlas-muted border border-transparent",
          "hover:bg-atlas-surface-2 hover:text-atlas-ink",
        ],
      },
      size: {
        sm: "h-8 px-3 text-[12.5px] [&_svg]:size-3.5",
        md: "h-9 px-3.5 text-[13px] [&_svg]:size-3.5",
        lg: "h-10 px-4 text-sm [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  }
);

export interface AtlasButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof atlasButtonVariants> {
  asChild?: boolean;
}

export const AtlasButton = React.forwardRef<HTMLButtonElement, AtlasButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(atlasButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
AtlasButton.displayName = "AtlasButton";
```

### 7.2 `AtlasCard`

```tsx
// src/components/atlas/primitives/AtlasCard.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function AtlasCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-atlas-surface border border-atlas-line rounded-md",
        // sem shadow, sem card-hover
        className
      )}
      {...props}
    />
  );
}

export function AtlasCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-[22px] py-[14px]",
        "border-b border-atlas-line",
        className
      )}
      {...props}
    />
  );
}

export function AtlasCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        "font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink",
        className
      )}
      {...props}
    />
  );
}

export function AtlasCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-[22px] py-[18px]", className)} {...props} />;
}

export function AtlasCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-[22px] py-[14px] border-t border-atlas-line",
        className
      )}
      {...props}
    />
  );
}
```

### 7.3 `AtlasNoteRow` (anotação ancorada)

```tsx
// src/components/atlas/notes/AtlasNoteRow.tsx
"use client";

import * as React from "react";
import { Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasNoteRowProps {
  timestamp: string;            // "0:38"
  body: string;
  chapterName?: string;
  onSeek?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function AtlasNoteRow({
  timestamp,
  body,
  chapterName,
  onSeek,
  onEdit,
  className,
}: AtlasNoteRowProps) {
  return (
    <button
      onClick={onSeek}
      className={cn(
        "group grid grid-cols-[56px_1fr_auto] gap-4 items-baseline",
        "w-full text-left py-3 px-2 -mx-2 rounded-sm",
        "border-t border-atlas-line first:border-t-0",
        "hover:bg-atlas-surface-2 transition-colors duration-150",
        className
      )}
    >
      <span className="atlas-mono text-[11.5px] font-medium text-atlas-warn-deep pt-0.5">
        {timestamp}
      </span>
      <div className="text-[13.5px] leading-[1.55] text-atlas-ink-2">
        {body}
        {chapterName && (
          <span className="block mt-1 atlas-mono text-[10.5px] text-atlas-muted tracking-wide">
            Cap · {chapterName}
          </span>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-sm hover:bg-atlas-surface"
            aria-label="Editar nota"
          >
            <Edit2 className="size-3.5 text-atlas-muted" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </button>
  );
}
```

### 7.4 `AtlasStagesProgress`

```tsx
// src/components/atlas/course/AtlasStagesProgress.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type StageStatus = "done" | "current" | "future";

interface Stage {
  num: number;
  name: string;
  count: string;            // "1 / 1 concluída"
  status: StageStatus;
}

interface AtlasStagesProgressProps {
  stages: Stage[];
  className?: string;
}

export function AtlasStagesProgress({ stages, className }: AtlasStagesProgressProps) {
  return (
    <div className={cn("flex pt-3.5 border-t border-atlas-line", className)}>
      {stages.map((stage, i) => (
        <div
          key={stage.num}
          className={cn(
            "flex-1 px-5",
            i > 0 && "border-l border-atlas-line",
            i === 0 && "pl-0"
          )}
        >
          <div className="atlas-mono text-[10.5px] text-atlas-muted-2 mb-1">
            {String(stage.num).padStart(2, "0")}
          </div>
          <div
            className={cn(
              "flex items-center gap-2 text-[13px] font-medium mb-1.5",
              stage.status === "current" && "text-atlas-primary"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                stage.status === "done" && "bg-atlas-primary",
                stage.status === "current" &&
                  "bg-atlas-warn shadow-[0_0_0_3px_rgb(var(--atlas-warn-deep)/0.18)]",
                stage.status === "future" && "bg-atlas-line-strong"
              )}
            />
            <span className="truncate">{stage.name}</span>
          </div>
          <div className="text-xs text-atlas-muted atlas-num">{stage.count}</div>
        </div>
      ))}
    </div>
  );
}
```

### 7.5 `AtlasSynthesisCard`

```tsx
// src/components/atlas/synthesis/AtlasSynthesisCard.tsx
"use client";

import * as React from "react";
import { Sparkles, Download, RotateCcw } from "lucide-react";
import {
  AtlasCard,
  AtlasCardHeader,
  AtlasCardContent,
  AtlasCardFooter,
  AtlasCardTitle,
} from "@/components/atlas/primitives/AtlasCard";
import { AtlasButton } from "@/components/atlas/primitives/AtlasButton";

interface AtlasSynthesisCardProps {
  title?: string;
  usageLabel: string;            // "02 de 03 disponíveis este mês"
  updatedLabel?: string;         // "Atualizado · 4 min de leitura"
  children: React.ReactNode;     // o corpo (<p> com <span className="atlas-key">)
  onExport?: () => void;
  onRegenerate?: () => void;
}

export function AtlasSynthesisCard({
  title = "Pontos-chave da aula",
  usageLabel,
  updatedLabel,
  children,
  onExport,
  onRegenerate,
}: AtlasSynthesisCardProps) {
  return (
    <AtlasCard>
      <AtlasCardHeader>
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-atlas-primary" strokeWidth={1.5} />
          <AtlasCardTitle>{title}</AtlasCardTitle>
        </div>
        {updatedLabel && (
          <span className="atlas-mono text-[10.5px] text-atlas-muted">
            {updatedLabel}
          </span>
        )}
      </AtlasCardHeader>

      <AtlasCardContent className="font-serif text-[14.5px] leading-[1.65] text-atlas-ink-2 space-y-3">
        {children}
      </AtlasCardContent>

      <AtlasCardFooter>
        <AtlasButton variant="outline" size="sm" onClick={onExport}>
          <Download strokeWidth={1.5} />
          Exportar
        </AtlasButton>
        <AtlasButton variant="outline" size="sm" onClick={onRegenerate}>
          <RotateCcw strokeWidth={1.5} />
          Regenerar
        </AtlasButton>
        <span className="ml-auto atlas-mono text-[10.5px] text-atlas-muted">
          {usageLabel}
        </span>
      </AtlasCardFooter>
    </AtlasCard>
  );
}
```

Uso:
```tsx
<AtlasSynthesisCard
  usageLabel="02 / 03 disponíveis"
  updatedLabel="Atualizado · 4 min de leitura"
  onExport={handleExport}
  onRegenerate={handleRegenerate}
>
  <p>
    A toracocentese é definida por{" "}
    <span className="atlas-key">localização anatômica</span>:
    no tórax, diferentemente da abdominocentese.
  </p>
  <p>
    Os pontos variam entre 4º e 7º EIC direito e 6º e 8º EIC esquerdo...
  </p>
</AtlasSynthesisCard>
```

### 7.6 `AtlasModuleSheet` (mobile bottom sheet)

Use o `Sheet` da shadcn como base (já instalado em `@radix-ui/react-dialog`), mas sobrescreva classes:

```tsx
// src/components/atlas/course/AtlasModuleSheet.tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const AtlasSheet = DialogPrimitive.Root;
export const AtlasSheetTrigger = DialogPrimitive.Trigger;
export const AtlasSheetClose = DialogPrimitive.Close;

export function AtlasSheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-40 bg-[rgb(10_10_10_/_0.45)] backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed bottom-0 inset-x-0 z-50",
          "h-[78vh] bg-atlas-bg rounded-t-lg",
          "shadow-[0_-10px_40px_rgba(0,0,0,0.08)]",
          "flex flex-col",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "duration-300",
          className
        )}
        {...props}
      >
        <div
          className="w-[42px] h-1 bg-atlas-line-strong rounded-full mx-auto mt-2.5 mb-2 shrink-0"
          aria-hidden
        />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
```

### 7.7 `AtlasPlayerTimeline` (parte mais complexa)

```tsx
// src/components/atlas/lesson/AtlasPlayer/AtlasPlayerTimeline.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  name: string;
  startPercent: number;    // 0–100
}

interface NotePin {
  id: string;
  atPercent: number;       // 0–100
  timestamp: string;       // "0:38"
}

interface AtlasPlayerTimelineProps {
  currentPercent: number;    // 0–100
  chapters: Chapter[];
  notes: NotePin[];
  onSeek: (percent: number) => void;
  onNoteClick?: (noteId: string) => void;
}

export function AtlasPlayerTimeline({
  currentPercent,
  chapters,
  notes,
  onSeek,
  onNoteClick,
}: AtlasPlayerTimelineProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, pct)));
  };

  return (
    <div>
      <div
        ref={trackRef}
        onClick={handleClick}
        className="relative h-7 flex items-center cursor-pointer mb-1.5"
      >
        {/* Track base */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-white/20 rounded-sm" />

        {/* Chapter dividers */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] flex pointer-events-none">
          {chapters.map((ch, i) => {
            const nextStart = chapters[i + 1]?.startPercent ?? 100;
            const width = nextStart - ch.startPercent;
            return (
              <div
                key={ch.id}
                style={{ width: `${width}%` }}
                className="h-full border-r border-white/30 last:border-r-0"
              />
            );
          })}
        </div>

        {/* Progress fill */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] bg-white rounded-sm"
          style={{ width: `${currentPercent}%` }}
        />

        {/* Note pins */}
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={(e) => {
              e.stopPropagation();
              onNoteClick?.(n.id);
            }}
            style={{ left: `${n.atPercent}%` }}
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
              "size-2.5 rounded-full bg-atlas-warn border-2 border-[#0A0A0A] z-10",
              "hover:scale-125 transition-transform duration-150"
            )}
            aria-label={`Nota em ${n.timestamp}`}
            title={`Nota em ${n.timestamp}`}
          />
        ))}

        {/* Playhead handle */}
        <div
          style={{ left: `${currentPercent}%` }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full bg-white z-20 pointer-events-none"
        />
      </div>

      {/* Chapter labels */}
      <div className="flex justify-between px-0.5 atlas-mono text-[10px] text-white/55 tracking-wide">
        {chapters.map((ch) => (
          <span key={ch.id}>{ch.name}</span>
        ))}
      </div>
    </div>
  );
}
```

---

## 7B. Componentes de **listing pages** (`page/` e `course/`)

Aplicáveis a `/student/courses`, `/student/in-progress`, `/student/completed`, `/student/my-courses` e qualquer outra rota que liste cursos. Especificações abaixo seguem o mockup canônico em `docs/atlas/reference-listing-pages.html`.

### 7B.1 `AtlasPageHeader`

Cabeçalho padrão de **toda** página de listagem do estudante. Substitui o atual padrão (ícone gradient + bg-gradient + título 3xl + subtítulo gray).

```tsx
// src/components/atlas/page/AtlasPageHeader.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasPageHeaderProps {
  metaLabel: string;          // "Biblioteca · Catálogo" — em caps
  title: string;              // "Todos os cursos disponíveis"
  titleEm?: string;            // sufixo italico opcional, mostrado como <em>
  actions?: React.ReactNode;   // botões à direita
  children?: React.ReactNode;  // tipicamente <AtlasStatsInline>
  className?: string;
}

export function AtlasPageHeader({
  metaLabel,
  title,
  titleEm,
  actions,
  children,
  className,
}: AtlasPageHeaderProps) {
  return (
    <div
      className={cn(
        "px-7 pt-7 pb-5 border-b border-atlas-line bg-atlas-bg",
        className
      )}
    >
      <div className="flex items-end justify-between gap-6 mb-4">
        <div>
          <div className="atlas-caps text-atlas-muted mb-1.5">{metaLabel}</div>
          <h1 className="font-serif text-[26px] font-medium tracking-[-0.015em] leading-[1.15] text-atlas-ink">
            {title}{" "}
            {titleEm && (
              <em className="italic font-normal text-atlas-muted">{titleEm}</em>
            )}
          </h1>
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
```

**Uso:**
```tsx
<AtlasPageHeader
  metaLabel="Biblioteca · Catálogo"
  title="Todos os"
  titleEm="cursos disponíveis"
  actions={
    <>
      <AtlasButton variant="outline"><Filter strokeWidth={1.5} /> Filtros</AtlasButton>
      <AtlasButton variant="outline"><Menu strokeWidth={1.5} /> Ordenar</AtlasButton>
    </>
  }
>
  <AtlasStatsInline stats={[...]} />
</AtlasPageHeader>
```

### 7B.2 `AtlasStatsInline`

Substitui o padrão atual de "3 cards-bloco com ícone colorido". Estatística editorial: número grande em serifa (ou mono se for tempo/percentual), label em caps muted abaixo, separados por borders verticais.

```tsx
// src/components/atlas/page/AtlasStatsInline.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InlineStat {
  /** Valor principal — string formatada. Use "3 / 5" ou "62%" ou "182h" */
  value: string;
  /** Label em caps abaixo do valor */
  label: string;
  /** "serif" (padrão, números inteiros) ou "mono" (tempos, %) */
  format?: "serif" | "mono";
  /** Parte secundária do valor, em muted (ex: "/ 24" em "3 / 24") */
  total?: string;
}

interface AtlasStatsInlineProps {
  stats: InlineStat[];
  className?: string;
}

export function AtlasStatsInline({ stats, className }: AtlasStatsInlineProps) {
  return (
    <div className={cn("flex pt-[18px] border-t border-atlas-line", className)}>
      {stats.map((stat, i) => (
        <div
          key={i}
          className={cn(
            "flex-1",
            i < stats.length - 1 && "border-r border-atlas-line pr-7 mr-7"
          )}
        >
          <div
            className={cn(
              "text-[22px] font-medium tracking-[-0.01em] leading-[1.1] mb-1 atlas-num",
              stat.format === "mono" ? "font-mono" : "font-serif"
            )}
          >
            {stat.value}
            {stat.total && (
              <span className="text-atlas-muted-2 font-normal"> {stat.total}</span>
            )}
          </div>
          <div className="atlas-caps text-atlas-muted">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
```

**Uso:**
```tsx
<AtlasStatsInline
  stats={[
    { value: "24", label: "Cursos disponíveis" },
    { value: "3", total: "/ 24", label: "Matriculados" },
    { value: "5", label: "Adicionados este mês" },
    { value: "182h", format: "mono", label: "Conteúdo total" },
  ]}
/>
```

**Regras:**
- 3 ou 4 stats por header. Mais que 4 vira ruído visual — corte ou refatore.
- Tempos e porcentagens **sempre** em `format="mono"`.
- Quando há "X de Y", separe em `value` e `total`.
- Cada stat label usa `atlas-caps` (10.5px uppercase tracking).

### 7B.3 `AtlasHeroPromo`

Hero promocional editorial. Substitui o banner atual com gradient azul saturado e Title-Case-Em-Tudo. Layout split 1.4fr / 1fr (texto esquerda, visual direita).

```tsx
// src/components/atlas/page/AtlasHeroPromo.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasHeroPromoProps {
  eyebrow: string;            // "Pós-graduação · Inscrições abertas"
  title: string;              // sentence case, não Title Case
  titleEm?: string;            // sufixo italico
  description: string;
  primaryCta: { label: string; onClick?: () => void };
  secondaryCta?: { label: string; onClick?: () => void };
  /** Footer de chips (cidades, datas, módulos) com label */
  footerLabel?: string;
  footerItems?: string[];
  /** Visual à direita — pode ser custom ou usar default <C> mark */
  visual?: React.ReactNode;
  /** Stats overlay no canto inferior do visual */
  visualStats?: { value: string; label: string }[];
  className?: string;
}

export function AtlasHeroPromo({
  eyebrow,
  title,
  titleEm,
  description,
  primaryCta,
  secondaryCta,
  footerLabel,
  footerItems = [],
  visual,
  visualStats = [],
  className,
}: AtlasHeroPromoProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-[1.4fr_1fr]",
        "bg-atlas-surface border border-atlas-line rounded-md overflow-hidden mb-7",
        className
      )}
    >
      {/* Lado texto */}
      <div className="px-9 py-8 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 atlas-caps text-atlas-primary-2 mb-3.5">
          <span className="size-1.5 rounded-full bg-atlas-primary" />
          {eyebrow}
        </div>
        <h2 className="font-serif text-[28px] font-medium tracking-[-0.015em] leading-[1.15] mb-2.5 text-atlas-ink">
          {title}{" "}
          {titleEm && (
            <em className="italic font-normal text-atlas-muted">{titleEm}</em>
          )}
        </h2>
        <p className="text-atlas-muted text-[14px] leading-[1.6] mb-5 max-w-[480px]">
          {description}
        </p>
        <div className="flex gap-2.5 mb-6">
          {/* AtlasButton imports — exemplo simplificado */}
          <button
            className="bg-atlas-primary text-white border border-atlas-primary hover:bg-atlas-primary-2 hover:border-atlas-primary-2 rounded-sm px-3.5 h-9 text-[13px] font-medium inline-flex items-center gap-2 transition-colors"
            onClick={primaryCta.onClick}
          >
            {primaryCta.label}
          </button>
          {secondaryCta && (
            <button
              className="bg-transparent text-atlas-muted hover:bg-atlas-surface-2 hover:text-atlas-ink border border-transparent rounded-sm px-3.5 h-9 text-[13px] font-medium transition-colors"
              onClick={secondaryCta.onClick}
            >
              {secondaryCta.label}
            </button>
          )}
        </div>

        {footerItems.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-3 pt-4 border-t border-atlas-line">
            {footerLabel && (
              <span className="atlas-caps text-atlas-muted-2">
                {footerLabel}
              </span>
            )}
            {footerItems.map((item) => (
              <span
                key={item}
                className="font-mono text-[11px] text-atlas-muted tracking-wide inline-flex items-center gap-1.5"
              >
                <span className="size-1 bg-atlas-primary rounded-full" />
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lado visual */}
      <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E40AF] to-atlas-primary min-h-[320px] overflow-hidden">
        {visual ?? <DefaultHeroVisual />}
        {visualStats.length > 0 && (
          <div className="absolute bottom-6 left-6 right-6 flex justify-between text-white">
            {visualStats.map((s, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="font-serif text-[22px] font-medium leading-none">
                  {s.value}
                </span>
                <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase opacity-70 mt-0.5">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultHeroVisual() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.1)_0%,transparent_40%),radial-gradient(circle_at_80%_20%,rgba(47,128,237,0.3)_0%,transparent_50%)]" />
      <span className="absolute -right-12 top-1/2 -translate-y-1/2 font-serif text-[320px] leading-[0.8] tracking-[-0.05em] text-white/[0.08]">
        C
      </span>
    </div>
  );
}
```

**Regras:**
- Title em **sentence case**, nunca Title Case ou ALL CAPS. Português escreve frases naturalmente, não títulos de filme.
- Visual usa gradient escuro `from-[#0F172A] via-[#1E40AF] to-atlas-primary` (slate-900 → blue-800 → primary). Nunca um azul saturado puro.
- Stats no rodapé do visual: serif para o número, mono para o label em caps.
- Chips do footer (cidades, datas) em mono 11px com pin azul minúsculo.

### 7B.4 `AtlasFiltersRow`

Linha unificada com search + chips de filtro por categoria.

```tsx
// src/components/atlas/page/AtlasFiltersRow.tsx
"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

interface AtlasFiltersRowProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  chips: FilterChip[];
  activeChipId?: string;
  onChipClick: (id: string) => void;
  className?: string;
}

export function AtlasFiltersRow({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Filtrar...",
  chips,
  activeChipId,
  onChipClick,
  className,
}: AtlasFiltersRowProps) {
  return (
    <div className={cn("flex items-center gap-2.5 mb-[18px]", className)}>
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-atlas-muted"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={cn(
            "w-full bg-atlas-surface border border-atlas-line rounded-md",
            "py-2.5 pl-9 pr-3 text-[13px] text-atlas-ink",
            "outline-none focus:border-atlas-ink-2 transition-colors"
          )}
        />
      </div>
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChipClick(chip.id)}
          className={cn(
            "px-3 py-1.5 rounded-sm border text-xs font-medium",
            "inline-flex items-center gap-1.5 transition-colors duration-150",
            chip.id === activeChipId
              ? "bg-atlas-primary-soft border-atlas-primary text-atlas-primary-2"
              : "bg-atlas-surface border-atlas-line-strong text-atlas-muted hover:border-atlas-ink-2 hover:text-atlas-ink"
          )}
        >
          {chip.label}
          {chip.count !== undefined && (
            <span className="font-mono text-[10.5px] opacity-70 atlas-num">
              {chip.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

### 7B.5 `AtlasSectionTabs`

Tabs **dentro** da página para filtrar entre estados (ex: Todos / Recentes / Quase lá / Pausados em `/in-progress`). Diferente das tabs de aula (que ficam abaixo do player).

```tsx
// src/components/atlas/navigation/AtlasSectionTabs.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionTab {
  id: string;
  label: string;
  count?: number;
}

interface AtlasSectionTabsProps {
  tabs: SectionTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function AtlasSectionTabs({
  tabs,
  activeId,
  onChange,
  className,
}: AtlasSectionTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-0 border-b border-atlas-line mb-[22px]",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 pt-2.5 pb-3 text-[13px] font-medium",
              "border-b-2 -mb-px inline-flex items-center gap-2",
              "transition-colors duration-150",
              active
                ? "text-atlas-ink border-atlas-primary"
                : "text-atlas-muted border-transparent hover:text-atlas-ink"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "font-mono text-[10.5px] px-1.5 py-px rounded-sm atlas-num",
                  active
                    ? "text-atlas-primary-2 bg-atlas-primary-soft"
                    : "text-atlas-muted-2 bg-atlas-surface-2"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

### 7B.6 `AtlasCourseCard`

Card de listagem de curso. Substitui `course-card-new.tsx` atual (que tem gradient/translate/shadow). Responde a 3 estados: novo, em curso, concluído.

```tsx
// src/components/atlas/course/AtlasCourseCard.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasCourseThumb } from "./AtlasCourseThumb";

interface AtlasCourseCardProps {
  href: string;
  title: string;
  category: string;            // "Tecidos moles"
  instructor?: string;
  lessonsCount: number;
  totalDuration: string;       // "2h 12m"

  /** Status do curso para o estudante */
  status: "new" | "in-progress" | "completed";
  /** % de progresso (0–100). Obrigatório se status !== "new" */
  progressPercent?: number;
  /** "3 / 5" — fração de aulas completadas */
  lessonsProgress?: string;
  /** Data de conclusão formatada (apenas se completed) */
  completedAt?: string;
  /** Variant visual da thumb (cor de gradient) */
  thumbVariant?: "default" | "alt" | "alt2" | "alt3" | "alt4";

  className?: string;
}

export function AtlasCourseCard({
  href,
  title,
  category,
  instructor,
  lessonsCount,
  totalDuration,
  status,
  progressPercent,
  lessonsProgress,
  completedAt,
  thumbVariant = "default",
  className,
}: AtlasCourseCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group bg-atlas-surface border border-atlas-line rounded-md overflow-hidden",
        "flex flex-col cursor-pointer transition-colors duration-150",
        "hover:bg-atlas-surface-2",
        className
      )}
    >
      <AtlasCourseThumb
        title={title}
        variant={thumbVariant}
        status={status}
      />

      <div className="px-4 pt-3.5 pb-4 flex-1 flex flex-col">
        <div className="font-mono text-[10px] text-atlas-muted tracking-[0.04em] mb-2 flex items-center gap-1.5">
          <span>{category}</span>
          <span className="text-atlas-muted-2">·</span>
          <span>{lessonsCount} aulas</span>
          <span className="text-atlas-muted-2">·</span>
          <span>{totalDuration}</span>
        </div>

        <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] leading-[1.3] text-atlas-ink mb-1 line-clamp-2">
          {title}
        </h3>

        {instructor && (
          <div className="text-xs text-atlas-muted mb-3">{instructor}</div>
        )}

        {status === "new" ? (
          <div className="mt-auto pt-3 border-t border-atlas-line flex items-center justify-between text-xs">
            <span className="font-mono text-atlas-muted">
              {lessonsCount} aulas
            </span>
            <span className="text-atlas-primary-2 font-medium inline-flex items-center gap-1">
              {progressPercent !== undefined ? "Iniciar curso" : "Matricular"}
              <ArrowRight className="size-3" strokeWidth={2} />
            </span>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-atlas-line">
            <div className="flex justify-between font-mono text-[11px] text-atlas-muted mb-1.5">
              <span>
                <strong className="text-atlas-ink font-medium">
                  {lessonsProgress?.split(" / ")[0]}
                </strong>{" "}
                / {lessonsProgress?.split(" / ")[1] ?? lessonsCount} aulas
              </span>
              <span>
                <strong className="text-atlas-ink font-medium">
                  {progressPercent}%
                </strong>
              </span>
            </div>
            <div className="h-0.5 bg-atlas-line rounded-sm overflow-hidden relative">
              <div
                className={cn(
                  "absolute left-0 top-0 h-full rounded-sm",
                  status === "completed" && "bg-atlas-success",
                  status === "in-progress" &&
                    (progressPercent! >= 50 ? "bg-atlas-warn" : "bg-atlas-primary")
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {completedAt && (
              <div className="mt-2 pt-2 border-t border-atlas-line font-mono text-[10px] text-atlas-muted tracking-[0.04em] text-center">
                Concluído em {completedAt}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
```

### 7B.7 `AtlasCourseThumb`

Placeholder visual de curso — gradient escuro + título serif. Substitui o uso de imagens estilo "Netflix poster" no projeto atual.

```tsx
// src/components/atlas/course/AtlasCourseThumb.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface AtlasCourseThumbProps {
  title: string;
  variant?: "default" | "alt" | "alt2" | "alt3" | "alt4";
  status?: "new" | "in-progress" | "completed";
  /** Imagem real do curso, se houver. Tem prioridade sobre o placeholder. */
  imageUrl?: string;
  className?: string;
}

const VARIANT_GRADIENT = {
  default: "from-[#0F172A] to-[#1E3A8A]",
  alt: "from-[#1E293B] to-[#047857]",
  alt2: "from-[#1E293B] to-[#92400E]",
  alt3: "from-[#0F172A] to-[#7F1D1D]",
  alt4: "from-[#1E293B] to-[#1E40AF]",
} as const;

export function AtlasCourseThumb({
  title,
  variant = "default",
  status,
  imageUrl,
  className,
}: AtlasCourseThumbProps) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] border-b border-atlas-line overflow-hidden",
        "bg-gradient-to-br",
        VARIANT_GRADIENT[variant],
        className
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(47,128,237,0.25)_0%,transparent_50%),radial-gradient(circle_at_75%_70%,rgba(255,255,255,0.06)_0%,transparent_40%)]" />
          <div className="absolute inset-0 flex items-center justify-center text-center px-4">
            <span className="font-serif font-medium text-[17px] tracking-[-0.005em] leading-[1.2] text-white/85">
              {title}
            </span>
          </div>
        </>
      )}

      {status && (
        <div
          className={cn(
            "absolute top-2.5 left-2.5",
            "font-mono text-[10px] uppercase tracking-[0.06em]",
            "px-2 py-0.5 bg-black/50 backdrop-blur-md text-white",
            "rounded-[2px] inline-flex items-center gap-1.5"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              status === "in-progress" && "bg-atlas-warn",
              status === "completed" && "bg-atlas-success",
              status === "new" && "bg-atlas-primary"
            )}
          />
          {status === "in-progress" && "Em curso"}
          {status === "completed" && "Concluído"}
          {status === "new" && "Novo"}
        </div>
      )}
    </div>
  );
}
```

**Decisão deliberada:** o thumb é tipográfico por padrão (gradient + título serif). Isso resolve o caso comum em educação onde nem todo curso tem arte profissional, e dá identidade visual coesa mesmo quando o catálogo cresce. Quando há `imageUrl`, ele é usado e o gradient vira fallback. Cinco variantes de gradient (default, alt, alt2, alt3, alt4) garantem variedade visual num grid sem virar caos cromático — escolha por categoria (ex: Emergência → alt, Ortopedia → alt2).

### 7B.8 `AtlasCourseRow` (lista densa)

Para a rota `/student/in-progress` — formato de **lista** em vez de grid. Otimizado para acompanhamento: mostra o que importa (próxima aula, % de progresso) sem ocupar espaço com thumb grande.

```tsx
// src/components/atlas/course/AtlasCourseRow.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasCourseRowProps {
  href: string;
  title: string;
  category: string;
  instructor?: string;
  lastLessonTitle: string;
  lastTimestamp: string;       // "2:14 / 18:42"
  progressPercent: number;
  lessonsProgress: string;     // "5 / 8 aulas"
  thumbVariant?: "default" | "alt" | "alt2" | "alt3" | "alt4";
  thumbLabel: string;          // ex: "Suturas" — texto curto na thumb
  onResume?: () => void;
}

const VARIANT_GRADIENT = {
  default: "from-[#0F172A] to-[#1E3A8A]",
  alt: "from-[#1E293B] to-[#047857]",
  alt2: "from-[#1E293B] to-[#92400E]",
  alt3: "from-[#0F172A] to-[#7F1D1D]",
  alt4: "from-[#1E293B] to-[#1E40AF]",
} as const;

export function AtlasCourseRow({
  href,
  title,
  category,
  instructor,
  lastLessonTitle,
  lastTimestamp,
  progressPercent,
  lessonsProgress,
  thumbVariant = "default",
  thumbLabel,
  onResume,
}: AtlasCourseRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "grid grid-cols-[96px_1fr_200px_110px] gap-[18px] items-center",
        "px-[18px] py-3.5 border-b border-atlas-line last:border-b-0",
        "hover:bg-atlas-surface-2 transition-colors duration-150"
      )}
    >
      {/* Thumb compacta */}
      <div
        className={cn(
          "relative w-24 h-[60px] rounded-sm overflow-hidden",
          "bg-gradient-to-br",
          VARIANT_GRADIENT[thumbVariant]
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(47,128,237,0.2)_0%,transparent_50%)]" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-1.5">
          <span className="font-serif text-[11px] font-medium leading-[1.2] text-white/80">
            {thumbLabel}
          </span>
        </div>
      </div>

      {/* Info principal */}
      <div className="min-w-0">
        <div className="font-mono text-[10px] text-atlas-muted tracking-[0.04em] mb-1 flex items-center gap-1.5">
          <span>{category}</span>
          {instructor && (
            <>
              <span className="text-atlas-muted-2">·</span>
              <span>{instructor}</span>
            </>
          )}
        </div>
        <div className="font-serif text-base font-medium tracking-[-0.005em] leading-[1.25] text-atlas-ink mb-1 truncate">
          {title}
        </div>
        <div className="text-xs text-atlas-muted flex items-center gap-1.5">
          Última: <strong className="font-medium text-atlas-ink">{lastLessonTitle}</strong>
          <span>·</span>
          <span className="font-mono text-atlas-warn-deep">{lastTimestamp}</span>
        </div>
      </div>

      {/* Progresso */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between font-mono text-[11px] text-atlas-muted">
          <span>
            <strong className="font-medium text-atlas-ink">
              {lessonsProgress.split(" / ")[0]}
            </strong>{" "}
            / {lessonsProgress.split(" / ")[1]}
          </span>
          <span>
            <strong className="font-medium text-atlas-ink">{progressPercent}%</strong>
          </span>
        </div>
        <div className="h-0.5 bg-atlas-line rounded-sm overflow-hidden relative">
          <div
            className="absolute left-0 top-0 h-full bg-atlas-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <button
          className={cn(
            "bg-atlas-primary text-white border border-atlas-primary",
            "hover:bg-atlas-primary-2 hover:border-atlas-primary-2",
            "rounded-sm px-2.5 h-8 text-xs font-medium",
            "inline-flex items-center gap-1.5 transition-colors"
          )}
          onClick={(e) => {
            e.preventDefault();
            onResume?.();
          }}
        >
          Retomar
          <Play className="size-3" fill="currentColor" />
        </button>
      </div>
    </Link>
  );
}
```

### 7B.9 `AtlasEmptyState`

Estado vazio editorial. Substitui o atual padrão `bg-gray-100 rounded-2xl + ícone 24x24 + h3 font-bold`.

```tsx
// src/components/atlas/page/AtlasEmptyState.tsx
import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AtlasEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: AtlasEmptyStateProps) {
  return (
    <div
      className={cn(
        "px-7 pt-14 pb-16 text-center",
        "bg-atlas-surface border border-dashed border-atlas-line rounded-md",
        className
      )}
    >
      <div className="size-12 mx-auto mb-[18px] text-atlas-muted-2 flex items-center justify-center">
        <Icon className="size-12" strokeWidth={1.25} />
      </div>
      <h3 className="font-serif text-[17px] font-medium tracking-[-0.005em] mb-1.5 text-atlas-ink">
        {title}
      </h3>
      {description && (
        <p className="text-atlas-muted text-[13px] max-w-[360px] mx-auto mb-[18px] leading-[1.55]">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
```

**Uso:**
```tsx
import { Award } from "lucide-react";

<AtlasEmptyState
  icon={Award}
  title="Nenhum curso concluído ainda"
  description="Conclua um curso para vê-lo aqui e acessar o certificado em PDF."
  action={
    <AtlasButton variant="primary" onClick={() => router.push("/student/in-progress")}>
      Ver cursos em andamento
      <ArrowRight strokeWidth={1.75} />
    </AtlasButton>
  }
/>
```

**Anti-padrão a evitar:** o atual `<div className="p-6 bg-gray-100 rounded-2xl inline-block mb-6"><Icon className="h-24 w-24 text-gray-400" /></div>` — ícone gigante (24×24 = 96px) num círculo cinza grande. Atlas usa ícone 48px sem container colorido, dashed border no card.

### 7B.10 `AtlasCompletionStrip`

Banner de reconhecimento quieto. Substitui o atual "from-green-50 to-blue-50 gradient + Trophy emoji". Border-left colorido + ícone pequeno + texto serif compacto.

```tsx
// src/components/atlas/page/AtlasCompletionStrip.tsx
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasCompletionStripProps {
  title: string;
  description?: string;
  onDismiss?: () => void;
  variant?: "success" | "info";
  className?: string;
}

export function AtlasCompletionStrip({
  title,
  description,
  onDismiss,
  variant = "success",
  className,
}: AtlasCompletionStripProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-[18px] px-5 py-4 mb-7",
        "bg-atlas-surface border border-atlas-line rounded-md",
        variant === "success" && "border-l-[3px] border-l-atlas-success",
        variant === "info" && "border-l-[3px] border-l-atlas-primary",
        className
      )}
    >
      <div
        className={cn(
          "size-9 shrink-0 rounded-full flex items-center justify-center",
          variant === "success" && "bg-atlas-success/10 text-atlas-success",
          variant === "info" && "bg-atlas-primary/10 text-atlas-primary"
        )}
      >
        <Check className="size-4" strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <div className="font-serif text-[15px] font-medium tracking-[-0.005em] mb-0.5">
          {title}
        </div>
        {description && (
          <div className="text-atlas-muted text-[12.5px]">{description}</div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-atlas-muted hover:text-atlas-ink hover:bg-atlas-surface-2 px-3 h-8 text-xs rounded-sm transition-colors"
        >
          Dispensar
        </button>
      )}
    </div>
  );
}
```

### 7B.11 `AtlasLoadingBar` & `AtlasSkeletonCard`

Loading discreto. Barra fina horizontal animada no topo do conteúdo, e skeleton cards sem cor saturada.

```tsx
// src/components/atlas/page/AtlasLoadingBar.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function AtlasLoadingBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-0.5 bg-atlas-line relative overflow-hidden rounded-sm",
        className
      )}
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
```

```tsx
// src/components/atlas/page/AtlasSkeletonCard.tsx
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
    </div>
  );
}

function Shimmer() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        style={{ animation: "atlas-shimmer 1.6s infinite" }}
      />
      <style>{`
        @keyframes atlas-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
}
```

**Anti-padrão atual:** `<Loader2 className="h-8 w-8 animate-spin text-blue-600" />` centralizado na tela. Atlas prefere skeleton mostrando a estrutura final + barra superior — passa percepção de progresso e revela a forma da página antes do conteúdo carregar.

---

## 7C. Page templates — composições canônicas

Cada rota de listagem do estudante segue um template fixo. **Nunca improvise composição** — siga uma destas três:

### Template A · Catálogo (`/student/courses`)

```tsx
<AtlasShell>
  <AtlasTopBar />
  <AtlasPageHeader
    metaLabel="Biblioteca · Catálogo"
    title="Todos os"
    titleEm="cursos disponíveis"
    actions={<><FiltersButton /><SortButton /></>}
  >
    <AtlasStatsInline stats={[...]} />
  </AtlasPageHeader>

  <PageBody>
    {hasPromo && <AtlasHeroPromo {...promoProps} />}
    <AtlasFiltersRow {...filtersProps} />

    {loading ? (
      <>
        <AtlasLoadingBar className="mb-[18px]" />
        <CourseGrid>{[...Array(8)].map(() => <AtlasSkeletonCard />)}</CourseGrid>
      </>
    ) : courses.length === 0 ? (
      <AtlasEmptyState icon={Library} title="..." />
    ) : (
      <CourseGrid>{courses.map(c => <AtlasCourseCard {...c} />)}</CourseGrid>
    )}
  </PageBody>
</AtlasShell>
```

**Grid:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]`

### Template B · Em andamento (`/student/in-progress`)

```tsx
<AtlasShell>
  <AtlasTopBar />
  <AtlasPageHeader
    metaLabel="Biblioteca · Acompanhamento"
    title="Em andamento"
    titleEm="— continue de onde parou"
    actions={<SortButton />}
  >
    <AtlasStatsInline stats={[
      { value: activeCount, label: "Cursos ativos" },
      { value: avgProgress, format: "mono", label: "Progresso médio" },
      { value: lessonsWatched, total: `/ ${totalLessons}`, label: "Aulas assistidas" },
      { value: timeWatched, format: "mono", label: "Tempo total assistido" },
    ]} />
  </AtlasPageHeader>

  <PageBody>
    <AtlasSectionTabs tabs={[
      { id: "all", label: "Todos", count: courses.length },
      { id: "recent", label: "Recentes", count: recentCount },
      { id: "almost", label: "Quase lá", count: almostCount },
      { id: "paused", label: "Pausados", count: pausedCount },
    ]} activeId={activeTab} onChange={setActiveTab} />

    {loading ? (
      <ListSkeleton rows={5} />
    ) : courses.length === 0 ? (
      <AtlasEmptyState icon={Clock} title="Nenhum curso em andamento" ... />
    ) : (
      <div className="bg-atlas-surface border border-atlas-line rounded-md overflow-hidden">
        {courses.map(c => <AtlasCourseRow {...c} />)}
      </div>
    )}
  </PageBody>
</AtlasShell>
```

**Decisão:** essa página usa **lista densa**, não grid. O aluno aqui quer comparar progresso entre cursos rapidamente — grid de capas obriga a ler N títulos para encontrar o curso certo. Lista mostra título, última aula assistida com timestamp, progresso bar e CTA "Retomar" tudo numa linha varrida em segundos.

### Template C · Concluídos (`/student/completed`)

```tsx
<AtlasShell>
  <AtlasTopBar />
  <AtlasPageHeader
    metaLabel="Biblioteca · Histórico"
    title="Concluídos"
    titleEm="— sua trajetória até aqui"
    actions={<ExportCertificatesButton />}
  >
    <AtlasStatsInline stats={[
      { value: completedCount, label: "Cursos concluídos" },
      { value: lessonsCount, label: "Aulas finalizadas" },
      { value: timeSpent, format: "mono", label: "Tempo total dedicado" },
      { value: "100%", format: "mono", label: "Taxa de conclusão" },
    ]} />
  </AtlasPageHeader>

  <PageBody>
    {showRecognition && (
      <AtlasCompletionStrip
        title={`Boa! Você concluiu ${completedCount} cursos.`}
        description="Os certificados ficam disponíveis para download por tempo indeterminado em cada curso."
        onDismiss={dismissRecognition}
      />
    )}

    {courses.length === 0 ? (
      <AtlasEmptyState icon={Award} title="Nenhum curso concluído ainda" ... />
    ) : (
      <CourseGrid>
        {courses.map(c => (
          <AtlasCourseCard
            key={c.id}
            {...c}
            status="completed"
            completedAt={formatDate(c.completedAt)}
          />
        ))}
      </CourseGrid>
    )}
  </PageBody>
</AtlasShell>
```

### Template D · "Meus Cursos" (`/student/my-courses`)

A versão atual é estilo Netflix com 3-4 carrosséis horizontais (Continue Assistindo, Meus Cursos, Cursos Disponíveis, etc.). **Atlas rejeita esse padrão** para a área de estudo — carrossel é para consumo casual, não para um aluno que precisa encontrar rapidamente o que já começou.

**Migração recomendada:** transformar `/student/my-courses` em uma **agregação inteligente** que lista as 3 seções verticalmente, sem carrossel, e cada uma tem um link "ver todos" para a rota dedicada:

```tsx
<AtlasShell>
  <AtlasPageHeader metaLabel="Biblioteca" title="Meus" titleEm="cursos">
    <AtlasStatsInline stats={[...]} />
  </AtlasPageHeader>

  <PageBody>
    {/* Seção 1: continue de onde parou (até 3 cards) */}
    <Section title="Continue de onde parou" linkTo="/student/in-progress">
      <CourseGrid>{topInProgress.slice(0, 3).map(...)}</CourseGrid>
    </Section>

    {/* Seção 2: matriculados, não iniciados */}
    <Section title="Aguardando início" linkTo="/student/courses?filter=enrolled">
      <CourseGrid>{notStarted.slice(0, 4).map(...)}</CourseGrid>
    </Section>

    {/* Seção 3: recém-concluídos */}
    {recentlyCompleted.length > 0 && (
      <Section title="Concluídos recentemente" linkTo="/student/completed">
        <CourseGrid>{recentlyCompleted.slice(0, 4).map(...)}</CourseGrid>
      </Section>
    )}
  </PageBody>
</AtlasShell>
```

**Por que rejeitar carrossel:**
- Não é exploratório (Netflix) — é referencial (biblioteca)
- Esconde N-1 cursos atrás de scroll horizontal — o aluno não sabe quantos tem ainda
- Quebra a hierarquia tipográfica que Atlas estabeleceu
- Acessibilidade ruim (gestos horizontais conflitam com swipe nativo no trackpad)

Se o cliente insistir em carrossel, faça apenas em `/student/courses` para a seção "Hero · Destaques editoriais" e nunca para "Meus cursos" — o terreno semântico é diferente.

---

## 8. Feedback patterns

Atlas reconhece **4 níveis de feedback** ao usuário, escolhidos pela presença ou ausência de confirmação visual no DOM imediato. A regra geral: **se a UI já confirma a ação visualmente, não use toast.**

### 8.1 Hierarquia (regras de ouro)

| Nível | Quando usar | Exemplo | Auto-dismiss |
|---|---|---|---|
| **0 — silencioso** | Ação tem feedback visual no contexto (lista atualiza, item aparece, ícone muda) | Like (coração enche), marcador criado (pin aparece na timeline + entrada na lista), nota salva (entra na lista), curso favoritado (ícone enche) | — sem toast |
| **1 — toast minimal** | Ação banal sem confirmação visual contextual | "Configurações salvas" numa página sem indicação contextual de "salvo" | 2.5s |
| **2 — toast com undo** | Ação reversível que precisa de oportunidade de desfazer | "Nota removida" + botão "Desfazer", "Curso desmatriculado" + botão "Refazer" | 5s |
| **3 — toast persistente** | Erros, falhas de rede, bloqueios | "Falha ao salvar — verifique sua conexão" | sem dismiss (manual) |

### 8.2 Casos de remoção identificados na auditoria

Removidos durante Sprint 6:

| Antes | Por que removido | Substituição |
|---|---|---|
| `toast.success("Marcador criado")` | Pin aparece na timeline + card Marcadores recebe entrada nova | Sem toast (nível 0) |
| `toast.success("Anotação criada")` | Entra imediato na lista de Anotações | Sem toast (nível 0) |
| `toast.success("Resumo gerado")` | Card de síntese aparece com conteúdo | Sem toast (nível 0); apenas `atlasToast.loading()` durante geração |
| `toast.success("Resumo atualizado")` | Modal mostra conteúdo novo após save | Sem toast (nível 0) |
| `toast.success("Download iniciado")` | Browser indica download nativamente | Sem toast (nível 0) |
| `toast.success("Resumo excluído")` | Item desaparece da lista | Sem toast (nível 0) |
| `toast.success("Tópico criado no fórum")` | Modal fecha + redirect pra rota do tópico | Sem toast (nível 0) |

### 8.3 Casos de manutenção

Mantém-se toast para:
- **Erros de rede**: `atlasToast.error("Falha ao salvar", { description: "Verifique sua conexão e tente novamente" })`
- **Validação de formulário** (sem inline error): `atlasToast.warning("Título muito curto")`
- **Loading de longa duração** com substituição: `atlasToast.loading("Gerando síntese com IA…")` → dismiss manual ao concluir
- **Ações irreversíveis**: deletar curso, cancelar matrícula, expulsar usuário

### 8.4 API canônica — `atlasToast`

**NÃO use `toast.*` do sonner diretamente.** Canal único: `atlasToast.*` em `@/components/atlas`.

```ts
import { atlasToast } from "@/components/atlas";

// Nível 1 — minimal
atlasToast.success("Curso favoritado");
atlasToast.info("Anotação removida");

// Nível 2 — com undo
atlasToast.withAction("Anotação removida", {
  label: "Desfazer",
  onClick: () => restoreNote(noteId),
});

// Nível 3 — persistente (erros)
atlasToast.error("Falha ao salvar", {
  description: "Verifique sua conexão e tente novamente",
});

// Loading com dismiss programático
const id = atlasToast.loading("Enviando…");
await uploadFile();
atlasToast.dismiss(id);

// Promise wrapper (loading → success/error automático)
atlasToast.promise(saveDraft(), {
  loading: "Salvando rascunho…",
  success: "Rascunho salvo",
  error: "Falha ao salvar",
});
```

### 8.5 Visual

- Surface neutra `bg-atlas-surface` + `border 1px atlas-line` + `border-left 3px` colorida por tipo
- **Não use cor saturada full-bleed** (proibido na área Atlas — viola §4)
- Tipos:
  - `success` → border-left atlas-success + ícone `CheckCircle2` success
  - `error` → border-left atlas-accent + ícone `AlertCircle` accent
  - `warning` → border-left atlas-warn + ícone `AlertTriangle` warn-deep
  - `info` → border-left atlas-primary + ícone `Info` primary
  - `loading` → border-left atlas-line-strong + spinner muted
- Position: `top-right` desktop, `top-center` mobile (não conflita com bottom bar)
- Mobile offset respeita safe-area
- Action button: AtlasButton primary sólido (sem gradient)
- Cancel button: AtlasButton outline

### 8.6 Padrão de feedback inline (alternativa ao toast nível 1)

Quando o feedback contextual não é óbvio mas o toast seria intrusivo, usar **transformação temporária do botão**:

```tsx
// Estado: 'idle' | 'saving' | 'saved'
const [state, setState] = React.useState<"idle" | "saving" | "saved">("idle");

const handleSave = async () => {
  setState("saving");
  await saveOperation();
  setState("saved");
  setTimeout(() => setState("idle"), 1500); // volta ao normal
};

<AtlasButton variant="outline">
  {state === "saved" ? "✓ Salvo" : "Salvar"}
</AtlasButton>
```

Duration recomendada: **1.5s** (suficiente pra registrar, curto pra não atrapalhar próxima ação).

---

## 9. Interações

### 8.1 Hovers

- Links/botões: `transition-colors duration-150` — muda `background` ou `color`, nunca `shadow`, `transform`, `scale`
- Note rows: `hover:bg-atlas-surface-2`
- Lesson items da sidebar: `hover:bg-atlas-surface-2`; ativo é `bg-atlas-primary-soft` (não muda no hover)

### 8.2 Focus

- Inputs: `focus-visible:border-atlas-ink-2` (não use ring colorido)
- Botões: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atlas-primary`
- A regra global `*:focus-visible` existente no `globals-premium.css` já cobre isso.

### 8.3 `prefers-reduced-motion`

Já existe em `globals-premium.css` — respeita automaticamente. Nenhum componente Atlas deve ter animação que ignore essa regra.

### 8.4 `framer-motion`

Use com parcimônia:
- Entrada/saída do bottom sheet — já coberto pelo Radix Dialog
- Revelação de notas ao criar — opcional, fade + height
- **Nunca** anime `scale` ou `rotate` em hover na área Atlas (isso é gamificação, domínio do admin).

---

## 10. Dark mode

O projeto já tem dark mode. Na área Atlas:

- Todos os tokens Atlas têm versão dark no bloco `.dark` (seção 2.2)
- Video player: ignora dark mode (fundo sempre `#0A0A0A`)
- Highlights `atlas-key`: o gradient amarelo continua funcionando em dark (testar)
- Ícone do logo mark: branco sobre primary — mesmo em dark

Componentes Atlas **não precisam de código condicional** pra dark mode — tudo vem dos tokens CSS.

---

## 11. Migração — ordem recomendada

Não refatore tudo de uma vez. Faça por telas, de baixo risco para alto:

**Sprint 1: Fundação (1 dia)**
1. Adicionar import Source Serif 4 em `globals-premium.css`
2. Adicionar bloco `ATLAS SEMANTIC TOKENS` em `:root` e `.dark`
3. Adicionar exports no `@theme inline`
4. Adicionar utilities `.atlas-caps`, `.atlas-mono`, `.atlas-num`, `.atlas-key`
5. Criar pasta `src/components/atlas/` + `primitives/`
6. Criar `AtlasButton`, `AtlasCard`, re-exports em `index.ts`
7. **Smoke test:** renderizar um `<AtlasButton>` numa página qualquer e verificar se as classes resolvem

**Sprint 2: Tela de aula (2–3 dias)**
8. `AtlasPlayer` (wrapper do video.js/hls.js existente)
9. `AtlasPlayerTimeline` (com note pins + chapter dividers)
10. `AtlasLessonHeader`, `AtlasStatsStrip`, `AtlasStickyActions`
11. `AtlasNoteRow`, `AtlasNotesList`
12. `AtlasSynthesisCard`
13. `AtlasModuleSidebar` (desktop)
14. Compor `/student/courses/[courseId]/lessons/[lessonId]/page.tsx` com esses componentes

**Sprint 3: Responsivo / mobile (1–2 dias)**
15. `AtlasTabBar`, `AtlasModuleSheet`
16. `AtlasRail` com estado colapsado
17. Adaptar a rota de aula para usar Sheet em `md:hidden`

**Sprint 4: Home do estudante (1 dia)**
18. `AtlasCourseHeader`, `AtlasStagesProgress`
19. Reescrever `components/student/course-card-new.tsx` como `AtlasCourseCard` (sem gradient, sem card-hover)
20. Rota `/student/courses` usando `AtlasCourseCard`

**Sprint 5: Polimento (contínuo)**
21. Substituir emoji em títulos por ícones Lucide
22. Migrar toast Sonner para estilo Atlas (surface + border + texto colorido, sem bg saturado full-bleed)
23. Auditar uso de `card-hover`, `shadow-glow-*`, `bg-gradient-*` na área do estudante e remover

---

## 12. Checklist de review pré-PR

Antes de mergear qualquer mudança na área do estudante:

- [ ] Todos os imports de componentes vêm de `@/components/atlas/*` (não de `@/components/ui/*`)?
- [ ] Nenhum `bg-gradient-*`, `shadow-lg`, `card-hover`, `hover:-translate-y-*`, `active:scale-*`?
- [ ] Títulos usam `font-serif font-medium tracking-[-0.01em]`?
- [ ] Todos os números (tempo, porcentagem, contagem) usam `atlas-mono` ou `atlas-num`?
- [ ] Timestamps e pins estão em `text-atlas-warn` / `bg-atlas-warn`, não em primary?
- [ ] CTAs: um `variant="primary"` por dobra, resto `outline` ou `ghost`?
- [ ] `rounded-sm` (3px) em botões, `rounded-md` (6–8px) em cards, nada de `rounded-xl`+?
- [ ] Ícones Lucide com `strokeWidth={1.5}` explícito no JSX?
- [ ] Nenhum emoji em labels ou títulos?
- [ ] Dark mode testado (toggle `.dark` no `<html>`) — tokens Atlas renderizam corretos?
- [ ] Cores vêm sempre de classes `bg-atlas-*` / `text-atlas-*`, nunca hex hardcoded no JSX?
- [ ] Copy em PT-BR, vocabulário clínico ("aula", "técnica", "protocolo")?

---

## 13. Referência visual canônica

Dois artefatos HTML foram gerados durante o design:

- **Desktop:** `artifact: projeto-cirurgiao-redesign`
- **Mobile (3 telas):** `artifact: projeto-cirurgiao-mobile`

Salve-os como `docs/atlas/reference-desktop.html` e `docs/atlas/reference-mobile.html` no repo. Em dúvidas de spacing, cor exata ou estrutura que este doc não cobrir, abra esses arquivos e extraia os valores do CSS. Eles são a implementação canônica deste DS.

---

*Versão 2.0 — "Atlas / Next.js". Última atualização: 23 de abril de 2026.*
*Alinhado com stack real do projeto: Next.js 15 + React 19 + Tailwind v4 + shadcn new-york + Plus Jakarta Sans.*