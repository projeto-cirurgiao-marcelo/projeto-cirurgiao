# Proposta: Contrato `playback` unificado em Video

**Autor:** Teammate B (mobile)
**Data:** 2026-04-17
**Status:** Proposta — aguardando revisão do C (backend) e do A (web) via líder
**Alvo:** `backend-api/src/types/shared.ts`, `backend-api/src/videos/*`, consumers mobile e web

---

## 1. Contexto

O backend (Teammate C) publicou em `docs/API-CHANGES-SPRINT.md` a seção **"Video payload com playback URLs"**: todo endpoint que retorna `Video` passa a incluir um objeto `playback` derivado do `videoSource`, evitando branching no cliente. Shape atual:

```ts
interface VideoPlaybackUrls {
  playbackUrl: string | null;  // null quando o video ainda nao esta pronto
  captionsUrl?: string;        // quando legendas NAO estao embutidas no stream
  poster?: string;             // thumbnail override
}
```

Rules por `videoSource`: cloudflare → `cloudflareUrl` + `/captions/:videoId/pt-BR`; youtube/vimeo/external → `externalUrl` sem `captionsUrl`; r2_hls → `hlsUrl` sem `captionsUrl` (legendas vêm no SUBTITLES group do master playlist).

**Guidance atual do C para clients:** parar de ler `cloudflareUrl`/`hlsUrl`/`externalUrl` direto, usar `playback.playbackUrl` e switchar rendering por `videoSource` (iframe para youtube/vimeo/external, HLS nativo para cloudflare/r2_hls).

## 2. O que o mobile precisa hoje

Estado atual em `mobile-app/src/services/api/videos.service.ts`:

- Função `getStreamData(video)` com **5 branches** que replica lógica de derivação de URL.
- **Hardcoded** `CLOUDFLARE_CUSTOMER_CODE = 'mcykto8a2uaqo5xu'` (linha 5) — débito técnico direto. Se o Cloudflare customer mudar, precisa redeploy do mobile.
- Retorna `{ type: 'cloudflare' | 'embed' | 'none', hlsUrl?, cloudflareId?, embedUrl? }` — semântica frouxa (`type: 'cloudflare'` inclui r2_hls, que não é cloudflare).
- `VideoPlayer.tsx` consome só `streamUrl: string` (o `hlsUrl` resolvido). Assume sempre HLS; não trata `embedUrl` (YouTube/Vimeo). Isso significa que hoje, quando `videoSource === 'youtube' | 'vimeo' | 'external'`, o player mobile **não funciona** — só cai no "Vídeo indisponível".

## 3. O contrato atual cobre o mobile?

**Parcialmente sim, com 3 gaps:**

### Gap 1 — Client precisa saber como renderizar, não só a URL

`playback.playbackUrl` é só a URL. Pra decidir entre HLS nativo vs iframe vs "não suportado", o client ainda precisa ler `videoSource`. O doc pede explicitamente isso ("switch rendering based on `videoSource`"), mas espalha a decisão.

**Sugestão aditiva:** incluir um campo `kind` no `playback` que encapsula a decisão de renderização.

### Gap 2 — `captionsEmbedded` explícito

Hoje a regra "legendas vêm embutidas no SUBTITLES group quando r2_hls" é **convenção implícita**. Se amanhã uma conversão Cloudflare também ganhar legendas embutidas, ou um r2_hls não tiver, o mobile não tem sinal explícito. Detectar legendas via `availableSubtitleTracks` em runtime já funciona (expo-video faz isso), mas um flag no contrato simplifica UX (ex: esconder botão CC quando sem legendas disponíveis sem esperar sourceLoad).

**Sugestão aditiva:** `captionsEmbedded?: boolean` — `true` quando legendas estão no manifest, `false` quando separadas via `captionsUrl`, `undefined` quando não há legendas.

### Gap 3 — Auth em `captionsUrl`

Doc diz: "Backend proxies the VTT to keep auth server-side" para `cloudflare`. Pra mobile isso significa: fetch com `Authorization: Bearer <firebaseToken>` obrigatório. Expo-video precisa da URL pura — não aceita header injection direto. Alternativas: (a) backend devolve VTT com token opaco já embutido na URL (pre-signed, expira), (b) mobile baixa VTT em RAM e serve via URL local (mais complexo). Hoje o mobile **não** consome `captionsUrl` separado — só usa legendas embutidas (r2_hls) ou sidecar servido pelo próprio stream Cloudflare.

**Pergunta pro C:** `captionsUrl` já é pre-signed ou exige header `Authorization`? Se exige header, o mobile não consegue consumir direto via expo-video (limitação da lib). Alternativas: pre-sign com TTL curto (5min), ou manter legendas só via stream embutido.

## 4. Proposta refinada

### 4.1. Shape aditivo (não-breaking)

```ts
type PlaybackKind =
  | 'hls'      // HLS nativo: r2_hls OU cloudflare com HLS manifest
  | 'iframe'   // embed HTML: youtube, vimeo, external generico
  | 'none';    // nao reproduzivel (upload em andamento, falha, etc.)

interface VideoPlaybackUrls {
  /** Onde o player carrega o stream. Null se video nao pronto. */
  playbackUrl: string | null;

  /** Como renderizar: 'hls' usa <VideoView/>, 'iframe' usa <WebView/>, 'none' mostra fallback. */
  kind: PlaybackKind;

  /** Legendas separadas, quando NAO embutidas no stream. */
  captionsUrl?: string;

  /** true se legendas vem no manifest (SUBTITLES group). false se via captionsUrl. undefined se nao ha. */
  captionsEmbedded?: boolean;

  /** Thumbnail override (mesmo que video.thumbnailUrl quando definido). */
  poster?: string;
}
```

**Mapeamento proposto backend → `kind`:**

| `videoSource` | `kind` | `playbackUrl` | `captionsEmbedded` | `captionsUrl` |
|---|---|---|---|---|
| `cloudflare` (ready)   | `hls`    | `customer-<code>.cloudflarestream.com/<id>/manifest/video.m3u8` | `false` quando captions geradas, undefined senao | `/api/v1/captions/:videoId/pt-BR` quando captions prontas |
| `cloudflare` (pending) | `none`   | `null` | undefined | undefined |
| `r2_hls`               | `hls`    | `video.hlsUrl` | `true` (pipeline externo embute) | undefined |
| `youtube`              | `iframe` | `video.externalUrl` | undefined | undefined |
| `vimeo`                | `iframe` | `video.externalUrl` | undefined | undefined |
| `external`             | `iframe` | `video.externalUrl` | undefined | undefined |

### 4.2. O que muda no client

**Mobile (esta proposta):**
```tsx
// Antes: videosService.getStreamData(video).hlsUrl || ''
// Depois:
const { playbackUrl, kind } = video.playback;
if (kind === 'hls' && playbackUrl) {
  return <VideoPlayer streamUrl={playbackUrl} video={video} />;
}
if (kind === 'iframe' && playbackUrl) {
  return <EmbedPlayer url={playbackUrl} />; // novo componente com WebView
}
return <VideoUnavailable />;
```

Remove o hardcode `CLOUDFLARE_CUSTOMER_CODE` — backend sempre entrega a URL final.

**Web:** A adapta em paralelo (fora do meu escopo, alinho via líder).

## 5. Por que unificar? (justificativa)

**O que o mobile ganha:**
1. **Elimina hardcode** de `CLOUDFLARE_CUSTOMER_CODE` no client.
2. **Elimina branching de 5 vias** em `getStreamData`. Código do mobile vira 3 linhas.
3. **Destrava YouTube/Vimeo/external** no mobile — hoje não reproduz. Com `kind: 'iframe'`, plugamos `react-native-webview` (nova dep, ~400kb) e suporta.
4. **`captionsEmbedded` resolve UX do CC toggle:** hoje o botão CC aparece só depois que `sourceLoad` dispara e detecta tracks. Com o flag, pode aparecer imediatamente.

**O que o web ganha:**
1. Mesma eliminação de branching.
2. Mesma resiliência a mudança de customer Cloudflare.
3. Consistência de render: `kind: 'iframe'` padroniza uso de `<iframe sandbox>` ao invés de branches por provider.

**O que o backend ganha:**
1. Ponto único de verdade sobre como reproduzir. Se amanhã migrar r2_hls pra Mux, só muda `buildPlaybackUrls` — zero mudança em client.
2. Habilita features futuras (DRM, pre-signed URLs, fallback CDN) sem coordenar deploys.

## 6. Riscos e pontos em aberto

- **Risco baixo de quebrar algo:** proposta é **aditiva** sobre o contrato atual. `playbackUrl`, `captionsUrl`, `poster` já existem — só adiciona `kind` e `captionsEmbedded`.
- **Pergunta aberta pro C:** `captionsUrl` do fluxo cloudflare exige `Authorization: Bearer`? Se sim, como mobile consome via expo-video que não injeta headers? Alternativas: pre-sign TTL-curto ou manter só embutidas (aceitar que fluxo cloudflare no mobile não terá CC separado até r2_hls tomar conta).
- **Pergunta pro C:** `kind: 'iframe'` faz sentido do lado backend, ou prefere manter o nome `videoSource` como campo-chave e o client deriva? Tanto faz, mas `kind` abstrai melhor o "como renderizar" vs "de onde veio".
- **Não-bloqueador pra mobile:** se C preferir não adicionar `kind`, o mobile pode derivar a partir de `videoSource` (recebido na mesma payload). A proposta aqui é um "nice to have", não um "must".

## 7. O que o mobile faz se C aprovar

1. Consome `backend-api/src/types/shared.ts` copiado literalmente pra `mobile-app/src/types/api-shared.ts` (protocolo já no doc do C).
2. Refactora `videosService.getStreamData` → trivial: `return video.playback`.
3. Remove hardcode `CLOUDFLARE_CUSTOMER_CODE`.
4. Adapta `app/course/[id]/watch/[videoId].tsx` pra switchar por `playback.kind`.
5. Se C aprovar YouTube/Vimeo: adiciona `react-native-webview` + `EmbedPlayer.tsx` simples (fora deste PR — sprint seguinte se o backlog permitir).

## 8. O que o mobile faz se C contestar

Mantém `videos.service.ts` como está. O contrato atual publicado pelo C **já é suficiente** pra migrar o mobile em mudança incremental mesmo sem `kind`/`captionsEmbedded` — a proposta aqui é refinamento, não requisito. Se indeferido, faço apenas a migração pra `playback.playbackUrl` (remove hardcode, simplifica o branching mantendo a derivação de render no client via `videoSource`).

## 9. Próximos passos

- [ ] Líder encaminha esta proposta ao Teammate C.
- [ ] C responde: aprova / contesta / pede mudanças.
- [ ] Se aprovado: C implementa (aditivo, sem remover campos legados) e atualiza `API-CHANGES-SPRINT.md`.
- [ ] Teammate A (web) alinha adaptação em paralelo.
- [ ] Teammate B (eu) migra `videos.service.ts` + telas consumidoras.
