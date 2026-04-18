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

`app.json` declarara `supportsTablet: false` (ver `fix(mobile): declare
portrait-only orientation` quando executado). Sem layout responsivo pra iPad
agora — app aparece em container compatibility mode.

**Plano:** sprint seguinte, implementar breakpoints responsivos + layout de
2 colunas pra iPad em telas de catalogo, curso, watch (video + sidebar).
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

### VideoPlayer nao reproduz `videoSource: youtube | vimeo | external`

`app/course/[id]/watch/[videoId].tsx` resolve `streamUrl` via
`videosService.getStreamData(video).hlsUrl`. Quando `type === 'embed'`
(YouTube, Vimeo, external), `hlsUrl` e `undefined` e o player mostra
"Video indisponivel".

**Plano:** ver `docs/proposals/playback-unified.md`. Quando contrato
`playback.kind` estiver aprovado + `react-native-webview` adicionado como
dep, implementar `EmbedPlayer.tsx` com WebView sandboxed.
**Alvo:** proximo sprint (depende de decisao do C + orcamento de bundle size).

---

## BACKEND CONTRACTS PENDENTES

### Migracao pra `playback.playbackUrl`

Contrato C publicou em `API-CHANGES-SPRINT.md` (secao "Video payload com
playback URLs") e `videos.service.ts` ainda le `cloudflareUrl` / `hlsUrl` /
`externalUrl` direto, com `CLOUDFLARE_CUSTOMER_CODE` hardcoded no client.

**Plano:** aguarda decisao do C sobre `playback-unified.md`. Depois migra
`videosService.getStreamData` pra consumir `video.playback` direto.
**Alvo:** este sprint.

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

**Plano:** validar no primeiro `eas build --profile preview` (P1.8). Se
falhar, documentar em `GUIA_BACKEND_LOCAL.md` como provisionar.
**Alvo:** este sprint (P1.8).

### `app.json` → `orientation` inconsistente com `_layout.tsx`

`app.json` tinha `orientation: "default"`, mas `_layout.tsx` lockava
`PORTRAIT_UP` programaticamente. Sera resolvido em
`fix(mobile): declare portrait-only orientation` (task orientation fix).
**Alvo:** este sprint.
