# Auditoria de Estabilização — 2026-05-26

Mapa consolidado de uma auditoria read-only (4 agentes paralelos: backend, web, mobile, infra/pipeline) sobre o `main`, orientada a **fechar débitos + bugs críticos para produção**. Substitui as listas parciais espalhadas nos handoffs.

## Correções de premissa (débitos dos handoffs que NÃO existem mais)

| Suposto problema (handoff) | Realidade verificada |
|---|---|
| Schema mismatch PascalCase/snake_case residual | ✅ Limpo — zero refs PascalCase no código (único uso correto: `prisma.xp_rules` em `xp-calculator.service.ts:39`) |
| `strictNullChecks: false` no backend | ✅ Já está `true` (`backend-api/tsconfig.json:15`) — CLAUDE.md corrigido |
| Anti-XP-farming pendente | ✅ Implementado (`quiz-attempts.service.ts:41`, `findFirst({quizId,userId})` → 400) |
| WEBHOOK_SECRET do backend sem auth | ✅ `WebhookSecretGuard` timing-safe (`jobs.controller.ts:71`) |
| DEV blocks / random isCorrect no mobile | ✅ Nenhum sobrou em `quiz/` e `juice/` |
| Backend não compila | ✅ `tsc --noEmit` zero erros |

## 🔴 CRÍTICO — antes de qualquer release

- [ ] **Race condition double-tap no quiz** — `mobile-app/src/components/quiz/QuizPlayer.tsx:245-298`. `isChecking` nunca foi implementado; tap duplo <300ms dispara 2× `checkAnswer` + 2× XP/haptic. Fix com `useRef`. Esforço P. Sem device.
- [ ] **`WEBHOOK_SECRET` com bypass silencioso no video-processor** — `video-pipeline/cloud-run/server.py:562` (`if WEBHOOK_SECRET and ...` → aberto se vazio). Trocar por falha explícita. Esforço P + **confirmar var no console GCP (owner)**.

## 🟠 DÉBITO — fechar pra go-live

### Segurança / config
- [ ] `firebase-service-account.json` com chave RSA privada em disco no backend (fora do git, mas existe — risco de commit acidental; rotacionar se já circulou). **Owner + console.**
- [ ] Rota de registro hardcoded no bundle mobile `/aulas/92339018203` — `mobile-app/src/stores/auth-store.ts:152`. Mover pra env + rate-limit backend. **Decisão de negócio.**
- [ ] Fallback silencioso de Firebase keys — web `frontend-web/src/lib/firebase/config.ts:7-13` e mobile `.env`. Trocar `||` por erro explícito em build. Esforço P.
- [ ] `CDN_BASE_URL` Wrangler secret não-documentado no `r2-browser` — se não setado, `/signed-url` quebra. **Confirmar no dashboard Cloudflare (owner).**

### Funcional
- [ ] `/admin/settings` salva só em `localStorage` — `frontend-web/src/app/(dashboard)/admin/settings/page.tsx:78-102`. Precisa endpoint backend + wiring (cross-cutting). Esforço P-M.
- [ ] Completion threshold web ≠ mobile — `watch/[videoId]/page.tsx:293`. Web só marca em `ended`/manual, sem 95% automático. **Alinhar regra de negócio com owner.**
- [ ] `Difficulty` ausente em `QuizQuestion` — `quiz-attempts.service.ts:134` usa MEDIUM pra tudo. Schema add + propagar em `quizzes.service.ts`. Esforço P.
- [ ] Garantir seed `xp_rules` (`key='quiz_question'`) em prod — se faltar, XP por questão é descartado silenciosamente. **Acesso ao banco prod (owner).**

### Infra / processo
- [ ] CI/CD quase inexistente (só `.github/workflows/ios-tests.yml`) — backend deploy 100% manual via `deploy-artifact-registry.ps1`. Esforço G. **Console GCP / Workload Identity.**
- [ ] Secret Manager: implementado no backend (`secrets-loader.ts`), **ausente no video-processor** (`server.py:28-33` usa `os.environ`). Esforço M.
- [ ] `video-pipeline/` gitignored (`.gitignore:247`) → `test_encode_fallback.py`, `requirements.txt`, `wrangler.toml` não versionados. Clone fresco não deploya. Esforço P.
- [ ] npm vulnerabilities: backend ~52, mobile ~21, web ~10, root ~17 (1 critical cada, quase tudo `protobufjs` transitivo do Firebase + `handlebars` no backend). Esforço M.

## 🟡 MENOR (não bloqueia)
- [ ] Quizzes órfãos sem cleanup (cron `@Cron` deletando Quiz >7d sem QuizAttempt). P.
- [ ] Upload R2 sequencial (`server.py:413-440`) — paralelizar com `ThreadPoolExecutor`. P.
- [ ] `lottie-react-native` dead dependency no mobile (`package.json:44`) — sem imports. Remover. P.
- [ ] `expo-av` deprecation (sai no SDK 55) — `useSound.ts:2`, `useAudioOutput.ts:2`. Migrar pra `expo-audio`. M.
- [ ] `useSound` no-op (assets de som faltam, `src/assets/sounds/` não existe). **Asset (owner).**
- [ ] Mascote Dr. Gelpi: só 2 de 7 estados (idle, celebrate) — `dom/DrGelpiSVG.tsx`. **Asset/design (Marcelo).**
- [ ] Cold start mobile sem lazy-load (WebView DOM monta sempre). M, precisa profiling.
- [ ] `as any` espalhados no web (`videos.service.ts`, `modules/[moduleId]/edit/page.tsx`). P.
- [ ] `speedLearner` badge com dead code inofensivo (`badges.service.ts:222-228`). P.

## Limites do que um time de agentes resolve

**Puro código (time fecha sozinho):** race condition, Difficulty, fallbacks Firebase, /admin/settings (com endpoint), Secret Manager no video-processor, remover Lottie, cleanup órfãos, paralelizar upload, versionar video-pipeline.

**Gated no owner (irredutível):** secrets no console GCP/Cloudflare, rotação da chave Firebase, seed em prod, smoke E2E em device físico, decisão da rota de registro + completion threshold, CI/CD com Workload Identity, assets de som + mascote (Marcelo).
