# Handoff — `feat/quiz-gamification-foundation` (sessão 2026-04-29)

**Data:** 2026-04-29
**Branch:** `feat/quiz-gamification-foundation`
**Worktree:** `D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\quiz-gamification-foundation`
**Sessão anterior:** [HANDOFF-quiz-gamification-foundation-2026-04-25.md](./HANDOFF-quiz-gamification-foundation-2026-04-25.md)
**Estado:** Sprint 0 + Sprint 1 + 3 fixes pós-smoke + **migração Lottie → Expo DOM Components** completos. Smoke E2E device físico OK (correct + wrong animações reais).

---

## ⚠️ Mudança arquitetural desta sessão — Lottie ABANDONADO

Sessão 04-25 ficou bloqueada em "Lottie Dr. Gelpi assets quebrados" (JSON manual sem AE/Bodymovin → conteúdo fora do viewBox). Esta sessão substituiu o pipeline inteiro:

**Antes:** `lottie-react-native` + JSONs gerados manualmente + AE/Bodymovin pendente
**Depois:** **Expo DOM Components** renderizando JSX+SVG+CSS originais do claude.design

### Por que Expo DOM

claude.design entrega arquivos `.jsx` + `styles.css` (web React puro com SVG inline + CSS `@keyframes`). NÃO entrega Lottie JSON. Pipeline pra Lottie exigia After Effects + plugin Bodymovin manual — Marcelo não tem AE workflow.

Expo DOM Components rodam código web verbatim em WebView gerenciado pelo Expo. Drop-in dos JSX entregues, zero conversão. Trade-off: WebView boot ~150ms primeira mount + ~+300KB bundle (DOM runtime + react-native-web + webview).

### Estrutura final

```
mobile-app/src/components/juice/
├── dom/
│   ├── DrGelpiDOM.tsx          ← entry com 'use dom' directive
│   ├── DrGelpiSVG.tsx          ← personagem (porte direto JSX Marcelo)
│   ├── ConfettiSVG.tsx         ← Confetti + XPBurst + Sparkles + Halo
│   ├── ErrorEffectsSVG.tsx     ← HeartPulse + CalmWaves + InsightPops
│   ├── styles.css              ← anims acerto (@keyframes do styles.css original)
│   └── styles-error.css        ← anims erro (do styles-error.css original)
└── GelpiFeedback.tsx           ← wrapper RN, mesma API que LottieFeedback tinha
```

**Removido:**
- `LottieFeedback.tsx`
- `assets/gelpi-correct.json` + `assets/gelpi-wrong.json`
- pasta `assets/`

**Wired:**
- `QuizPlayer.tsx` import + state type + JSX (mesma API)
- comments QuizPlayer.tsx + `services/api/quizzes.service.ts` atualizados de "LottieFeedback" → "GelpiFeedback"

---

## Padrão de uso DOM component

`DrGelpiDOM` é mounted **uma vez** dentro de `GelpiFeedback`. Toggle de animação via prop:

```tsx
<DrGelpiDOM
  visible={visible}
  state={state}            // 'celebrate' | 'wrong' | 'idle'
  triggerKey={triggerKey}  // increment force-replay animation
/>
```

WebView NÃO desmonta entre answers — boot pago 1x na vida do `QuizPlayer`. Replay de animação via `key` no `<div className="modal-overlay">` interno (DOM-side remount, ~5-15ms).

CSS animations gated por `.modal-overlay.show` + `.error-mode` classes — replicam padrão do protótipo claude.design (`App.jsx` original usava `setCelebrating` state pra adicionar `.show`).

---

## Dependências adicionadas (`npm install`)

```json
{
  "react-native-webview": "13.15.0",
  "react-native-web": "^0.21.0",
  "react-dom": "19.1.0",
  "@expo/metro-runtime": "~6.1.2"
}
```

Todas instaladas via `npx expo install` (compatibilidade SDK 54 garantida).

`lottie-react-native@7.3.6` MANTIDO em `package.json` por enquanto — rollback fácil se DOM falhar produção. Uninstall só depois de smoke E2E em build de release.

---

## Débitos resolvidos esta sessão

- ✅ **Lottie Dr. Gelpi assets quebrados** — substituídos por DOM components, animações funcionam
- ✅ **DEV-only random isCorrect 50/50** (FB.3 do handoff anterior) — removido `__DEV__` block em `QuizPlayer.tsx:215-246`. `checkAnswer` real sempre.
- ✅ **Wrong-answer juice reachable** — agora server determina correctness, ScreenShake + haptic warning disparam de verdade

---

## Sequência de start (atualizada)

```powershell
# 1) Backend main parado (port 3000 livre)
netstat -ano | findstr :3000

# 2) Backend worktree em :3000
cd D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\quiz-gamification-foundation\backend-api
npm run start:dev

# 3) Metro mobile worktree
cd D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\quiz-gamification-foundation\mobile-app
npm start
# Se native deps mudaram desde último start: npm start -- --clear

# 4) Scan QR no Expo Go (device com mesma rede LAN)
```

Pré-requisitos gitignored copiados ainda válidos (ver handoff 04-25).

---

## Estado dos serviços + tests

| Serviço | Porta | Status |
|---|---|---|
| Postgres docker (compartilhado) | 5433 | up healthy |
| Redis docker (compartilhado) | 6379 | up healthy |
| Backend worktree | 3000 | iniciar manualmente |
| Metro mobile worktree | 8081 | iniciar manualmente |
| Backend main | 3000 | NÃO rodar simultâneo com worktree |

Tests:
- Mobile: **47/47 passing** (sem novos tests pra DOM — opcional Sprint 2)
- Backend: 168/168 passing (excl. e2e) — não tocado esta sessão
- TypeScript: 0 erros novos (3 pré-existentes em `src/tw/` ignorados)

---

## Bugs / débitos pendentes

### Críticos (antes merge main)

- **Race condition double-tap durante checkAnswer** — `playStep !== 'answering'` só protege depois do await. Se user toca 2x rápido (<300ms), 2 calls disparam. Adicionar `isChecking` boolean local em `QuizPlayer.tsx`.

### Importantes

- **`Difficulty` em `QuizQuestion`** ausente — XP usa fallback MEDIUM pra todas. Sprint 2 (schema add).
- **Sons como assets pendentes** — `useSound` no-op silencioso. Pasta `mobile-app/src/assets/sounds/` ainda não existe. Quando assets chegarem, descomentar `require()` em `useSound.ts:14-21`.
- **Mascote vet idoso humano** (Sprint 3) — você fornece Figma 7 variants. **Mudança de pipeline:** com DOM Components, agora pode pular Aninix/Lottie inteiro — Marcelo entrega JSX direto do claude.design pra cada estado. Drop em `dom/` e wire.
- **Uninstall `lottie-react-native`** — depois smoke E2E em build de release confirmar DOM OK.

### Específicos do DOM

- **Bundle size +~300KB** — DOM runtime + react-native-web + webview. Aceitável (já temos Reanimated/Skia pesados); medir release APK final.
- **WebView boot cost ~150ms primeira mount** — imperceptível pq `GelpiFeedback` mounta no `QuizPlayer` open, antes da primeira pergunta.
- **Hot reload do JSX/CSS funciona** mas mudanças no `dom/` precisam às vezes Metro restart com `--clear` (caso bundle DOM cache desatualize).
- **Processo de update do JSX:** quando Marcelo iterar no claude.design, copiar JSX/CSS atualizados manualmente pra `mobile-app/src/components/juice/dom/`. Não tem auto-sync. Documentar pipeline:
  1. Marcelo entrega JSX/CSS via claude.design
  2. Copy pra `mobile-app/src/components/juice/dom/`
  3. Renomear `.jsx` → `.tsx`, ajustar imports/types
  4. Hot reload aplica

### Menores (pré-existentes)

- **`expo-av` deprecation warn** SDK 54 — funcional mas vai sair em SDK 55.
- **`@react-native-community/slider@5.2.0`** vs expected 5.0.1 — versão off, harmless.
- **`expo-screen-orientation@55.0.13`** numa env SDK 54 — major mismatch.
- **`.env.example` backend** criado parcial (só PostHog vars) na sessão anterior.
- **Player HLS desktop** retorna `kind=iframe` mesmo pra R2 — issue pré-existente, fix em `feat/video-player-skin` worktree.

---

## Não merged em main

Branch `feat/quiz-gamification-foundation` continua viva (~38+ commits ahead).

Merge atômico fica para depois de:
1. ~~Lottie Dr. Gelpi novos chegarem e validados~~ ✅ resolvido via Expo DOM
2. ~~Smoke E2E completo em device físico (com Lottie real)~~ ✅ DOM smoke OK
3. ~~Remover DEV blocks~~ ✅ DEV random isCorrect removido (FB.3)
4. **Race condition double-tap addressed** — pendente
5. ~~Sons~~ (opcional — pode merge sem)
6. **Uninstall `lottie-react-native`** — depois release smoke OK

Próximos commits desta sessão sugeridos (separados):
```
feat(mobile): migrate quiz feedback Lottie → Expo DOM Components
fix(mobile): remove DEV random isCorrect, use real checkAnswer
chore(mobile): add react-native-webview + react-native-web deps for DOM
```

---

## Próximas sprints (não iniciadas)

**Sprint 2 — Mastery + Streak (1-2 sem)**
- Mastery decay log half-life ajustável (HARD 14d / MEDIUM 21d / EASY 30d)
- Streak refator (freeze level up + weekend auto)
- MasteryRadar tela
- Push notifications retomada de streak
- Adicionar `Difficulty` em `QuizQuestion` (fix débito)

**Sprint 3 — Mascote (2-3 sem)**
- ~~Pipeline Figma → Aninix → Lottie~~ **DESCARTADO**
- **Novo pipeline:** Marcelo entrega JSX claude.design por estado → copy pra `dom/` → wire em QuizPlayer + Profile
- 7 variants: idle, celebrate, wrong, streak, pensativo, level up, dica, boas-vindas
- Validação UX cohort 5-10 alunos

**Sprint 4 — Banco categoria livre (1 sem)**
- Admin UI: CRUD `Specialty` + `QuestionBankItem`
- Quiz fora da aula (escolhe categoria)
- Seed inicial 10 q × 8 specialties

---

## Decisões de produto fechadas (referência rápida)

- Mobile-first; web fase 2
- Mascote vet idoso humano fictício (não Marcelo)
- **Animação rendering: Expo DOM Components** (substitui Lottie e Rive — decisão fechada esta sessão)
- Confidence rating manual 4 níveis: GUESSED / THOUGHT_KNEW / KNEW / MASTERED
- Sem vidas, sem erros limitados, sem XP negativo
- Streak: freeze por level up + freeze automático fim de semana
- Mastery decay logarítmico ajustável por difficulty
- Combo break em erro, combo persiste por dia (reseta meia-noite user tz)
- XP fórmula: base × combo × confidence (sem time bonus)
- Audio default ON apenas se headphone detectado
- Quiz contextual = AI runtime / Quiz fora da aula = banco curado por specialty
- Daily case fora MVP

---

## Spec + planos canônicos

- Spec: `docs/superpowers/specs/2026-04-25-quiz-gamification-dopamine-redesign-design.md` (gitignored)
- Plan Sprint 0: `docs/superpowers/plans/2026-04-25-sprint-0-foundation.md` (gitignored)
- Plan Sprint 1: `docs/superpowers/plans/2026-04-25-sprint-1-juice-mobile.md` (gitignored)
- Assets fonte Marcelo: `D:\Marcelo Portilho\Projeto Cirurgião\` (DrGelpi.jsx, Confetti.jsx, ErrorEffects.jsx, styles.css, styles-error.css) — SOURCE OF TRUTH pro DOM components
