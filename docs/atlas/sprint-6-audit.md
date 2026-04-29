# Sprint 6 — Mobile Responsive Audit

**Worktree:** `D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\video-player-skin\`
**Viewports cobertos:** 320 / 375 / 414 / 768 / 1024 px
**Data:** 2026-04-25
**Severidade:**
- **crítica** — impede uso ou quebra estrutura
- **alta** — visual quebrado (overflow horizontal, sobreposição, ilegibilidade)
- **média** — apertado mas funciona; polish necessário
- **baixa** — refinamento, não bloqueia

Cobertura: **34 itens** mapeados em 28 componentes Atlas + 3 itens transversais.

**Reclassificações (revisão pós-audit, aprovadas):**
- Item 9 (AtlasModuleSidebar mobile) Alta → **Crítica**: navegação entre aulas é função principal da tela; sem ModuleSheet aluno fica preso
- Item 4 (FAB chat) Crítica → **Alta**: feio + viola DS, mas não impede uso. Prioridade de execução mantida alta
- Item 34 (Tap targets) Baixa → **Alta**: acessibilidade não é polish opcional; AtlasButton sm h-8 (32px) viola Apple HIG/Material

**Status:**
- Item 10 (AtlasTabBar global): ✅ **componente implementado** em `src/components/atlas/shell/AtlasTabBar.tsx`. Pendente apenas integração no layout student + regra T1.
- Item 19 (AtlasHeroPromo): **diferido** — N/A enquanto não houver instância renderizando. Item ressuscita quando o HeroBanner atual da `/student/courses` (gradient azul "A Nova Turma De Pós-Graduação") for re-skinnado.

---

## CRÍTICA (4 itens)

### 1. AtlasLessonInfo — caps colapsa em coluna vertical

- **Arquivo:** `src/components/atlas/lesson/AtlasLessonInfo.tsx`
- **Viewport quebra:** ≤ 480px confirmado (screenshot 414×~900 visto)
- **Sintoma:** `flex items-start justify-between gap-6` com `<div min-w-0 flex-1>` esquerda e `<div flex gap-2>` direita com 4 botões (LikeButton + Anterior + Próxima + Concluir). Em narrow, esquerda colapsa pra ~80px e caps "AULA 05 · MÓDULO DE TESTE" wrappa em 3 linhas verticais ("AUL/05/·MÓDULO/DE TESTE"). Title serif fica espremido.
- **Fix proposto:** stack vertical sempre em < 768px. Ordem mobile: caps full-width → lessonNum → title → description → actions row final com flex-wrap. Em ≥ 768px mantém side-by-side.
- **Filhos afetados:** VideoLikeButton (dentro do actions slot), AtlasButton variants

### 2. Player controls amassados em mobile

- **Arquivo:** `src/components/video-player/hls-video-player.tsx` (interno) + envelope `src/components/atlas/lesson/AtlasPlayerWrapper.tsx`
- **Viewport quebra:** ≤ 414px confirmado
- **Sintoma:** controles HLS nativos em uma única linha: timestamp `0:24/7:57` + play + 1× + volume + CC + fullscreen. Timestamp mascarado pelo gradient escuro do controle. Timeline esmagada pra ~2px de altura.
- **Fix proposto:** `AtlasPlayerWrapper` ganha modo mobile (< 640px). Estratégias possíveis em ordem de simplicidade:
  - **A** — adicionar CSS overrides via media-chrome custom properties: timeline em row dedicada acima dos botões + buttons em 2 linhas (linha 1: play+seek+timestamp / linha 2: volume+CC+settings+fullscreen)
  - **B** — alterar `--media-button-icon-width/height` em mobile pra 16px (já é 18px) e reduzir gap entre botões
  - **C** — esconder buttons secundários (volume control) atrás de menu kebab em mobile
- **Recomendação:** combinação A+B. Timeline isolada em row acima é o ganho maior.
- **Custo:** alto (1 dia + teste em iOS Safari real)

### 3. AtlasLessonHeader — progressNum colide com title

- **Arquivo:** `src/components/atlas/lesson/AtlasLessonHeader.tsx`
- **Viewport quebra:** ≤ 500px
- **Sintoma:** `flex items-baseline justify-between gap-6` com title à esquerda e progressDone/progressTotal+caps à direita. Em narrow, esquerda colapsa muito; serif title 26px wrappa em 4+ linhas enquanto direita ocupa ~30% do width.
- **Fix proposto:** stack vertical em < 640px. Ordem mobile: backLabel → caps → title (full-width) → progressNum block (alinhado esquerda também). AtlasStagesProgress (children) já fica abaixo, mantém.
- **Filhos afetados:** AtlasStagesProgress

### 4. FAB chat roxo gradient sobreposto à tab bar

- **Arquivo:** `src/components/chatbot/video-chat-widget.tsx` (e/ou `chat-widget.tsx` global no layout student)
- **Viewport quebra:** todos
- **Sintoma:** círculo roxo gradient `bg-gradient-to-r from-purple-* to-blue-*` (provável) flutuando bottom-right via `position: fixed`. Conflita com AtlasStickyActions na watch route e vai conflitar com AtlasTabBar global em outras rotas. Gradient saturado viola DS § 4.
- **Fix proposto:** re-skin pra padrão Atlas:
  - Botão circular `size-12 rounded-full` (mantém affordance FAB)
  - `bg-atlas-surface border border-atlas-line shadow-[0_8px_24px_rgba(0,0,0,0.08)]`
  - Ícone `MessageSquare`/`Sparkles` stroke-1.5 `text-atlas-primary`
  - Hover `bg-atlas-surface-2`
  - Active state opcional: badge accent quando há resposta nova
- **Posicionamento mobile:** `bottom-[calc(56px+16px+env(safe-area-inset-bottom))]` pra ficar acima da AtlasTabBar global (mobile) ou AtlasStickyActions (watch). Desktop: bottom-6 right-6 (atual).
- **Item esquecido da Sprint 4.5** — assumido fora de escopo na 4.5 mas na prática quebra DS

---

## ALTA (10 itens)

### 5. AtlasPageHeader — actions colidem com title em narrow

- **Arquivo:** `src/components/atlas/page/AtlasPageHeader.tsx`
- **Viewport quebra:** ≤ 640px
- **Sintoma:** `flex items-end justify-between gap-6` esquerda meta+title, direita actions (Filtros + Ordenar). Title `font-serif text-[26px]` wrappa em 3+ linhas; actions ocupam ~40% comprimindo título.
- **Fix:** mobile stack — caps + serif title full-width, actions em row própria abaixo (flex-wrap, gap-2).

### 6. AtlasStatsInline — overflow horizontal com 4 stats

- **Arquivo:** `src/components/atlas/page/AtlasStatsInline.tsx`
- **Viewport quebra:** ≤ 768px com 4 stats (catalog, in-progress, completed, my-courses)
- **Sintoma:** `flex pt-[18px]` com 4 colunas `flex-1` separadas por `border-r pr-7 mr-7` = ~120px+ por stat = mínimo 480px sem padding. Em 320-414px, overflow horizontal com scroll ou clipping.
- **Fix:** em < 768px → `grid-cols-2 gap-x-5 gap-y-4`, sem `border-r`, ao invés disso `border-t` apenas no segundo row (visual de 2 fileiras de 2 stats). Em 3 stats, vira 2-col com último ocupando full row ou mantém 3-col compacto.

### 7. AtlasCourseRow — grid fixo quebra em narrow

- **Arquivo:** `src/components/atlas/course/AtlasCourseRow.tsx`
- **Viewport quebra:** < 768px
- **Sintoma:** grid `[96px_1fr_200px_110px]` = 506px mínimo. Em mobile, overflow horizontal ou squeeze severo.
- **Fix:** mobile (< 768px) vira card empilhado:
  - Thumb: aspect-video full-width (top)
  - Body: padding 14px com category caps + title serif + lastMeta
  - Progress row inline (mono X/Y + %) + barra full-width
  - CTA "Retomar" full-width AtlasButton primary
- Item pode reaproveitar AtlasCourseCard variant ou viver como 2 layouts.

### 8. AtlasStagesProgress — 4 stages apertam em narrow

- **Arquivo:** `src/components/atlas/course/AtlasStagesProgress.tsx`
- **Viewport quebra:** ≤ 640px com 4 stages
- **Sintoma:** `flex pt-3.5` com `flex-1 px-5 border-l` por stage. Em 320px, cada stage tem ~70px width — texto "0 / 2 em andamento" wrappa em 3 linhas, num quase ilegível.
- **Fix:** opções:
  - **A** — em < 768px, layout horizontal scroll com snap: cada stage com min-w-[160px], scroll-snap-type x mandatory
  - **B** — em < 768px, stages viram lista vertical com border-t entre, padding inline mais compacto
  - **C** — collapsed por padrão em mobile com toggle "Ver progresso"
- **Recomendação:** A (horizontal scroll com snap) — preserva visualização global, fácil de implementar, não esconde info

### 9. AtlasModuleSidebar — não funciona mobile

- **Arquivo:** `src/components/atlas/course/AtlasModuleSidebar.tsx` + watch page wrapping `<aside hidden lg:flex>`
- **Viewport quebra:** < 1024px (lg breakpoint)
- **Sintoma:** sidebar `hidden lg:flex` = invisível em mobile/tablet. Aluno mobile sem acesso à lista de aulas do módulo.
- **Fix:** implementar `AtlasModuleSheet` (DS §7.6 já tem código de referência usando Radix Dialog). Trigger via botão "Aulas" da bar contextual da watch route. Sheet bottom slide-up `h-[78vh]`. Conteúdo = mesmo AtlasModuleSidebar com `flush={false}` adaptado.
- Item 8 do plano de Sprint 6 já cobria.

### 10. AtlasTabBar global — falta implementar

- **Arquivo:** novo, `src/components/atlas/shell/AtlasTabBar.tsx`
- **Viewport:** < md (mobile only)
- **Sintoma:** atualmente mobile usa drawer hamburger top-left (StudentSidebar.MobileSidebar). Decisão Sprint 6: substituir por bottom tab bar.
- **Fix:** implementar conforme `reference-mobile.html` linhas 481-502:
  - position fixed bottom + safe-area-inset-bottom
  - bg `rgba(255,255,255,0.92)` + backdrop-blur-20
  - border-top atlas-line
  - 5 slots flex-1 (Cursos / Em curso / Atlas / Fórum / Perfil)
  - Ícones 20px stroke 1.5 (active 1.9)
  - Active color = atlas-primary
  - Label 10px font-medium tracking 0.01em
- Hide em `/student/courses/[id]/watch/[videoId]` (regra contextual, item 9 plano)

### 11. AtlasFiltersRow — chips overflow horizontal

- **Arquivo:** `src/components/atlas/page/AtlasFiltersRow.tsx`
- **Viewport quebra:** ≤ 600px
- **Sintoma:** `flex items-center gap-2.5` com search `flex-1` + chips inline + trailing. Em mobile, chips empurrados pra fora ou cortados.
- **Fix:** `flex-wrap` permitido. Search ocupa primeira linha completa. Chips wrap em segunda linha. Em < 480px, search fica `w-full`, chips em row própria com horizontal scroll opcional.

### 12. AtlasLessonStats — 3-4 stats apertam

- **Arquivo:** `src/components/atlas/lesson/AtlasLessonStats.tsx`
- **Viewport quebra:** ≤ 480px
- **Sintoma:** `flex flex-wrap gap-x-6` já tem flex-wrap, mas com 3+ stats e textos longos ("Tempo assistido 1:25") wrap pode ficar estranho.
- **Fix:** em < 640px, manter wrap mas com `gap-x-4 gap-y-2`. Verificar se cada stat respeita min-width pra não quebrar `<strong>` em linha separada do label.

### 13. AtlasNotesList header — botão "+ Nova em X:XX" colide com título

- **Arquivo:** `src/components/atlas/notes/AtlasNotesList.tsx`
- **Viewport quebra:** ≤ 400px
- **Sintoma:** `<AtlasCardHeader>` é flex `items-center justify-between`. Esquerda: ícone + AtlasCardTitle "Anotações ancoradas" + count. Direita: AtlasButton "Nova em 0:38". Em narrow, button width + title width > viewport.
- **Fix:** em < 480px, header stack vertical: title row + button row full-width abaixo. Compact variant já reduz mas não muda layout.

### 14. AtlasMaterialsList / AtlasBookmarksList / AtlasChaptersList headers

- **Arquivos:** `materials/AtlasMaterialsList.tsx`, `bookmarks/AtlasBookmarksList.tsx`, `chapters/AtlasChaptersList.tsx`
- **Viewport quebra:** ≤ 380px (sem trailing button, menos crítico)
- **Sintoma:** mesmo padrão AtlasCardHeader; sem trailing button funciona melhor mas título serif ainda pode wrap em narrow extremo.
- **Fix:** confirmar `AtlasCardTitle` permite line-clamp-1 ou truncate. Compact variant já pode bastar.

---

## MÉDIA (12 itens)

### 15. AtlasSynthesisCard — footer wrap

- **Arquivo:** `src/components/atlas/synthesis/AtlasSynthesisCard.tsx`
- **Viewport quebra:** ≤ 480px
- **Sintoma:** footer com 3 botões (Exportar / Regenerar / extraActions) + usageLabel `ml-auto`. Em narrow, usageLabel wrappa abaixo ou sobre os botões.
- **Fix:** em < 480px, usageLabel vira linha separada acima ou abaixo do row de botões.

### 16. AtlasAssessmentCTA — stats grid 3-col em narrow

- **Arquivo:** `src/components/atlas/course/AtlasAssessmentCTA.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** `grid-cols-3` para 3 stats fica apertado em 320px. Cada stat tem ~85px = label caps + valor mono + ícone — caps pode wrap.
- **Fix:** em < 480px, `grid-cols-3` mantém mas font-size reduzido ou troca pra 1-col stack vertical em < 380px.

### 17. AtlasCompletionStrip — content wrap

- **Arquivo:** `src/components/atlas/page/AtlasCompletionStrip.tsx`
- **Viewport quebra:** ≤ 480px
- **Sintoma:** `flex items-center gap-[18px]` com ícone size-9 + text content + dismiss button. Texto longo + dismiss à direita cria conflito.
- **Fix:** em < 480px, dismiss vira row separada abaixo ou stacka content vertical.

### 18. AtlasEmptyState — funciona ok mas action wrappa

- **Arquivo:** `src/components/atlas/page/AtlasEmptyState.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** `max-w-[360px] mx-auto` description já trata texto. Action button width pode exceder em narrow se label longa.
- **Fix:** confirmar AtlasButton inside ganha `w-full sm:w-auto` pattern.

### 19. AtlasHeroPromo — split 1.4fr/1fr breaks

- **Arquivo:** atualmente sem componente real (apenas spec na DS §7B.3 — não implementei pois não foi usado nas listing pages atuais)
- **Status:** N/A pois não há instância renderizando. Deixar pra quando implementar.

### 20. AtlasFiltersRow trailing slot

- **Cobertura:** já no item 11.

### 21. AtlasSectionTabs — overflow em narrow com 4+ tabs

- **Arquivo:** `src/components/atlas/navigation/AtlasSectionTabs.tsx`
- **Viewport quebra:** ≤ 480px (in-progress page com 4 tabs)
- **Sintoma:** `flex gap-0 border-b` 4 tabs com count pill. Em narrow, tabs wrap em 2 linhas ou overflow.
- **Fix:** em < 640px, container ganha `overflow-x-auto scrollbar-hide` + tabs `flex-shrink-0`. Active tab faz scroll-into-view.

### 22. AtlasNoteRow — body line-clamp em narrow

- **Arquivo:** `src/components/atlas/notes/AtlasNoteRow.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** grid `[56px_1fr_auto]` baseline. Em narrow, body comprime; texto longo respeita whitespace-pre-line mas pode ficar muito estreito.
- **Fix:** em < 480px, considerar grid `[44px_1fr_auto]` com timestamp menor.

### 23. AtlasNoteEditor — counter + buttons row

- **Arquivo:** `src/components/atlas/notes/AtlasNoteEditor.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** `flex items-center justify-between gap-2` com counter "X / 5000" esquerda e Cancelar+Salvar direita. Em narrow, possível squeeze.
- **Fix:** em < 380px, counter wrappa pra row própria acima dos botões.

### 24. AtlasMaterialRow — meta truncate

- **Arquivo:** `src/components/atlas/materials/AtlasMaterialRow.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** grid `[24px_1fr_auto]`. Title `truncate`, meta `truncate`. Em narrow, tag mono à direita pode comprimir título.
- **Fix:** em < 480px, esconder meta caps (mantém só title + tag), ou reduz tag pra ícone-only.

### 25. AtlasBookmarkRow — thumb 80px + label squeeze

- **Arquivo:** `src/components/atlas/bookmarks/AtlasBookmarkRow.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** grid `[80px_1fr_auto]`. Thumb fixa 80px + label + delete = 80+50+~40 = 170 + padding. Funciona. Mas timestamp mono pode wrap.
- **Fix:** confirmar timestamp não wrap.

### 26. AtlasChapterRow — title line-clamp em narrow

- **Arquivo:** `src/components/atlas/chapters/AtlasChapterRow.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** grid `[56px_1fr_auto]`. Title sem truncate atual.
- **Fix:** adicionar `line-clamp-2` em title em mobile.

### 27. AtlasTopBar — search visibility em mobile

- **Arquivo:** `src/components/atlas/shell/AtlasTopBar.tsx`
- **Viewport quebra:** ≤ 480px
- **Sintoma:** search `max-w-[320px] ml-auto` ocupa muito espaço. Em narrow, breadcrumb (quando existe) + search + trailing pode quebrar.
- **Fix:** em < 640px, search vira ícone-only que abre overlay search-as-modal. Breadcrumb hide em < 768px (TopBar mantém apenas title da rota).

### 28. AtlasAdminStrip — label overflow em narrow

- **Arquivo:** `src/components/atlas/shell/AtlasAdminStrip.tsx`
- **Viewport quebra:** ≤ 380px
- **Sintoma:** "Visualizando como estudante" + back btn. Em < 380px, texto wrap.
- **Fix:** em < 480px, esconde texto e mantém só dot warn + "Modo aluno".

### 29. AtlasRail mobile drawer (ser removido após Sprint 6)

- **Arquivo:** `src/components/layout/student-sidebar.tsx` MobileSidebar export
- **Status:** marcado para deleção após implementar AtlasTabBar global
- **Ação:** remover em commit dedicado depois que AtlasTabBar estiver em produção

---

## BAIXA (5 itens)

### 30. AtlasCourseCard — meta line wrap

- **Arquivo:** `src/components/atlas/course/AtlasCourseCard.tsx`
- **Sintoma:** meta line `category · N aulas · duração` mono caps. Em narrow extreme, pode wrap em 2 linhas.
- **Fix:** truncate ou esconder duração em < 380px.

### 31. AtlasCard headers padding

- **Sintoma:** `px-[22px] py-[14px]` é confortável; em < 360px é apertado mas funcional.
- **Fix:** opcional — `px-4` em mobile.

### 32. AtlasButton size sm em narrow

- **Sintoma:** `h-8 px-3 text-[12.5px]` ok em todos viewports.
- **Fix:** sem ação.

### 33. AtlasLoadingBar / AtlasSkeletonCard

- **Sintoma:** loading states funcionais em todos viewports.
- **Fix:** sem ação.

### 34. Tap targets audit

- **Ação transversal:** auditar TODOS os botões/links/icon-buttons em mobile pra confirmar dimensões mínimas:
  - Material guidelines: ≥48×48dp
  - Apple HIG: ≥44×44pt
  - Atlas atual: AtlasButton sm = 32px (h-8) — **viola < 44px**, precisa size mínimo `md` (h-9=36) ou `lg` (h-10=40) em mobile
- **Fix:** AtlasButton ganha prop `mobileSize?` ou regra global "size sm não permitido em mobile". Auditar usos em watch page actions, AtlasNotesList header, AtlasNoteEditor footer, etc.

---

## Itens transversais (3)

### T1. Regra tab bar dupla — DS adendum

- **Doc:** `docs/atlas/DESIGN_SYSTEM.md` §7C ou novo §7D
- **Conteúdo:** documentar regra de coexistência:
  - Em `/student/courses/[id]/watch/[videoId]` → AtlasStickyActions visível (contextual da aula), AtlasTabBar global escondida
  - Em todas outras `/student/**` → AtlasTabBar global visível, AtlasStickyActions ausente
- **Implementação:** layout `(dashboard)/student/layout.tsx` pode usar pathname check ou cada rota declarar via Context se mostra ou não tab bar global. Recomendação: pathname check no layout (1 source of truth).

### T2. safe-area-inset-bottom audit

- **Componentes afetados:** AtlasTabBar global + AtlasStickyActions + FAB chat
- **Ação:** todos elementos fixed bottom devem usar `pb-[env(safe-area-inset-bottom)]` ou `pb-[calc(8px+env(safe-area-inset-bottom))]` pra respeitar área home indicator do iOS notch.
- AtlasStickyActions atual: NÃO tem safe-area handling. AtlasTabBar precisa nascer com.

### T3. iOS Safari touch-action audit

- **Componentes afetados:** Player wrapper (zoom on double-tap quebra UX), AtlasModuleSheet (swipe-to-dismiss gesture handling)
- **Ação:** `touch-action: manipulation` em buttons evita 300ms delay tap. `overscroll-behavior: contain` em ModuleSheet evita pull-to-refresh acidental.

---

## Resumo

| Severidade | # itens |
|---|---|
| Crítica | 4 |
| Alta | 10 |
| Média | 12 |
| Baixa | 5 |
| Transversais | 3 |
| **Total** | **34** |

**Estimativa real revisada:** 3-4 dias com adicionais (era 3 antes do audit detalhado).

**Ordem de execução (reordenada por surface de impacto):**

**Dia 1 — Watch page mobile completa**
Itens 1 (LessonInfo collapse), 3 (LessonHeader collapse), 9 (ModuleSheet), 2 (Player controls), 4 (FAB chat), 13 (NotesList header), 14 (Materials/Bookmarks/Chapters headers), 28 (AdminStrip label), T2 (safe-area), T3 (touch-action).
Saída: tela de aula impecável em mobile. Vitória demonstrável.

**Dia 2 — Shell + listing pages**
Itens 10-integrate (AtlasTabBar no layout), T1 (regra dupla), 5 (PageHeader), 6 (StatsInline), 7 (CourseRow), 8 (StagesProgress), 11 (FiltersRow), 21 (SectionTabs), 27 (TopBar).
Saída: 4 listings + shell consistentes em mobile.

**Dia 3 — Médios + transversais**
Itens 12 (LessonStats), 15 (SynthesisCard footer), 16 (AssessmentCTA grid), 17 (CompletionStrip), 18 (EmptyState), 22 (NoteRow), 23 (NoteEditor), 24 (MaterialRow), 25 (BookmarkRow), 26 (ChapterRow), 34 (tap targets transversal), 29 (remover MobileSidebar drawer).

**Dia 4 buffer**
Itens 30-33 (baixa) + smoke visual final em viewport real (320/375/414/768/1024).

Razão da reordenação: terminar Dia 1 com watch perfeita > fragmentar em camadas paralelas. Watch é tela mais sensível e screenshot demonstrável.

**Pré-requisitos pra começar:**
- DevTools mobile emulation (Chrome) para iterar
- iOS Safari real (Mac+iPhone ou BrowserStack) pra validar items 2, T2, T3
- Notebook com viewport real 1024px+ pra confirmar regressão zero em desktop

**Não bloqueia código antes da revisão deste audit** — aguardo "OK prossiga" ou ajustes de prioridade.
