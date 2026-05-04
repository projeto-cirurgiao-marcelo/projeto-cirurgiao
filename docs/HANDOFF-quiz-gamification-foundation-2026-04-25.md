# Handoff — `feat/quiz-gamification-foundation` (sessão 2026-04-25)

**Data:** 2026-04-25
**Branch:** `feat/quiz-gamification-foundation`
**Worktree:** `D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\quiz-gamification-foundation`
**Commits à frente de main:** ~38
**Estado:** Sprint 0 + Sprint 1 + 3 fixes pós-smoke completos. Pronto pra continuar (Lottie asset broken, precisa regenerar via Bodymovin).

---

## ⚠️ Antes de retomar — leitura obrigatória

1. **Worktree usa banco compartilhado com main** (Postgres :5433, Redis :6379). 9 migrations de Sprint 0 já aplicadas (`ADD COLUMN` / `CREATE TABLE` não-destrutivos).
2. **Backend worktree precisa rodar do worktree**, não main. Endpoints novos (`POST /quizzes/:id/check-answer`, schema novo) só existem aqui.
3. **Backend main NÃO pode rodar simultâneo com worktree** — ambos disputam port 3000.
4. **Mobile worktree precisa `.env` próprio** + GCP creds + Firebase service account (ver "Pré-requisitos" abaixo).

---

## Pré-requisitos pra retomar

Arquivos gitignored copiados pro worktree (não commitam):

```
.worktrees/quiz-gamification-foundation/
├── backend-api/
│   ├── .env                                  (copiado de main)
│   └── firebase-service-account.json         (copiado de main)
├── mobile-app/
│   ├── .env                                  (copiado, EXPO_PUBLIC_API_URL=http://192.168.0.3:3000/api/v1)
│   ├── google-services.json                  (Firebase, copiado)
│   ├── GoogleService-Info.plist              (Firebase, copiado)
│   └── assets/images/                        (criada vazia + .gitkeep)
└── gcp-service-account-key/
    └── projeto-cirurgiao-5b9e6cafa4fc.json   (copiado de main, Vertex AI)
```

Se sair do PC e voltar:
- IP LAN da máquina pode ter mudado → conferir Metro startup (`exp://192.168.x.x:8081`) e atualizar `EXPO_PUBLIC_API_URL` em `mobile-app/.env`.
- Firewall Windows :3000 inbound já liberado uma vez nessa sessão (regra "Backend Dev 3000" se foi adicionada).

---

## Sequência de start

```powershell
# 1) Parar backend main se estiver em :3000
netstat -ano | findstr :3000

# 2) Backend worktree em :3000
cd D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\quiz-gamification-foundation\backend-api
npm run start:dev
# Esperado:
#   [VertexAiService] Vertex AI Service initialized successfully
#   [AnalyticsService] Analytics disabled — events become no-op
#   [QueueModule] QUEUE_ENABLED=true — initialising BullMQ connection.
#   [Bootstrap] Aplicação rodando na porta: 3000

# 3) Metro + Expo Go
cd D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\quiz-gamification-foundation\mobile-app
npm start
# Esperado: exp://192.168.0.x:8081 — scan QR no Expo Go
```

---

## Trabalho concluído (resumo por commits)

### Sprint 0 — Foundation (16 commits + summary)

Schema novo Prisma (não-destrutivo):
- Models: `Specialty`, `QuestionBankItem`, `UserMastery`, `XpRule`
- Enums: `Difficulty`, `ConfidenceLevel`, `AudioPref`
- Alterações: `QuizAnswer.confidence/xpAwarded`, `QuizAttempt.comboMax/specialtyId`, `UserStreak.weekendFreezeEnabled`, `User.timezone/audioPreference`, `XpLog.multiplierBreakdown`

Bug fix XP dedup:
- Antes: `referenceId=videoId` colidia entre quizzes do mesmo vídeo
- Depois: `referenceId=attempt.id` — único por submit. Aplicado pra `quiz_pass`, `quiz_perfect`, `quiz_improvement`. Teste de regressão `xp.service.spec.ts`.

Seed idempotente:
- 8 specialties: Cardiologia, Ortopedia, Partes Moles, Oftalmologia, Neurologia, Anestesia, Diagnóstico por Imagem, Reprodução
- 1 row `XpRule.quiz_question` com fórmula completa em JSON



[
  {
    "AllowedOrigins": [
      "https://inquisitive-zuccutto-52f2eb.netlify.app",
      "https://projetocirurgiao.app",
      "https://www.projetocirurgiao.app",
      "http://localhost:3001",
      "http://localhost:5500",
      "http://localhost:3002",
      "http://localhost:8787",
      "https://hlsjs.video-dev.org/demo/",
      "https://projeto-cirurgiao-git-release-271637-marcelo-portilhos-projects.vercel.app"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 86400
  }
]



Analytics:
- `posthog-node` SDK instalado + env vars
- `AnalyticsService` tipado wrapping PostHog (no-op se `ANALYTICS_ENABLED!=true`)
- Eventos: `QUIZ_COMPLETED`, `XP_AWARDED`, `LEVEL_UP`, `BADGE_UNLOCKED`, `STREAK_INCREMENTED`

### Sprint 1 — Juice Mobile + XP Variável (16 commits + summary)

Mobile hooks:
- `useAudioOutput` — detecta headphone via expo-av, polling 5s
- `useHaptic` — wrapper expo-haptics (correct/wrong/comboTier/levelup/streakBreak)
- `useSound` — gated por `useAudioOutput` + `audioPreference`. Stub silencioso (assets pendentes).

Mobile juice components:
- `XpBurst` — número XP voa + fade (Reanimated 4)
- `ConfettiSkia` — partículas físicas com Skia (Piece subcomponent + useDerivedValue)
- `GlowPulse`, `ScreenShake` — wrappers Reanimated

Mobile quiz components:
- `ConfidenceRating` — 4 botões pós-resposta (Chutei/Achei/Sabia/Dominei)
- `ComboMeter` — HUD combo absolute top-right (tier color)
- `QuizIntro` / `QuestionCard` / `QuizPlayer` / `QuizResult` — split do `VideoQuiz.tsx` monolito (999L → shim 23L)

Mobile store:
- `quiz-store` (Zustand) — substitui local React state pra combo

Backend:
- `XpCalculatorService` — DB-driven fórmula via `XpRule` (5min cache). `calculate(input)` + `aggregateXp(kind)` + `getCurrentCombo(userId, tz)`
- Submit DTO: `confidence` opcional por answer
- `quiz-attempts.service.submitQuiz`: persiste `confidence` + `xpAwarded` por `QuizAnswer`, popula `comboMax` em `QuizAttempt`, dispara `processAction('quiz_question', ...)` per-question

Infra:
- `jest.config.js` testRegex (Windows worktree path glob compat)
- `jest.setup.ts` worklets mock estendido (createSerializable, isWorkletFunction, RuntimeKind, serializableMappingCache)

### Pós-smoke fixes (FB.1-3)

**FB.1 — Backend `POST /quizzes/:quizId/check-answer`**
- Retorna `{isCorrect: boolean}` sem expor gabarito
- 3 testes (correct match / mismatch / question not in quiz)

**FB.2 — Mobile job polling**
- `quizzesService.enqueueQuizGeneration` + `pollJob` + `generateQuizAsync`
- Status text PT-BR durante geração: "Aguardando processamento" / "Gerando questões com IA" / "Concluído"
- User não precisa sair/voltar pra ver quiz pronto

**FB.3 — Wire LottieFeedback + check-answer**
- Substitui optimistic-always-true por chamada real
- LottieFeedback (correct/wrong) baseado em resposta real
- Wrong-answer juice (ScreenShake, haptic warning) agora reachable
- Network fallback: optimistic-positive

### Outros fixes da sessão

- Quiz parser tolerante: filtra questões inválidas (5+ opções → trunca, options não-array → skip), aceita ≥2 questões válidas em vez de rejeitar quiz todo
- ScreenShake: `flex:1` no Animated.View (filhos com flex:1 estavam colapsando)
- QuizIntro: `quiz.questions?.length ?? 0` (era undefined em quiz lite da listagem)
- QuizPlayer renderPlayPhase: guards defensivos (`!quiz.questions?.length`, `!question.options`)
- Removidos logs diagnósticos após debug session
- DEV-only random isCorrect 50/50 pra testar Lotties sem depender de acertar/errar

---

## Lottie integration (parcial)

`lottie-react-native@7.3.6` instalado. Component `LottieFeedback.tsx` criado em `mobile-app/src/components/juice/`.

Assets fornecidos pelo Marcelo (gerados via Claude Design) em:
- `mobile-app/src/components/juice/assets/gelpi-correct.json` (19KB, 10 layers)
- `mobile-app/src/components/juice/assets/gelpi-wrong.json` (14KB, 7 layers)

**🚨 PROBLEMA CONHECIDO:** assets atuais NÃO renderizam. Diagnóstico:
- JSON carrega (require ok)
- LottieView monta sem error
- `onAnimationFailure` não dispara
- DEBUG retângulo amarelo aparece no overlay → layout/z-index OK
- **Mas Lottie content roda fora do viewBox** (vazio dentro)
- Causa: README do pacote do Marcelo já avisava que JSONs foram "gerados manualmente seguindo schema Lottie 5.7.4" mas recomenda regenerar via After Effects + Bodymovin pra fidelidade. Confirmado com Marcelo após smoke: assets atuais quebrados.

**Solução pendente:** Marcelo regenerar Dr. Gelpi correct/wrong via After Effects + plugin Bodymovin. Substituir os 2 JSONs em `mobile-app/src/components/juice/assets/` quando chegarem. Hot reload aplica.

**State atual do `LottieFeedback.tsx`:**
- `DEBUG_RECT = false` (renderiza Lottie real, não retângulo de teste)
- Container 280x340 com background amarelo translúcido + borda vermelha (debug visual ainda ativo — remover quando confirmar funcionamento)
- `key={kind}` força re-mount ao trocar source
- `console.log` com w/h/fr/ip/op do JSON

**Pra remover debug visual quando assets corretos chegarem:**
- Tirar `backgroundColor: 'rgba(255,255,0,0.3)'` + `borderWidth/borderColor: 'red'`
- Tirar `console.log` interno
- Manter `key={kind}` e `resizeMode="contain"`

---

## Estado dos serviços

| Serviço | Porta | Status |
|---|---|---|
| Postgres docker (compartilhado) | 5433 | up healthy |
| Redis docker (compartilhado) | 6379 | up healthy |
| Backend worktree | 3000 | iniciar manualmente |
| Metro mobile worktree | 8081 | iniciar manualmente |
| Backend main | 3000 | NÃO rodar simultâneo com worktree |

Tests:
- Mobile: 47/47 passing
- Backend: 168/168 passing (excl. e2e)
- TypeScript: 0 erros novos (3 pré-existentes em `src/tw/` ignorados)

---

## Bugs / débitos pendentes

### Críticos
- **Lottie Dr. Gelpi assets quebrados** — Marcelo regenera via After Effects + Bodymovin
- **DEV-only random isCorrect 50/50** em `QuizPlayer.tsx:208` — REMOVER antes de release. Marker `// DEV: random 50/50 pra testar` + `if (__DEV__)` block. Trocar por chamada real `checkAnswer`.

### Importantes
- **Wrong-answer ainda assume `isCorrect=true`** quando DEV mode ativo. Quando random→fix→checkAnswer real, ScreenShake + haptic wrong serão reachable em produção.
- **Race condition double-tap durante checkAnswer** — `playStep !== 'answering'` só protege depois do await. Se user toca 2x rápido (<300ms), 2 calls disparam. Adicionar `isChecking` boolean local.
- **`Difficulty` em `QuizQuestion`** ausente — XP usa fallback MEDIUM pra todas. Sprint 2 (schema add).
- **Sons como assets pendentes** — `useSound` no-op silencioso. Pasta `mobile-app/src/assets/sounds/` ainda não existe. Quando assets chegarem, descomentar `require()` em `useSound.ts:14-21`.
- **Mascote vet idoso humano** (Sprint 3 inteiro) — você fornece Figma 7 variants, pipeline Figma → Aninix → Lottie → wire em QuizPlayer.

### Menores
- **`expo-av` deprecation warn** em SDK 54 — funcional mas vai sair em SDK 55. Migrar pra `expo-audio` (Sprint futuro).
- **`@react-native-community/slider@5.2.0` vs expected 5.0.1** — versão off, harmless mas Expo doctor reporta.
- **`expo-screen-orientation@55.0.13`** numa env SDK 54 — major mismatch, pre-existente.
- **`.env.example` backend criado parcial** (só PostHog vars) na sessão anterior.
- **Player HLS desktop video** retorna `kind=iframe` mesmo pra R2 — issue pré-existente, não Sprint 0/1. Fix existe em `feat/video-player-skin` worktree.
- **DEV `__DEV__` block aplicado mas tem `if (DEBUG_RECT)` em LottieFeedback** sempre `false` — remover toda variável quando assets corretos chegarem.

---

## Não merged em main

Branch `feat/quiz-gamification-foundation` continua viva. Worktree não foi removido. Merge atômico fica para depois de:
1. Lottie Dr. Gelpi novos chegarem e validados
2. Smoke E2E completo em device físico (com Lottie real)
3. Remover DEV blocks (random isCorrect, DEBUG_RECT, console.logs do LottieFeedback)
4. Race condition double-tap addressed
5. Sons (opcional — pode merge sem)

---

## Próximas sprints (não iniciadas)

**Sprint 2 — Mastery + Streak (1-2 sem)**
- Mastery decay log half-life ajustável (HARD 14d / MEDIUM 21d / EASY 30d)
- Streak refator (freeze level up + weekend auto)
- MasteryRadar tela
- Push notifications retomada de streak
- Adicionar `Difficulty` em `QuizQuestion` (fix débito)

**Sprint 3 — Mascote (2-3 sem)**
- Figma 7 variants (você fornece)
- Pipeline Figma → Aninix → Lottie
- Wire 7 estados em QuizPlayer + Profile
- Validação UX cohort 5-10 alunos

**Sprint 4 — Banco categoria livre (1 sem)**
- Admin UI: CRUD `Specialty` + `QuestionBankItem`
- Quiz fora da aula (escolhe categoria)
- Seed inicial 10 q × 8 specialties

---

## Decisões de produto fechadas (referência rápida)

- Mobile-first; web fase 2
- Mascote vet idoso humano fictício (não Marcelo)
- Confidence rating manual 4 níveis: GUESSED / THOUGHT_KNEW / KNEW / MASTERED
- Sem vidas, sem erros limitados, sem XP negativo
- Streak: freeze por level up (2 nos primeiros 5 levels, 1 depois, cap 7) + freeze automático fim de semana
- Mastery decay logarítmico ajustável por difficulty
- Combo break em erro, combo persiste por dia (reseta meia-noite user tz)
- XP fórmula: base × combo × confidence (sem time bonus)
- Audio default ON apenas se headphone detectado
- Quiz contextual = AI runtime (engine atual) / Quiz fora da aula = banco curado por specialty (Sprint 4)
- Daily case fora MVP (Fase 2 quando banco maduro)

---

## Spec + planos canônicos

- Spec: `docs/superpowers/specs/2026-04-25-quiz-gamification-dopamine-redesign-design.md` (gitignored, local-only)
- Plan Sprint 0: `docs/superpowers/plans/2026-04-25-sprint-0-foundation.md` (gitignored)
- Plan Sprint 1: `docs/superpowers/plans/2026-04-25-sprint-1-juice-mobile.md` (gitignored)
