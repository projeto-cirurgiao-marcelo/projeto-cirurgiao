# PR — Web (track/front-web → release/v1.0)

**Título**: `feat(web): sprint v1.0 — cleanup, logger, PII masking, 429 handling, onboarding, playback kind, waitForJob, Playwright e2e`

**Base**: `release/v1.0` (após merge de backend + mobile)
**Compare**: `track/front-web`
**Autor**: Teammate A
**Commits**: 28

---

## Summary

Polimento de produção + dívida técnica do painel web. Dead code consolidado, logger com mascaramento de PII, 429 UX via toast com paridade cross-platform, fallback amigável pro Cloudflare SDK, fluxo de onboarding ausente implementado, admin ganhou import de R2 HLS, player simplificado via `playback.kind` do backend, fila BullMQ transparente via `waitForJob`, Playwright rodando 3 jornadas e2e em <10s.

---

## ⚠️ Breaking changes

1. **Consumer do contrato `playback` unificado** — requer backend com commits `332d792` + `6f8847f` (ambos no PR de backend). Se backend estiver antigo em staging, fallback legado preservado (branching manual por `videoSource` continua funcionando).

2. **Rotas removidas**:
   - `/admin/courses-new` (layout `(platform)/`, redesign Coursera-like abandonado).
   - `/student/my-courses-new` (idem).

3. **Grupo `(platform)/` deletado**: nenhum import interno aponta mais pra ele.

4. **`auth-store-firebase.ts` removido**: zero imports — era dead code. Nenhuma mudança funcional.

5. **`VideoTranscriptManager` removido**: componente admin órfão (feature descartada pelo backend).

---

## Commits agrupados por feature

### P0 — Dead code cleanup
- `e469980` remove auth-store-firebase (zero imports)
- `8203b4a` remove (platform) coursera-style layout
- `592669b` remove VideoTranscriptManager (feature discarded)
- `3ba7a05` TECH-DEBT.md com nota de video.js dead stack

### Logger + privacidade
- `31c9d7b` add logger com gate `NODE_ENV='development' || NEXT_PUBLIC_DEBUG='true'`
- `6654e3a` replace console.* in student watch flow
- `cebff09` replace console.* in admin video/module flows
- `120fb09` replace console.* in services (api/lib)
- `9d6e88c` replace console.* in auth + stores + student pages
- `c5d859e` remove tusUploadUrl logging (signed token)
- `d93f6ea` mask email in logs (`maskEmail` utility — PII/LGPD)

### UX e feedback
- `d2b3e00` handle 429 rate limit with toast + manual retry
- `352a469` fallback UI when Cloudflare Stream SDK fails to load
- `122dfcf` onboarding flow (profile-info + specializations) with redirect gate
- `dd456c8` skeleton loaders in student course listings
- `163dc6d` T7 loading audit doc (gaps adiados)

### Playback & admin
- `198f041` consume POST /modules/:moduleId/videos/from-r2-hls (admin import modal)
- `5714689` simplify video source branching using `playback.kind`

### E2E (Playwright)
- `1b9b223` Playwright config + login spec
- `50f5c6b` watch-and-progress-save journey
- `b083011` quiz flow journey

### BullMQ polling (waitForJob utility)
- `f6a3017` waitForJob utility with polling + backoff + timeout
- `de0908d` cover waitForJob sync/async/timeout/abort (9 tests)
- `d1bc806` isEnqueuedJob type guard + tests (4 tests)
- `96ce46b` integrate waitForJob into AI services (summaries, chatbot, library, quizzes)

### Docs
- `0532158` SECURITY section in TECH-DEBT (CVE tracking)
- `4a295ef` DEPLOY §6 go-live checklist skeleton
- `cb04568` consolidate go-live dependency upgrade checklist (web + mobile)

---

## Testing notes

```bash
cd frontend-web
npm ci
npm run build       # 32 rotas, clean
npm test            # 13 unit tests (waitForJob utility)
npx playwright test # 5 e2e tests in <10s (requer backend + seed)
```

E2E requer:
- Backend rodando (local ou staging).
- Seed aplicado (`backend-api/prisma/seed-staging.ts`).
- Env vars `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` em `.env.test` ou via CLI.

**Playwright é frontend-isolated**: mocka endpoints de backend + bypass de Firebase real (injeta cookie + localStorage + mock de `POST /auth/firebase-login`). Funciona sem backend live. Limitação documentada no spec — quando hlsUrl real chegar em R2, testes podem ser expandidos.

---

## Links

- **Deploy guide web**: `frontend-web/docs/DEPLOY.md` (§6 GO-LIVE CHECKLIST com bloco de upgrade de deps)
- **TECH-DEBT web**: `frontend-web/docs/TECH-DEBT.md` (SECURITY-CRITICAL + video.js dead stack)
- **Spec 429 UX**: `frontend-web/docs/proposals/429-ux-spec.md` (consumida pelo mobile pra paridade)
- **T7 loading audit**: `frontend-web/docs/proposals/t7-loading-audit.md` (gaps pro próximo sprint)
- **Types compartilhados**: `frontend-web/src/types/api-shared.ts` (copiada de `backend-api/src/types/shared.ts`)

---

## CVEs identificados (fix no go-live)

Documentados em `frontend-web/docs/TECH-DEBT.md` seção SECURITY-CRITICAL:

| Package | Severity | Target |
|---|---|---|
| Next.js 15.3.6 | HIGH (10 CVEs, 1 CRITICAL RCE) | 15.3.8 |
| React 19.2.0 | CRITICAL (RCE RSC) | 19.2.1 |
| axios 1.13.2 | HIGH (3+ CVEs) | 1.16.0 |
| protobufjs <7.5.5 | CRITICAL (transitivo firebase) | audit fix |
| @xmldom/xmldom <0.8.12 | HIGH (transitivo) | audit fix |
| follow-redirects <=1.15.11 | MODERATE (transitivo) | audit fix |

Procedimento em `frontend-web/docs/DEPLOY.md §6 Pre-release dependency upgrade`.

---

## Release notes checklist (pra Gustav popular depois)

- [ ] Novidade usuário: [ex: "Onboarding mais claro pra novos alunos", "Toast amigável quando chat/quiz IA precisa de pausa"]
- [ ] Novidade admin: [ex: "Importar vídeos já processados em R2 direto pelo painel"]
- [ ] UX melhorias: [ex: "Skeletons em listagens de cursos", "Loading states consistentes"]
- [ ] Invisible-but-important: [ex: "Logs de produção limpos de dados sensíveis"]
- [ ] Known limitations: [ex: "Onboarding detail can be refined — next sprint"]
