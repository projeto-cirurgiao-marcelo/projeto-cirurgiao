# Handoff 2026-10-19 — Anti-compartilhamento de conta

Decisão do Gustavo em 19/10/2026 depois do levantamento: hoje não havia defesa nenhuma. A URL da aula no CDN respondia 200 sem credencial, e a sessão Firebase não tinha limite nem registro de dispositivos. Dois itens entraram:

## 1. Vídeo só toca com token (`video-gate`)

- **Worker** `cloudflare-workers/video-gate/`, rota `cdn.projetocirurgiao.app/videos/*` (zona `projetocirurgiao.app`). A rota tem precedência sobre o custom domain do bucket só nesse prefixo; thumbnails e o resto do host seguem direto no R2.
- **Token** `?t=<base64url(json)>.<base64url(hmac-sha256)>`, payload `{ u: userId, p: "/videos/<dir>/", e: expUnix }`, validade 12 h, segredo `VIDEO_TOKEN_SECRET`. Mesmo formato em três lugares: `backend-api/src/modules/showcases/video-token.service.ts` (assina), `cloudflare-workers/video-gate/src/token.ts` (verifica) e `cloudflare-workers/r2-browser/src/video-token.ts` (cópia, assina a prévia do admin com `u: "admin"`). **Mudou o formato num, muda nos três.**
- **Quem assina:** `AccessService.decorateVideo` (payload do `GET /videos/:id`), tanto com acesso quanto na prévia de 120 s. Só URLs do host `VIDEO_CDN_HOST`; Cloudflare Stream/YouTube passam intactas. Sem `VIDEO_TOKEN_SECRET`/`VIDEO_CDN_HOST` o backend devolve a URL crua (ambiente local).
- **Playlists** saem do Worker com `?t=` anexado em cada URI relativa (variantes, segmentos, `URI="..."` de legenda). Segmentos usam `caches.default` com chave sem o token.
- **`ENFORCE`** (var do `wrangler.toml`): `"0"` = observação — sem token válido ainda serve, mas loga `{"msg":"token rejeitado","reason":…}`. `"1"` = 403. **Fica em 0 até os apps das lojas mandarem token** (não há OTA; o iOS build 8 em revisão na Apple e o Android publicado usam URL crua). Virar para 1 quando `npx wrangler tail` mostrar só `reason` ausente para clientes antigos já fora de uso.
- **Wrangler nesta máquina:** há `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` globais de outro projeto sem permissão; rodar `env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_GATEWAY_ID npx wrangler …` (login OAuth já feito na conta do Gustavo, `ad41f4e2…`).
- Segredos: backend (Secret Manager → env `VIDEO_TOKEN_SECRET`; envs `VIDEO_CDN_HOST=cdn.projetocirurgiao.app`, `MAX_ACTIVE_DEVICES=3`), `npx wrangler secret put VIDEO_TOKEN_SECRET` em `video-gate` **e** em `r2-browser`.
- Expirou (12 h de aba aberta): o player recebe 403 e recarrega a aula do backend uma vez (web e mobile).

## 2. Dispositivos por conta

- Tabela `user_devices` (`UserDevice`): `(userId, deviceId)` único, `platform`, `name`, `lastSeenAt`, `revokedAt`. Migration `20261019120000_user_devices` (idempotente).
- Clientes mandam em toda requisição `X-Device-Id` (uuid persistido: `expo-secure-store` no app, `localStorage` na web), `X-Device-Name`, `X-Device-Platform` (`ios|android|web`).
- `DevicesService` (`backend-api/src/modules/firebase/devices.service.ts`, exportado pelo `FirebaseModule` global):
  - `register` no `POST /auth/firebase-login`: (re)ativa o dispositivo e, para STUDENT, revoga os mais antigos por `lastSeenAt` além de `MAX_ACTIVE_DEVICES` (default 3). ADMIN/INSTRUCTOR sem limite.
  - `touch` no `FirebaseAuthGuard` a cada request: cria se não existe (cliente que logou antes da feature), grava `lastSeenAt` no máximo a cada 5 min; **revogado → 401 `{ code: "DEVICE_REVOKED" }`**. Sem header → passa (clientes antigos). `request.user.deviceId` fica disponível.
  - `POST /auth/logout` revoga o dispositivo atual **quando chamado** — hoje app e web deslogam só no Firebase e não chamam essa rota (no app a chamada quebrava os testes de concorrência do auth-store); o aparelho some da lista quando cai pelo limite ou é desconectado por outro. `GET /auth/devices` (com `current`), `DELETE /auth/devices/:id`. Admin: `GET /users/:id/devices`, `DELETE /users/:id/devices/:deviceId`.
- Clientes tratam `DEVICE_REVOKED`: logout local + "Esta conta foi usada em outro aparelho. Entre novamente." Tela "Dispositivos conectados" no perfil (app e web).
- Limitação aceita: um dispositivo derrubado ainda toca um vídeo cujo token já tinha (até 12 h); o token não carrega `deviceId` porque o Worker não consulta o banco.
- Apple: limite e derrubada são aceitos desde que o aluno veja e gerencie os aparelhos; a compra IAP não depende disso.

## Estado da entrega (atualizar)

| Passo | Estado |
|---|---|
| Backend (schema, guard, rotas, assinatura) | **em produção 19/10** (rev `00127-4jv`, secret `VIDEO_TOKEN_SECRET`, envs `VIDEO_CDN_HOST`/`MAX_ACTIVE_DEVICES`) |
| Worker `video-gate` (ENFORCE=0) + `r2-browser` assinando | **em produção 19/10** (versão `8bd69a47` / `65863145`); verificado: master, variante, segmento e legenda com `?t=` → 200; sem token → 200 (observação) |
| Web (headers, DEVICE_REVOKED, tela, 403 do player) | pendente |
| Mobile (idem, PR separado; produção só depois da aprovação do build 8) | pendente |
| `ENFORCE=1` + guard exigindo `X-Device-Id` para STUDENT | depois dos apps nas lojas |

## Próximos (fora do escopo de 19/10)
- Detecção de uso simultâneo (heartbeat do player em dois IPs) e marca d'água visível com nome do aluno.
- Termos de uso com licença pessoal e CPF no cadastro.
