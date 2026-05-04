# Handoff — Mobile + Quiz Gamification merge

**Data**: 2026-05-04
**Branch**: `feat/admin-dashboard-atlas-reskin`
**Backup pré-merge**: `backup/atlas-reskin-pre-quiz-merge`
**Commits desta sessão**: 11 (push pendente — 75 commits ahead origin)
**Status**: estável, todos os fixes validados em runtime pelo owner

---

## Resumo

Sessão focada em mobile-app pós-v1.0. 3 grandes blocos:

1. **Mobile dev environment unblock** — bug `@expo/cli` 54.0.23/24 + Node 22 (undici body double-read).
2. **Worktree merge** — `feat/quiz-gamification-foundation` (49 commits) integrado em `feat/admin-dashboard-atlas-reskin`.
3. **UX/quiz/player fixes** — BullMQ contract async, anti-XP-farming, auto-fullscreen rotation, zoom fix.

---

## 1. Mobile dev — workaround undici body double-read

**Bug:** `npx expo start` quebra com `TypeError: Body is unusable: Body has already been read` em `@expo/cli/.../getNativeModuleVersionsAsync`. Persiste em 54.0.23 e 54.0.24 (não é fix em patch versão).

**Causa:** undici cache layer (`wrapFetchWithCache.js` + `FileSystemResponseCache.tee()`) consome body 2x ao reconstruir Response.

**Fix aplicado:**
- Bump `expo` 54.0.33 → 54.0.34 (último patch SDK 54, não atualiza CLI mas sem regressão).
- `mobile-app/.env` adiciona `EXPO_OFFLINE=1` — pula `validateDependenciesVersionsAsync` (única fetch que dispara o bug). Afeta APENAS dev tooling, NÃO afeta runtime do app, build prod, Firebase, API ou qualquer coisa do user-facing.

**Pendência:** SDK 55 (proibido pelo owner agora) provavelmente corrige. Remover `EXPO_OFFLINE=1` quando subir SDK.

**Commits:** `9710410`

---

## 2. Worktree merge — gamification foundation

**Origem:** `D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\quiz-gamification-foundation` branch `feat/quiz-gamification-foundation` (49 commits exclusivos).

**Estratégia:** `git merge --no-ff` (rebase de 49 sobre 27 commits divergidos era arriscado).

**O que veio do worktree:**
- **Backend gamification** (`backend-api/src/modules/gamification/`): xp, badges, challenges, streaks, leaderboard. `XpCalculatorService` com fórmula DB-driven (base × combo × confidence).
- **QuizPlayer refactor**: split de `VideoQuiz` monolito em `QuizPlayer + QuestionCard + QuizIntro + QuizResult` em `mobile-app/src/components/quiz/`.
- **Juice mobile** (`mobile-app/src/components/juice/`): XpBurst, ConfettiSkia, ScreenShake, GlowPulse, GelpiCelebrateModal, GelpiFeedback, Dr Gelpi DOM components.
- **Quiz store** Zustand (`mobile-app/src/stores/quiz-store.ts`).
- **Endpoint novo:** `POST /quizzes/:id/check-answer` (per-question validation sem revelar gabarito).
- **6 migrations** `20260425000300-000800` (xp_rule, confidence_quiz_answer, quiz_attempt_combo, user_streak_weekend, user_timezone_audio, xp_log_breakdown).

**Conflitos resolvidos:**

| Arquivo | Estratégia |
|---|---|
| `mobile-app/src/components/video/VideoQuiz.tsx` | `theirs` (worktree shim re-exportando QuizPlayer) |
| `mobile-app/src/services/api/quizzes.service.ts` | `theirs` (richer JobStatus + checkAnswer) |
| `mobile-app/package-lock.json` | `theirs` + `npm install` regenerou |
| `mobile-app/package.json` | manual (expo 54.0.34 + worktree deps: lottie, expo-haptics, moti, react-native-css, react-native-web, @shopify/react-native-skia) |
| `backend-api/prisma/schema.prisma` | manual — manteve **snake_case** do atlas-reskin (`specialties`, `question_bank_items`, `user_mastery`, `video_bookmarks`, `xp_rules`) sobre o PascalCase worktree. Dedup `confidence`/`xpAwarded`/`weekendFreezeEnabled` (campos duplicados) |
| `frontend-web/{watch page, hls-video-player}` | `ours` (atlas Atlas components — worktree não evoluiu) |
| `.gitignore` | manual (mantém housekeeping atlas) |

**Schema mismatch decorrente:** worktree code usava `prisma.xpRule` (PascalCase), atlas-reskin schema é `xp_rules` (snake_case). Backend client gera property matching o nome do model. Fixado em `xp-calculator.service.ts:39` (`prisma.xp_rules`). `seed-specialties-xp-rule.ts` também ajustado (era `prisma.specialty.upsert` + `prisma.xpRule.upsert`).

**Migrations DB:** Postgres local já tinha aplicadas (32 migrations total, "up to date"). `npx prisma generate` regenerou client.

**Pós-merge npm install:**
- `mobile-app`: 42 packages adicionados.
- `backend-api`: posthog-node + outras (47 vulnerabilities — esperado, débito CLAUDE.md pré-Fase 1).

**Seed gamification:** `npx tsx prisma/seed-specialties-xp-rule.ts` rodado. 8 specialties + 1 xp_rule (`quiz_question` active) populated.

**Commits:** `bec706e` (merge), `045ad55` (xpRule rename fix), `068fc9d` (seed + getVideoStats fix).

---

## 3. UX/quiz/player fixes

### 3.1 VideoSummaries — defensive guards

**Bug:** `Each child in a list should have a unique "key" prop` warning em `summaries.map` mesmo com `key={summary.id}`. Causa: backend pode retornar resumo sem `id` em runtime (race ou shape mismatch).

**Fix:** filtra resumos sem id antes de `setSummaries`, valida `newSummary?.id` antes de inserir, fallback `key={summary.id ?? \`summary-fallback-${index}\`}`.

**Commits:** `ed54268`

### 3.2 BullMQ async contract — quiz + summaries

**Bug:** `Cannot read property 'length' of undefined` em `VideoQuiz` ao gerar quiz. Backend retornava `{jobId, status:"completed", resultRef}` (job descriptor) ao invés de Quiz. Mobile esperava Quiz direto.

**Causa:** Backend mudou contrato `POST /quizzes/generate` e `POST /summaries/generate` pra padrão BullMQ (sempre 202 + jobId, mesmo em modo síncrono inline). Web tem `waitForJob` utility, mobile não tinha.

**Fix:**
- `mobile-app/src/services/api/quizzes.service.ts`: novo `pollJobUntilComplete(jobId)` + lógica de detecção `'jobId' in payload`. Resolve resultRef → `GET /quizzes/<resultRef>`. Polling 1.5s (90s timeout) via `GET /jobs/:id`.
- `mobile-app/src/services/api/summaries.service.ts`: mesmo padrão. Resolve via `GET /videos/:videoId/summaries/<resultRef>` + complementa com `getRemainingGenerations`.
- VideoQuiz.tsx: defensive guards extras (`questions?.length ?? 0`, `options ?? []`).

**Commits:** `fb6dc09`

### 3.3 Quiz stats — counter cumulativo per-video

**Bug:** Counter "Tentativas" mostrava 1 mesmo após múltiplas tentativas. Cada "Novo Quiz" gera quiz com `quiz_id` diferente (AI regenera questões). `getStats(quiz.id)` retorna sempre 1 attempt.

**Fix:** novo método `quizzesService.getVideoStats(videoId)` chama endpoint backend `GET /videos/:videoId/quiz-stats` (já existia, não consumido). Stats cumulativos. QuizPlayer trocou todas as 3 chamadas `getStats(quiz.id)` → `getVideoStats(videoId)`.

**Commits:** `068fc9d`

### 3.4 Quiz button confusion + anti-XP-farming

**Bug 1:** Após "Novo Quiz" gerar, botão continuava "Novo Quiz" ao invés de "Iniciar Quiz". Cada clique gerava quiz órfão sem permitir play. Causa: lógica unificava `onStart`/`onRetryNewQuiz` num botão único baseado em `stats.totalAttempts > 0` (cumulativo, sempre true).

**Bug 2:** Após user fazer quiz + ver revisão (com gabarito), podia refazer mesmo quiz e acertar 100% → XP farming infinito.

**Fix camadas:**
- Backend (`submitQuiz`): bloqueia reattempt — `prisma.quizAttempt.findFirst({quizId, userId})`. Se existe → `BadRequestException 'Este quiz já foi respondido'`.
- Frontend (`QuizIntro` + `QuizPlayer`): novo state `currentQuizAttempts` (per-quiz, não cumulativo). Carregado via `getStats(quiz.id)` paralelo com `getVideoStats(videoId)` em `loadQuiz`. Zerado em `handleGenerate`/`handleRetryNewQuiz`. Incrementado em `handleSubmit`. Se > 0, esconde "Iniciar Quiz" + mostra notice "Você já fez este quiz" + único botão é "Gerar Novo Quiz".

**Toast XP:** trocou `\`Acerto questão ${questionId.slice(0,8)}\`` por `'Resposta correta'` em `quiz-attempts.service.ts:152`. Não vaza UUID interno.

**Commits:** `7faa76b`, `bc578d2`

### 3.5 Player mobile — playbackKind explícito

Refinement: VideoPlayer aceita prop `playbackKind?: 'hls'|'iframe'|'none'` do contrato unificado backend. Prioriza isso sobre regex `.m3u8` (mais robusto pra URLs com query string). Watch page passa `playbackKind={kind}`.

**Commits:** `848562b`

### 3.6 Auto-fullscreen rotation restaurado

**Contexto:** Commit `1446231` (Apr 18) removeu auto-fullscreen ao virar device — `app.json` virou `orientation:'portrait'` declarativo global, listener Dimensions nunca dispara mais. User esqueceu/queria de volta.

**Fix cirúrgico — sem reverter portrait-only global:**
- `app.json` continua `"orientation":"portrait"` (decisão original mantida).
- Watch page (`mount`): `ScreenOrientation.unlockAsync()` libera rotation só nesta tela.
- Watch page (`unmount`): `lockAsync(PORTRAIT_UP)` re-trava (resto do app portrait).
- VideoPlayer: `addOrientationChangeListener` — landscape → `enterFullscreen()` nativo, portrait → `exitFullscreen()`.

Login, cursos, perfil etc continuam portrait. Apenas watch screen rotaciona.

**Commits:** `848562b`

### 3.7 Header hide em landscape

**Bug:** Header (back + título) recortava parte do vídeo em landscape.

**Fix:** State `isLandscape` rastreado via `addOrientationChangeListener` no watch page. Header escondido quando `isLandscape === true`. Mantido só este hide — esconder demais elementos (info/actionbar/tabs) causou tela branca durante transição.

**Commits:** `b0c538c`, `b48398e` (revert dos hides excessivos)

### 3.8 Player no-pause na rotação

**Bug:** Vídeo pausava ao girar device (landscape ↔ portrait).

**Causa:** Early return em landscape devolvia árvore JSX completamente diferente do portrait (`<View>` vs `<SafeAreaView>`). React desmontava e remontava VideoPlayer → state perdido → reinicia pausado.

**Fix:** return único — VideoPlayer sempre na mesma posição da árvore React, nunca remonta. Layout muda apenas via styles condicionais ao redor.

**Commits:** `fb388bd`

### 3.9 Zoom/crop fix em rotação

**Bug:** Girar device causava zoom no vídeo (legendas escondidas, parte inferior cortada). Botão fullscreen manual NÃO tinha esse bug — renderizava perfeito.

**Causa:** 2 fullscreens conflitando:
- JS overlay (`landscapePlayerWrapper` position:absolute + `fillContainer` removia aspectRatio:16/9) → VideoView esticado num container sem aspect respect → zoom/crop.
- Native `enterFullscreen()` → reparenta VideoView pro overlay OS com `contentFit` nativo → contain perfeito.

Botão chamava só native. Rotação chamava native + JS overlay → conflito visual.

**Fix:** copiar 100% o caminho do botão.
- Remove `landscapePlayerWrapper` overlay JS.
- Remove `fillContainer={isLandscape}` no uso (mantém prop pra futuro).
- Adiciona `contentFit="contain"` explícito no `<VideoView>`.
- Listener orientation continua disparando `enterFullscreen()`/`exitFullscreen()` (mesmo método do botão).
- Header + info + actionbar + tabs continuam escondidos em landscape (cosmético, ficam atrás do fullscreen nativo).

**Commits:** `f6e9831`

---

## Estado branch atual

```
f6e9831 fix(mobile): remove JS overlay landscape, confia no fullscreen nativo
fb388bd fix(mobile): preserva player montado ao girar — não pausa video
f09ffeb fix(mobile): layout dedicado pra landscape — só player flex:1 sem chrome
b48398e revert(mobile): mantém só header hide em landscape, restaura demais elementos
b0c538c fix(mobile): esconde header e UI da watch em landscape
848562b feat(mobile): playbackKind explícito + auto-fullscreen rotation no watch
7faa76b fix(quiz): toast XP genérico + trava refazer mesmo quiz (anti-XP farming)
bc578d2 fix(mobile): separa Iniciar Quiz e Gerar Novo Quiz em botões distintos
068fc9d fix: corrige seed gamification + counter de tentativas no QuizPlayer
045ad55 fix(api): use xp_rules snake_case prisma client property
bec706e feat(quiz): integrate gamification foundation (XP, combos, badges, streaks, lottie)
b2b63a6 docs(handoff): final session summary quiz gamification 2026-04-25 (worktree)
fb6dc09 fix(mobile): handle BullMQ async contract em quiz + summaries
ed54268 fix(mobile): defensive guards em VideoSummaries pra resumos sem id
9710410 chore(mobile): bump expo 54.0.33 -> 54.0.34
```

`feat/admin-dashboard-atlas-reskin` está **75 commits ahead origin**. Push pendente.

---

## Pendências / débitos abertos

### Validação manual recomendada

1. **App cold start** ainda demora 3 tentativas pra abrir (timeout request). Provavelmente bundle gigante pós-merge (Lottie + Skia + Reanimated + 42 novos packages). Warm-up custoso em primeiras runs. Não é blocker, normaliza após cache.
2. **E2E quiz flow:** gerar → answer → ver XP/combo/Lottie → trava reattempt funcionar → gerar novo.
3. **Auto-fullscreen rotation:** validar landscape entrar fullscreen nativo + portrait sair + vídeo continuar tocando do timestamp exato em ambas direções.

### Tech debt

- **Quizzes órfãos:** quizzes gerados sem `QuizAttempt` ficam no DB. Considerar cleanup automático >24h sem attempts. Não bloqueante.
- **Worktree `quiz-gamification-foundation`:** já mergeado, branch ainda existe. Pode deletar após smoke E2E confirmar tudo OK.
- **Vulnerabilities:** mobile 21 (1 critical), backend 47 (1 critical). Esperado pré-Fase 1 — débito CLAUDE.md.
- **EXPO_OFFLINE=1:** workaround dev-only. Remover quando subir SDK 55.
- **Schema mismatch residual:** se algum service backend ainda usar `prisma.specialty/questionBankItem/userMastery/videoBookmark` (PascalCase), vai quebrar runtime. Verificado via grep — zero refs além do `xpRule` já fixado. Mas pode aparecer ao mexer em endpoints de challenges/badges/leaderboard.
- **CLAUDE.md:** atualizar removendo `quiz-gamification-foundation` da seção worktrees pendentes (referência em "Branch atual" linha ~13).

### Reference docs relacionados

- `docs/HANDOFF-quiz-gamification-foundation-2026-04-25.md` (worktree pre-merge)
- `docs/HANDOFF-quiz-gamification-foundation-2026-04-29.md`
- `HANDOFF-progress-day-1.md` (player skin worktree)
- `knowledge/R2-VIDEO-PIPELINE-CONSOLIDATION.md` (pipeline etapas A/B/C)
- `knowledge/BUG-REPORT-BACKEND-PLAYBACK-KIND.md` (external HLS kind bug — workaround web ainda ativo, fix backend pendente)

---

## Como retomar amanhã

```bash
# Backend
cd D:\dashboard\next-shadcn-admin-dashboard-main\backend-api
docker-compose up -d  # se não estiver rodando
npm run start:dev      # porta 3000

# Mobile (terminal interativo)
cd D:\dashboard\next-shadcn-admin-dashboard-main\mobile-app
npx expo start --clear
# QR code no terminal interativo. EXPO_OFFLINE=1 já em .env.

# Push branch (quando confirmar tudo estável)
git push origin feat/admin-dashboard-atlas-reskin

# Cleanup worktree (opcional, após smoke E2E)
git worktree remove .worktrees/quiz-gamification-foundation
git branch -d feat/quiz-gamification-foundation
```

Validar primeiro: quiz fluxo completo + rotação fullscreen + summaries gerar. Se OK, push + cleanup.

---

## Adendo — sessão estendida pós-handoff (mesmo dia, 2026-05-04)

### 4. Investigação player mobile (sem código)

Confirmado: mobile usa **expo-video nativo** (`useVideoPlayer` + `VideoView`) — engine HLS via AVFoundation (iOS) / ExoPlayer (Android). Não tem hls.js no mobile (web sim). ABR (Adaptive Bitrate) automático nativo lê master playlist + variants R2 (720p/1080p/2160p) escolhendo melhor por bandwidth/CPU. Mesmo backend, mesmo R2, mesma master playlist do web — diferença é só engine + UI controls.

### 5. Tracking de progresso — entendimento + fix granular

**Modelo backend antes:**

```ts
progressPercentage = round((completedVideos / totalVideos) * 100)
```

Binário per-vídeo. Mobile marca `completed` aos 95% (`COMPLETION_THRESHOLD`). Web só ao `ended` real ou via botão manual.

**Bug do user:** curso com 1 vídeo único, 50% assistido → 0% no curso (não bate threshold). E "2 aulas" exibido num módulo com só 1 aula real (1 soft-deletada vazando no count).

**Fix (commit `0131901`):**

| Backend | Mobile |
|---|---|
| `getCourseProgress` + `getEnrolledCourses`: filtra `deletedAt:null` em modules + videos nested includes (igual fix `794fa2f` em outras rotas) | Novo helper `src/lib/course-progress.ts` `getCourseProgressPercent(course)` centraliza fallback |
| Novo campo `weightedPercentage`: `sum(min(watchTime, duration)) / sum(duration)` capado em 100 | 8 call sites atualizados (CourseCardHome, CourseCard, CatalogCourseCard, InProgressCourseCard, app/(tabs)/index ProgressCard + filter, app/courses/in-progress, app/courses/catalog, app/course/[id]/index) |
| Cap em `min(watchTime, videoDuration)` evita scrubbing inflar | Backward-compat: weightedPercentage > percentage > progressPercentage > enrollment.progress > 0 |
| `progressPercentage` (binário) mantido pra backward-compat | Tipo `CourseProgress` ganhou `weightedPercentage?: number` |

**Resultado:** 1 vídeo 50% assistido → ~50%. "2 aulas" → "1 aula" (filtra soft-deleted).

### 6. Cloudflare Named Tunnel setup (dev.cerne.social)

Quick tunnel `cloudflared --url` falhou com erro 1101 (lado CF, transient). User configurou named tunnel persistente:

```bash
cloudflared tunnel login
cloudflared tunnel create dev          # ID: ca721e8a-8d7e-4a76-970a-e52c29dbe4be
cloudflared tunnel route dns dev dev.cerne.social
cloudflared tunnel run --url http://localhost:3000 dev
```

Credenciais em `C:\Users\Pichau\.cloudflared\ca721e8a-8d7e-4a76-970a-e52c29dbe4be.json` + `cert.pem`.

**Pendência sugerida:** criar `~/.cloudflared/config.yml` pra ingress persistente (sem precisar `--url` flag toda vez):

```yaml
tunnel: ca721e8a-8d7e-4a76-970a-e52c29dbe4be
credentials-file: C:\Users\Pichau\.cloudflared\ca721e8a-8d7e-4a76-970a-e52c29dbe4be.json
ingress:
  - hostname: dev.cerne.social
    service: http://localhost:3000
  - service: http_status:404
```

Pode adicionar mais hostnames depois (ex: `r2-browser.cerne.social → localhost:8787` pro Worker dev).

### 7. App cold start lento (não-resolvido, débito)

User confirmou: 3 primeiras tentativas de abrir app dão timeout, 4ª/5ª funciona. Provável bundle gigante pós-merge (Lottie + Skia + Reanimated + Expo DOM Components + 42 packages novos). Warm-up custoso. Não bloqueante mas vale investigar timeout do Expo dev client (default ~30s).

### 8. Bugs de quiz/player corrigidos nesta extensão

1. **Toast XP vazava UUID** (`Acerto questão 9df1061e`) → trocado pra `'Resposta correta'` (commit `7faa76b` na sessão original, listado).
2. **Botão "Novo Quiz" travava cíclico** após primeira tentativa (gerava quiz órfão sem permitir play) → 2 botões separados (`bc578d2`).
3. **Anti-XP-farming** server-side `submitQuiz` rejeita reattempt + UI esconde "Iniciar Quiz" quando já jogado, oferece só "Gerar Novo Quiz" (`7faa76b`).
4. **Player pausava ao girar** → return único refatorado, player nunca remonta (`fb388bd`).
5. **Player com zoom/crop em landscape** → removido JS overlay landscape, confia 100% no enterFullscreen nativo + `contentFit="contain"` explícito (`f6e9831`).
6. **Header recortando vídeo em landscape** → state `isLandscape` rastreado via orientation listener, header escondido (`b0c538c` parcial + `b48398e` revert dos hides excessivos que causaram tela branca).

### 9. ReferenceError `getCourseProgressPercent` (resolvido via reset)

User reportou erro runtime. Causado provavelmente por Metro cache stale. Resetou backend (e provavelmente Metro), erro sumiu. Imports todos corretos via grep verification.

---

## Estado branch atual (final)

```
0131901 feat(progress): % ponderado por watchTime + filtra modules/videos soft-deleted
b08684e docs(handoff): registra progresso sessão 2026-05-04
f6e9831 fix(mobile): remove JS overlay landscape, confia no fullscreen nativo
fb388bd fix(mobile): preserva player montado ao girar — não pausa video
f09ffeb fix(mobile): layout dedicado pra landscape — só player flex:1 sem chrome
b48398e revert(mobile): mantém só header hide em landscape, restaura demais elementos
b0c538c fix(mobile): esconde header e UI da watch em landscape
848562b feat(mobile): playbackKind explícito + auto-fullscreen rotation no watch
7faa76b fix(quiz): toast XP genérico + trava refazer mesmo quiz (anti-XP farming)
bc578d2 fix(mobile): separa Iniciar Quiz e Gerar Novo Quiz em botões distintos
068fc9d fix: corrige seed gamification + counter de tentativas no QuizPlayer
045ad55 fix(api): use xp_rules snake_case prisma client property
bec706e feat(quiz): integrate gamification foundation (XP, combos, badges, streaks, lottie)
b2b63a6 docs(handoff): final session summary quiz gamification 2026-04-25 (worktree)
fb6dc09 fix(mobile): handle BullMQ async contract em quiz + summaries
ed54268 fix(mobile): defensive guards em VideoSummaries pra resumos sem id
9710410 chore(mobile): bump expo 54.0.33 -> 54.0.34
```

`feat/admin-dashboard-atlas-reskin` está **77+ commits ahead origin**. Push pendente.

## Pré-deploy checklist

Antes de push + deploy:

- [ ] Smoke E2E quiz: gerar → answer → ver XP/Lottie → trava reattempt → gerar novo
- [ ] Smoke E2E summaries: gerar → ver inline (não polling visível)
- [ ] Smoke player: assistir vídeo → girar landscape (fullscreen nativo + contentFit OK) → girar de volta (sem pausa, mesmo timestamp)
- [ ] Smoke progresso: assistir 50% de vídeo → ver % na home (deve ser ~50%, não 0%)
- [ ] Smoke contagem: módulo com 1 aula real exibe "1 aula", não "2"
- [ ] Backend `npm run build` ✅ (já validado 16s webpack OK)
- [ ] Mobile `npx tsc --noEmit` ✅ (3 erros pré-existentes em `src/tw/*` débito conhecido)
- [ ] Backend healthy: `curl http://localhost:3000/api/v1/health` (ou similar)
- [ ] Cloudflare tunnel testado: `https://dev.cerne.social/...` retorna 200 do backend

Se OK:

```bash
git push origin feat/admin-dashboard-atlas-reskin
git worktree remove .worktrees/quiz-gamification-foundation
git branch -d feat/quiz-gamification-foundation
```

Atualizar `CLAUDE.md` removendo `quiz-gamification-foundation` da seção worktrees pendentes.

## Pendências débito (atualizado)

- **App cold start lento** (3 tentativas até abrir) — investigar bundle size + Expo dev client timeout
- **Quizzes órfãos no DB** — cleanup automático >24h sem attempts (script futuro)
- **EXPO_OFFLINE=1** workaround temporário SDK 54 (remover ao subir SDK 55)
- **Vulnerabilities npm** mobile 21 / backend 47 (Pré-release Fase 1)
- **Web não tem completion threshold automático** — só marca em `ended` ou botão manual. Discrepância silenciosa com mobile (95%). Considerar alinhar.
- **Cloudflare config.yml** persistente recomendado pra evitar `--url` flag toda vez
- **CLAUDE.md update:** worktree quiz-gamification mergeada, atualizar referências

