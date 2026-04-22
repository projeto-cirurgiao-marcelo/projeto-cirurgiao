# Smoke Test Playbook — Sprint v1.0

**Ambiente:** staging (ou local com seed aplicado). **NUNCA rodar contra produção.**
**Tempo estimado total:** 45-60 min (sessão única, ou dividida em 3 blocos).
**Pré-requisitos:**

- [ ] Backend em staging up (Cloud Run) OU local (`cd backend-api && docker-compose up -d && npm run start:dev`).
- [ ] Seed aplicado: `cd backend-api && npx ts-node prisma/seed-staging.ts`. Confirma output "seed complete".
- [ ] Usuário de teste: `test@cirurgiao.app` / `Seed!Student2026` (STUDENT).
- [ ] Usuário admin: `admin@cirurgiao.app` / `Seed!Admin2026` (INSTRUCTOR).
- [ ] Web rodando: `cd frontend-web && npm run dev` (http://localhost:3000).
- [ ] Mobile rodando: `cd mobile-app && npm start` (Expo Go no iPhone OU Android emulator).

---

## Bloco A — Sanity de backend (10 min)

Antes de testar via UI, confirmar que backend responde corretamente via curl. Evita perseguir bugs de frontend em cima de backend quebrado.

> **⚠️ Aviso importante — autenticação híbrida Firebase + JWT**
>
> Descoberto durante o sprint (documentado em `backend-api/docs/TECH-DEBT.md` seção "Arquitetura — débitos anteriores"): **vários endpoints protegidos usam `FirebaseAuthGuard`, não `JwtAuthGuard`**. O `accessToken` retornado por `POST /auth/login` **não funciona** em endpoints protegidos por Firebase (ex: `GET /api/v1/courses`). Você tem 2 caminhos pro Bloco A:
>
> - **Caminho 1 — usar Firebase ID Token diretamente** (mais fiel ao runtime real). Logar no web DevTools ou no mobile + rodar `await firebase.auth().currentUser.getIdToken()` no console → copiar token → usar como `Authorization: Bearer <ID_TOKEN>` em curl. Endpoints com `FirebaseAuthGuard` aceitam direto. Pra endpoints com `JwtAuthGuard`, trocar o ID token por JWT próprio antes via `POST /auth/firebase-login` (recebe ID token, retorna `accessToken` JWT).
> - **Caminho 2 — pular Bloco A inteiro e testar via UI** (Bloco B e C já cobrem os mesmos fluxos com auth real). Recomendado pra go-live porque simula melhor a experiência do usuário e evita o gotcha.
>
> **Minha recomendação**: Caminho 2. Bloco A fica como fallback se suspeitar de problema de backend específico.
>
> Esse débito entra na fila de unificação de guards no próximo sprint (ver TECH-DEBT backend).

### A1 — Healthcheck

```bash
curl -s http://localhost:3001/health | jq
# Ou contra staging:
curl -s https://<CLOUD_RUN_URL>/health | jq
```
- [ ] Response 200 com `{ status: "ok" }`.

### A2 — Login (validar que `/auth/login` responde)

Smoke só do endpoint `/auth/login` emitir corretamente (guard diferente dos outros).

```bash
# Email/senha direto — testa apenas /auth/login
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@cirurgiao.app","password":"Seed!Student2026"}' | jq
```
- [ ] Response 200 com `{ accessToken, refreshToken, user: { id, email, role: 'STUDENT' } }`.

**O `accessToken` retornado aqui NÃO SERVE pra A3-A6** (guards dos outros endpoints são FirebaseAuthGuard — ver aviso no topo do Bloco A). Pra rodar A3-A6 via curl, obter um Firebase ID Token:

```
# No web DevTools console, depois de fazer login na UI:
await firebase.auth().currentUser.getIdToken()

# Copia o token gerado (string longa começando com "eyJ..."). Use como $TOKEN nas próximas seções.
```

Alternativa sem browser: o Playwright do web faz isso automaticamente no helper `e2e/helpers/auth.ts` — rodar um test com `--headed` e extrair.

### A3 — Listar cursos (autenticado)

```bash
TOKEN="<firebase_id_token_de_A2>"   # NÃO o accessToken do /auth/login
curl -s http://localhost:3001/api/v1/courses -H "Authorization: Bearer $TOKEN" | jq '.[] | {id, title, slug, isPublished}'
```
- [ ] Response 200 com ao menos o curso do seed (`curso-teste-e2e`).
- [ ] Se retornar 401: confirmar que `$TOKEN` é Firebase ID Token, não JWT do `/auth/login`.

### A4 — Pegar vídeo com playback unified

```bash
curl -s http://localhost:3001/api/v1/videos/00000000-0000-4000-a000-000000000012 \
  -H "Authorization: Bearer $TOKEN" | jq '.playback'
```
- [ ] Response 200 com `playback: { kind: 'hls', playbackUrl: 'https://placeholder.cirurgiao.app/test.m3u8', captionsEmbedded: true }`.
- [ ] `captionsUrl` ausente (não é fluxo cloudflare).

### A5 — Rate limit 429 (usuário autenticado)

```bash
# Dispara 35 requests em sequência contra endpoint de IA (limite 30 rpm/user)
for i in $(seq 1 35); do
  echo -n "$i: "
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3001/api/v1/videos/00000000-0000-4000-a000-000000000012/summaries/generate \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}'
done
```
- [ ] Primeiras ~30 responses devem ser `202` (ou `400` se o endpoint exigir body — o que importa é ≠ 429).
- [ ] A partir da ~31ª, responses `429` com header `Retry-After`.
- [ ] Aguardar 60s e tentar de novo — primeira request deve voltar a `202`.

### A6 — Contratos BullMQ

Modo síncrono (default, `QUEUE_ENABLED=false`):

```bash
curl -s -X POST http://localhost:3001/api/v1/videos/00000000-0000-4000-a000-000000000012/summaries/generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' | jq
```
- [ ] Response 202 com shape `{ jobId: "inline-<uuid>", status: "completed", resultRef: "summary_<id>" }`.
- [ ] `status` já é `"completed"` (inline execution).

Se `QUEUE_ENABLED=true` em staging:
- [ ] Response 202 com `{ jobId, status: "queued" }`.
- [ ] `GET /api/v1/jobs/<jobId>` transita `queued → active → completed` em alguns segundos.
- [ ] Polling final retorna `{ status: "completed", resultRef }`.

---

## Bloco B — Web (15-20 min)

### B1 — Login + redirect por role

- [ ] Abrir http://localhost:3000 (ou staging). Deve redirecionar pra `/login` (middleware).
- [ ] Logar com `test@cirurgiao.app` / `Seed!Student2026`.
- [ ] Deve redirecionar pra `/student` (ou `/student/my-courses`).
- [ ] Logar com `admin@cirurgiao.app` / `Seed!Admin2026`.
- [ ] Deve redirecionar pra `/admin`.

### B2 — Onboarding (usuário novo)

- [ ] Criar usuário fresh (registro ou inserir manual no DB com `onboardingCompleted=false`).
- [ ] Logar. Deve redirecionar pra `/onboarding/profile-info`.
- [ ] Preencher profile, avançar pra `/onboarding/specializations`.
- [ ] Selecionar pelo menos 1 especialização. Concluir.
- [ ] Deve redirecionar pra `/student/my-courses`.
- [ ] Logar de novo com mesmo usuário → vai direto pra `/student` (sem onboarding).

### B3 — Catálogo e player

- [ ] `test@cirurgiao.app` → abre `/student/my-courses`. Ver "Curso de Teste E2E" listado.
- [ ] Clicar no curso → `/student/courses/00000000-0000-4000-a000-000000000010`. Módulos carregam.
- [ ] Entrar no módulo → vídeo "Vídeo de Teste" visível.
- [ ] Clicar play → página `/student/courses/.../watch/00000000-0000-4000-a000-000000000012`.
- [ ] Player renderiza. Com seed usando `placeholder.cirurgiao.app`, o vídeo NÃO vai tocar (URL inválida) — esse é o comportamento esperado até Gustav provisionar master playlist real.
- [ ] Verificar que a UI não mostra erro técnico — deve mostrar fallback elegante ou loading.

### B4 — Quiz

- [ ] Na página do vídeo, abrir aba "Quiz" (se visível) OU navegar direto pra `/student/courses/.../quiz/00000000-0000-4000-a000-000000000013`.
- [ ] Tela intro → clicar "Iniciar".
- [ ] Responder as 3 perguntas.
- [ ] Submeter. Ver tela de resultado com score.
- [ ] Voltar pra curso — se passou (score ≥ 70), confirmação visível.

### B5 — Rate limit 429 UX

- [ ] Spamar botão "Gerar Resumo" ou equivalente 30+ vezes em 1 minuto (OU usar curl do Bloco A5).
- [ ] A partir da 31ª tentativa, **toast sonner** aparece: "Muitas requisições à IA. Aguarde N segundos e tente novamente."
- [ ] Se o Retry-After vier do backend, N deve ser o valor real. Senão, "alguns segundos".
- [ ] Aguardar e tentar de novo — toast some, request passa.

### B6 — Fallback Cloudflare SDK

Difícil simular em staging real. Alternativas:
- [ ] Abrir DevTools → Network → bloquear `embed.cloudflarestream.com`. Recarregar página de watch com vídeo cloudflare (não o r2_hls do seed).
- [ ] Player deve mostrar card: "Não foi possível carregar o vídeo. Verifique sua conexão e tente novamente." com botão "Tentar novamente".
- [ ] Desbloquear rede, clicar retry → player carrega.

### B7 — Console e logs de produção

- [ ] Abrir DevTools → Console.
- [ ] Navegar por várias telas (login, catalog, watch, profile).
- [ ] Console deve estar **limpo** — zero `console.log` sendo chamado em prod (dev-mode mostra, prod-mode não). `NEXT_PUBLIC_DEBUG` não setado.
- [ ] Erros legítimos (`console.error` via `logger.error`) aparecem normalmente quando ocorrem — são preservados.

### B8 — Skeletons

- [ ] Abrir `/student/my-courses` com throttle "Slow 3G" no DevTools.
- [ ] Durante loading, skeletons de card de curso devem aparecer (4 grids principais: catalog, my-courses, in-progress, completed).
- [ ] Zero tela branca durante transição.

### B9 — Import R2 HLS (admin)

- [ ] Logar como `admin@cirurgiao.app`.
- [ ] Navegar pra `/admin/modules/<moduleId>/videos`.
- [ ] Clicar em "Adicionar vídeo" ou equivalente.
- [ ] Modal com 3 tabs deve aparecer: "Upload de Arquivo / URL Externa / R2 HLS".
- [ ] Selecionar tab "R2 HLS".
- [ ] Preencher: `hlsUrl` com URL `.m3u8` fake válida (ex: `https://example.com/test/playlist.m3u8`), `duration` 30, título "Vídeo Teste R2", `captionsEmbedded` checked.
- [ ] Submeter. Vídeo deve aparecer na lista com `videoSource=r2_hls`, `uploadStatus=READY`.

### B10 — Playwright e2e (se tiver tempo)

- [ ] `cd frontend-web && npx playwright test`.
- [ ] 5/5 tests passando em <15s.

---

## Bloco C — Mobile (15-20 min)

### C1 — Login

- [ ] Abrir app no Expo Go (iPhone) OU Android emulator.
- [ ] Splash screen.
- [ ] Tela de login.
- [ ] Logar com `test@cirurgiao.app` / `Seed!Student2026`.
- [ ] Redirect pra home (tabs: Home / Forum / Mentor IA / Profile).

### C2 — Catálogo e player HLS

- [ ] Tab Home → "Cursos em andamento" lista o curso do seed.
- [ ] Clicar no curso → detalhes.
- [ ] Aba "Módulos" → "Módulo de Teste" → vídeo "Vídeo de Teste".
- [ ] Clicar play → tela watch.
- [ ] VideoPlayer (expo-video) renderiza. Controls glass-morphism visíveis.
- [ ] Como hlsUrl é placeholder, vídeo não toca — esperado. Verificar que UX não quebra.

### C3 — Orientation

- [ ] Na tela de watch, tocar botão fullscreen.
- [ ] Device deve girar pra landscape + ir pra fullscreen.
- [ ] Sair do fullscreen (gesto ou botão nativo).
- [ ] Device deve voltar pra portrait sozinho.
- [ ] Navegar pra fora da tela de vídeo durante fullscreen — app não pode ficar preso em landscape.

### C4 — Seletor de legendas

- [ ] No VideoPlayer, tocar botão CC (chevron deve aparecer se múltiplas tracks disponíveis).
- [ ] Com seed atual (1 track pt-BR no SUBTITLES group), botão é toggle simples.
- [ ] Se testar com vídeo multi-track real: menu glass abre com lista + "Desligar".

### C5 — OfflineBanner + reconexão

- [ ] Na tela Home, ativar airplane mode no device.
- [ ] Banner vermelho "Sem conexão com a internet" desce do topo em ~300ms.
- [ ] Desativar airplane mode.
- [ ] Após 500ms (debounce), banner sobe + lista re-carrega com dados frescos.
- [ ] Repetir com troca wifi ↔ 4G (se possível).

### C6 — Rate limit 429 UX

- [ ] Ir pra Mentor IA (chatbot).
- [ ] Spamar envio de mensagem 31+ vezes.
- [ ] Toast vermelho aparece no topo: "Muitas requisições à IA" + "Aguarde N segundos e tente novamente".
- [ ] Spinner do chat desliga (Promise rejeitou).
- [ ] Aguardar, tentar de novo — passa.

### C7 — Fallback iframe (YouTube/Vimeo/external)

- [ ] Criar vídeo seed com `videoSource=youtube` (manual no DB ou admin-cli).
- [ ] Navegar pra watch dele no mobile.
- [ ] Ver card "Em breve no app mobile — Este vídeo usa um player externo (youtube). Por enquanto, acesse pelo navegador em projetocirurgiao.app."
- [ ] Não deve tentar tocar vídeo.

### C8 — Smoke tests Jest

- [ ] `cd mobile-app && npm test`.
- [ ] 30 tests passando em 9 suites.
- [ ] Tempo <15s.

---

## Bloco D — Integração cruzada (10-15 min)

### D1 — Web admin edita vídeo, mobile vê mudança

- [ ] No web (admin), editar título do vídeo do seed ("Vídeo de Teste" → "Vídeo de Teste V2").
- [ ] No mobile, fazer pull-to-refresh na tela do curso.
- [ ] Novo título aparece.

### D2 — Mobile salva progresso, web vê

- [ ] No mobile, abrir watch do vídeo do seed. Player tenta carregar (placeholder URL não toca, mas progresso de abertura é registrado).
- [ ] No web, abrir `/student/my-courses`. Curso deve aparecer em "In Progress" se backend reconheceu o play.
- [ ] **OBS**: com hlsUrl placeholder, `progress.service.saveProgress` pode não disparar porque player não emite `timeupdate`. Esperado. Quando Gustav provisionar master playlist real, repetir esse teste.

### D3 — Quiz cross-platform

- [ ] Fazer quiz no web → passar.
- [ ] No mobile, abrir aba Quiz do mesmo vídeo.
- [ ] Ver tela de "Quiz já concluído" com score registrado (ou permitir refazer — depende da UX implementada).

### D4 — Gamificação

- [ ] Ao completar quiz, XP notification (popup ou toast) aparece.
- [ ] Abrir tela de gamification (mobile ou web).
- [ ] XP atualizado.
- [ ] Se passou o quiz com score alto, badge correspondente desbloqueada.

---

## Bloco E — Regressões conhecidas pra vigiar

### E1 — Secret Manager em produção

- [ ] Se rodando contra Cloud Run staging com `NODE_ENV=production`, verificar logs:
  - [ ] `loadSecretsIntoEnv` logs "Loaded N secrets from Secret Manager".
  - [ ] Nenhum secret ausente resulta em crash de boot.

### E2 — pgvector indexes ativos

```sql
-- Via Cloud SQL Studio ou psql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('knowledge_chunks', 'transcript_embeddings')
AND indexdef LIKE '%hnsw%';
```
- [ ] Retorna 2 rows (`knowledge_chunks_embedding_hnsw_idx`, `transcript_embeddings_embedding_hnsw_idx`).

### E3 — Nenhuma migration pendente em prod

```bash
cd backend-api
DATABASE_URL=<prod> npx prisma migrate status
```
- [ ] Output: "Database schema is up to date!"

### E4 — CORS backend aceita domínio web

- [ ] Abrir DevTools Network → filtrar por "Fetch/XHR".
- [ ] Verificar response headers: `access-control-allow-origin` deve ter o domínio do web em staging.
- [ ] Nenhum erro CORS no console.

---

## Critério de aprovação

- [ ] **Blocos A + B + C + D todos OK** (ou falhas não-bloqueantes documentadas).
- [ ] Pelo menos 3 fluxos críticos validados ponta-a-ponta (login, watch attempt, quiz).
- [ ] Zero regressão em fluxos que funcionavam antes do sprint (catálogo, fórum, gamification).
- [ ] Nenhum crash em console/logs durante a sessão.

Se alguma caixa crítica falhar: pausar, reportar ao líder, investigar antes de mergear `release/v1.0` em `main`.

## Pós-smoke — próximos passos

1. Preencher release notes pros 3 PRs (ver `04/05/06-pr-*.md`).
2. Executar `07-go-live-checklist.md` fase "Pre-release" (upgrade de deps + audit fix + rebuild).
3. Merge `release/v1.0 → main` com autorização explícita do Gustav.
4. Tag `v1.0.0-rc1` (ou `v1.0.0` se smoke foi perfeito).
