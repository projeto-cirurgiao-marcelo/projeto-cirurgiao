# Tech Debt — Mobile (`mobile-app/`)

Debito tecnico consciente na track `track/front-mobile` (Teammate B). Cada item
tem severidade, racional e plano de saida. Nenhum destes bloqueia o go-live —
sao itens a serem enderecados no proximo sprint ou especificamente no ciclo
de lancamento (ex: CVE-fix no go-live).

Atualize este arquivo sempre que um novo debito surgir ou um existente for
fechado.

---

## SECURITY

### CVEs abertas em dependencias

**Status:** pendente de `npm audit --production` no worktree com `node_modules`.
O teammate optou por NAO rodar `npm install` durante o sprint (respeita guidance
do lider — EAS builds podem resolver lockfile diferente). `npm audit fix` e
explicitamente **desautorizado** no sprint (risco de quebrar builds EAS).

**Plano:** rodar `npm audit --production` durante o ciclo de go-live, listar
severidades altas aqui com id do CVE + caminho de dependencia, avaliar se
precisa `npm audit fix` ou update manual de dep especifica. Risco aceito
durante o sprint.

**Owner:** Teammate B (mobile). **Alvo:** go-live.

---

## DEPENDENCIAS PREVIEW / NIGHTLY

### `nativewind@5.0.0-preview.2`

Preview release. Pode conter bugs ou mudancas de API antes do stable 5.0.0.

**Plano:** quando `nativewind@5.0.0` estavel sair, upgrade + smoke test em
toda a UI (classe utilities, conditional styles, theme). **Alvo:** proximo
sprint ou quando NativeWind fizer release stable.

### `react-native-css@0.0.0-nightly.5ce6396`

Nightly build. Travado no lockfile mas qualquer `npm install` em ambiente
novo pode pegar outra versao se lockfile nao for respeitado.

**Plano:** monitorar. Considerar retirar se a engine conseguir rodar sem ela
na versao stable do NativeWind. **Alvo:** proximo sprint.

---

## UX E FALLBACKS

### `supportsTablet: false` em iOS

**Status:** APLICADO em commit `1446231` (2026-04-17) — `app.json` declara
`supportsTablet: false`. Sem layout responsivo pra iPad agora — app aparece
em container compatibility mode.

**Debito remanescente:** layout responsivo pra iPad.

**Plano:** sprint seguinte, implementar breakpoints responsivos + layout de
2 colunas pra iPad em telas de catalogo, curso, watch (video + sidebar).
Virar `supportsTablet: true` quando layout estiver pronto.
**Alvo:** proximo sprint.

### Sem `ErrorBoundary` em nenhuma tela

Se qualquer componente React lancar em render (ex: VideoPlayer com props
invalidas, ChatScreen com conversa corrompida), o app todo trava com tela
branca — sem fallback amigavel.

**Plano:** introduzir `react-native-error-boundary` (ou Sentry ErrorBoundary
se adotarmos Sentry) + wrap em cada `Stack.Screen` do `app/_layout.tsx`.
Fallback UI: "Algo deu errado. Toque para recarregar." + `router.replace`.
**Alvo:** proximo sprint.

### Sem crash reports / telemetria

`logger.error` / `logger.warn` hoje so imprimem no console. Em producao isso
nao chega pra equipe — perdemos visibilidade de erros em device real.

**Plano:** integrar Sentry (ou Firebase Crashlytics, ja que Firebase ja esta
no stack). Plugar no `logger.error` / `logger.warn`. **Alvo:** go-live.

### VideoPlayer nao reproduz `videoSource: youtube | vimeo | external` (PARCIALMENTE RESOLVIDO)

**Status:** PARCIALMENTE RESOLVIDO em commit `c49b382` (2026-04-17).
Antes `'iframe'` caia no generico "Video indisponivel"; agora cai num
fallback dedicado "Em breve no app mobile" com hint pra abrir no web.
Sinal claro pro aluno: o video existe, so nao toca nativamente ainda.

**Debito remanescente:** `EmbedPlayer.tsx` com `react-native-webview`
sandboxed. Quando implementado, troca o branch `kind === 'iframe'` pra
renderizar o WebView ao inves do fallback.
**Alvo:** proximo sprint (depende de orcamento de bundle size — WebView
e ~400kb no bundle Android).

---

## BACKEND CONTRACTS PENDENTES

### ~~Migracao pra `playback.playbackUrl`~~ RESOLVIDO

**Status:** RESOLVIDO em commit `c49b382` (2026-04-17).
- `backend-api/src/types/shared.ts` copiado pra
  `mobile-app/src/types/api-shared.ts` (protocolo de copia literal).
- `videosService.getStreamData` + interface `StreamData` removidos.
- Constante `CLOUDFLARE_CUSTOMER_CODE = 'mcykto8a2uaqo5xu'` REMOVIDA.
- `app/course/[id]/watch/[videoId].tsx` switcha por `video.playback.kind`:
  `'hls'` -> VideoPlayer HLS nativo; `'iframe'` -> fallback "Em breve
  no app mobile"; `'none'` ou playback ausente -> "Video indisponivel".
- Mobile ignora `captionsUrl` (opcao b do C — web-only).

**Debito remanescente:** `EmbedPlayer.tsx` com `react-native-webview` pra
tocar YouTube/Vimeo/external direto no mobile ao inves do fallback. Trocar
o if `kind === 'iframe'` pra renderizar `<EmbedPlayer url={playbackUrl} />`.

**Alvo:** proximo sprint (depende de autorizacao de bundle size + decisao
sobre inclusao/exclusao de `react-native-webview`).

### Fila BullMQ (`202 + jobId`) em endpoints de IA

`summariesService.generateSummary` e `quizzesService.generateQuiz` esperam
resposta sincrona hoje. Quando C ligar `QUEUE_ENABLED=true`, backend retorna
`202 { jobId, status: 'queued' }` e client precisa pollar `GET /jobs/:id`.

**Plano:** task P2.9 no backlog. Aguarda sinal do lider pra iniciar (C precisa
sinalizar `QUEUE_ENABLED=true` em staging primeiro). Sera implementado via
`src/services/api/jobs.service.ts` + `src/hooks/useJobPolling.ts`.
**Alvo:** este sprint, condicional.

---

## TESTES

### Zero cobertura automatizada

Nenhum `jest`, `jest-expo`, `@testing-library/react-native` instalados. Zero
tests em `app/` ou `src/`.

**Plano:** task P3.10. Smoke tests minimos (5-8 testes) cobrindo login,
catalogo, VideoPlayer HLS mock, ChatScreen mock, gamification render.
**Alvo:** este sprint, stretch.

---

## OUTRAS

### `GoogleService-Info.plist` e `google-services.json` fora do repo

Referenciados em `app.json`. Ausentes do worktree (estao no `.gitignore` e
provavelmente em EAS Secrets ou workdir local do Gustav).

**Risco:** EAS build falha silenciosamente se secrets nao estiverem
configurados corretamente. `.easignore` atual nao menciona esses arquivos.

**Plano:** documentado em `docs/DEPLOY.md` (P1.8 combinado com P4.11)
explicitando quais EAS Secrets/env vars sao esperados. Validacao real
acontece no primeiro `eas build --profile preview` que o Gustav rodar.
**Alvo:** pre go-live.

### Reentrada de rede — banner + refetch (RESOLVIDO parcialmente)

**Status:** RESOLVIDO em commit `9816a57` (2026-04-17) para telas de lista
(home, catalog, in-progress, forum, course detail, module list, watch).
`src/hooks/useNetworkStatus.ts` expoe `{ isOnline, wasOffline, onlineSince }`
com debounce de 500ms em offline->online. `OfflineBanner` consome o mesmo
hook ao inves de falar com `NetInfo` diretamente.

**Debito remanescente:**
- Fila de retry de requests em andamento quando a rede cai mid-flight.
  Hoje falhando requests sao perdidos silenciosamente — usuario precisa
  abrir a tela de novo. Uma camada de axios interceptor com retry automatico
  + queue persistida (AsyncStorage) resolveria. Fora do escopo do sprint.
- Progresso de video salvo offline. `progressService.saveProgress` chama
  POST direto; se offline, progresso e perdido. Solucao: enfileirar em
  AsyncStorage e flush no `wasOffline` pulse.
**Alvo:** proximo sprint.

### ~~`app.json` → `orientation` inconsistente com `_layout.tsx`~~ RESOLVIDO

**Status:** RESOLVIDO em commit `1446231` (2026-04-17).
- `app.json` virou `"orientation": "portrait"`.
- `_layout.tsx` perdeu o lock programatico redundante.
- `watch/[videoId].tsx` perdeu o `unlockAsync` + relock.
- `VideoPlayer.tsx` ganhou `requestFullscreen` (lockAsync LANDSCAPE) +
  `handleFullscreenExit` (lockAsync PORTRAIT_UP) + cleanup no unmount.

Mantido no doc como historico pra audit.
