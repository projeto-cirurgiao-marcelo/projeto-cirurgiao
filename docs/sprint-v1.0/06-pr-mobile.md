# PR — Mobile (track/front-mobile → release/v1.0)

**Título**: `feat(mobile): sprint v1.0 — cleanup, logger, orientation, subtitle selector, NetInfo, 429 toast, playback kind, eas.json, STORE-RELEASE, 30 smoke tests`

**Base**: `release/v1.0` (após merge de backend)
**Compare**: `track/front-mobile`
**Autor**: Teammate B
**Commits**: 17

---

## Summary

App Expo preparado pra beta TestFlight + Play Internal. Dead code removido, logger unificado, orientação declarativa portrait-only, seletor manual de legendas, hook de NetInfo com debounce, paridade 429 UX com web, migração pro contrato `playback.kind` (elimina `CLOUDFLARE_CUSTOMER_CODE` hardcoded), `eas.json` com 3 perfis operacionais, checklist STORE-RELEASE em pt-BR, 30 smoke tests Jest.

---

## ⚠️ Breaking changes

1. **Consumer do contrato `playback` unificado** — requer backend com commits `332d792` + `6f8847f`. Types copiados literal de `backend-api/src/types/shared.ts` pra `mobile-app/src/types/api-shared.ts`.

2. **Orientação trava portrait declarativamente** via `app.json: "orientation": "portrait"`. Removido lock programático redundante. Exceção: `VideoPlayer.tsx` lockAsync LANDSCAPE em fullscreen + restore PORTRAIT_UP ao sair.

3. **`supportsTablet: false` em iOS** — app aparece em compatibility mode em iPad. Layout responsivo iPad fica pro próximo sprint.

4. **`CLOUDFLARE_CUSTOMER_CODE` hardcoded removido** (`videos.service.ts:5`). Backend agora entrega URL completa via `playback.playbackUrl`.

5. **Transcripts mobile (serviço + componente) removidos** — apontavam pro endpoint `TranscriptsModule` que o backend removeu. Zero imports em runtime; limpeza cosmética.

6. **Fallback dedicado pra YouTube/Vimeo/external**: antes caía no genérico "Vídeo indisponível". Agora mostra card "Em breve no app mobile" com hint pro site. Sem regressão funcional (vídeos continuam não reproduzíveis nativamente — WebView vem no próximo sprint).

---

## Commits agrupados por feature

### P0 — Cleanup
- `40bab35` remove orphan transcripts service and VideoTranscript component
- `3c6dafc` add dedicated logger and replace `console.*` (74 substitutions across 34 files)
- `ca0956d` remove CLOUDFLARE_CUSTOMER_CODE migration comments (history in git log)

### Playback contract (#9)
- `8f02b57` propose unified playback contract (arquivo de proposta em `docs/proposals/playback-unified.md`)
- `c49b382` consume unified playback contract (kind + captionsEmbedded) — substitui `getStreamData` + branching 5-way

### P1 — Paridade e polimento
- `1446231` declare portrait-only orientation + keep fullscreen landscape exception
- `f5e976b` manual subtitle track selector in VideoPlayer
- `9816a57` useNetworkStatus hook with debounced reconnect + refetch on list screens
- `cacf99a` handle 429 rate limit with toast (synced with web spec)

### P4 — Store-ready
- `ce62ea8` align `eas.json` across 3 profiles + document deploy flow
- `f1e0589` STORE-RELEASE.md with TestFlight + Play Internal checklist

### P3 — Testes
- `fb2babe` jest-expo + @testing-library/react-native setup
- `97bda40` smoke tests for network + services + logger + offline banner (20 tests)
- `e06dfd3` auth + catalog + VideoPlayer + gamification smoke tests (10 tests)

### Docs
- `920ba94` create TECH-DEBT.md with sprint context
- `75ce2e8` update TECH-DEBT.md after orientation + supportsTablet fixes
- `92027bc` mark playback migration resolved in TECH-DEBT

---

## Testing notes

```bash
cd mobile-app
npm ci
npx tsc --noEmit          # clean
npm test                  # 30 tests, 9 suites, <10s
npm run test:coverage     # coverage report, per-file high em camadas tocadas
```

**Builds EAS** (executados pelo Gustav, não automatizável no CI via agent):

```bash
# Dev client no device (opcional pra dev)
eas build --profile development --platform android

# Preview (validação pré-submit)
eas build --profile preview --platform android
eas build --profile preview --platform ios   # requer Apple Developer ativa

# Production (release final)
eas build --profile production --platform android
eas build --profile production --platform ios
```

Valores esperados em EAS Secrets (setar via `eas env:create` antes do build):
- `EXPO_PUBLIC_API_URL` (apontar pro Cloud Run staging/prod)
- `EXPO_PUBLIC_FIREBASE_*` (Firebase Web SDK config)
- Firebase native configs: `GoogleService-Info.plist` (iOS) e `google-services.json` (Android) — referenciados em `app.json` mas **não trackeados no repo**. Documentado em `mobile-app/docs/DEPLOY.md`.

---

## Coverage per-file (camadas críticas)

| Arquivo | Statements |
|---|---|
| `src/services/api/videos.service.ts` | 100% |
| `src/hooks/useNetworkStatus.ts` | 92.68% |
| `src/lib/logger.ts` | 77.77% |
| `src/constants/colors.ts` | 100% |
| `app/courses/catalog.tsx` | 47.36% |
| `app/(auth)/login.tsx` | 31.57% |
| `src/services/api/client.ts` | 29.85% |

Global 9.32% reflete 20+ services/screens não cobertos (stretch pro próximo sprint — documentado em `mobile-app/docs/TECH-DEBT.md`).

---

## CVEs identificados (fix no go-live)

| Package | Severity | Target |
|---|---|---|
| protobufjs <7.5.5 (via firebase) | CRITICAL | audit fix (transitivo) |
| axios 1.7.9 | HIGH (5 CVEs) | 1.16.0 |
| follow-redirects <=1.15.11 | MODERATE (transitivo) | audit fix |

Procedimento em `mobile-app/docs/DEPLOY.md` + `frontend-web/docs/DEPLOY.md §6`. **Não rodar `npm audit fix` no sprint** — exige rebuild EAS em device real antes de mergear.

---

## Links

- **Deploy guide mobile**: `mobile-app/docs/DEPLOY.md` (EAS builds, secrets, troubleshooting)
- **TECH-DEBT mobile**: `mobile-app/docs/TECH-DEBT.md` (CVEs, dependency preview, UX fallbacks, backend contracts pendentes)
- **Store release checklist**: `mobile-app/docs/STORE-RELEASE.md` (TestFlight + Play Console, screenshots, descrições pt-BR, política de privacidade, IARC)
- **Proposta playback unified**: `mobile-app/docs/proposals/playback-unified.md` (arquivo histórico — contrato final implementado pelo C)
- **Types compartilhados**: `mobile-app/src/types/api-shared.ts` (copiada de `backend-api/src/types/shared.ts`)

---

## Release notes checklist (pra Gustav popular depois)

- [ ] Novidade usuário: [ex: "Seletor de legendas aparece quando o vídeo tem múltiplos idiomas", "Banner claro quando perde conexão"]
- [ ] Invisible-but-important: [ex: "Código de Cloudflare não mais hardcoded — backend controla"]
- [ ] UX melhorias: [ex: "YouTube/Vimeo/external têm fallback claro apontando pro site"]
- [ ] Platform notes iOS: [ex: "Portrait-only; iPad em compatibility mode — layout responsivo iPad no próximo release"]
- [ ] Platform notes Android: [ex: "APK preview testável via link do EAS"]
- [ ] Known limitations: [ex: "Vídeos YouTube/Vimeo/external ainda não reproduzem nativamente — próximo sprint"]
