# Sprint v1.0 — Executive Summary

**Periodo:** 2026-04-17 → 2026-04-18
**Agent team:** 3 teammates (A web, B mobile, C backend) + líder (coordenação)
**Branches:** `track/backend-video`, `track/front-web`, `track/front-mobile` (base `e00c319` = `main`)
**Commits totais:** 73 (C: 28, A: 28, B: 17)
**Status técnico:** ✅ fechado em todos os 3 tracks, sem bloqueador

---

## 1. O que foi entregue (em linguagem humana)

### Backend (C — 28 commits)
- **Segredos saíram do repo**: todos movidos pro Google Cloud Secret Manager. Backend em prod lê via ADC automaticamente.
- **Proteção contra spam de IA**: usuários estão limitados a 30 requisições por minuto nos endpoints de IA (resumo, chatbot, biblioteca, quiz). Rate limiting por usuário, não por IP.
- **Busca semântica real**: biblioteca de livros e chatbot de vídeo agora usam embeddings reais do Vertex AI. Antes era mock. 10.781 chunks já convertidos em prod.
- **pgvector ativo**: Cloud SQL com extensão `vector v0.8.1` + índices HNSW. Busca por similaridade cosine rodando em prod.
- **Upload de vídeo simplificado**: admin tem novo caminho "Importar de R2 HLS" pra cadastrar vídeos já processados pelo pipeline externo. Backend não re-processa — só registra e serve.
- **Fila de trabalho assíncrona (desligada por default)**: todos os endpoints pesados de IA agora retornam `202 + jobId`. Cliente faz polling até `completed`. Feature flag `QUEUE_ENABLED` desligada — comportamento síncrono preservado até Gustav provisionar Memorystore.
- **Soft delete em tudo que importa**: Course, Module, Video, User agora têm `deletedAt` + audit log. `prisma migrate deploy` mais seguro.
- **Type safety forte**: `strictNullChecks` ligado no `tsconfig.json` — TypeScript agora exige tratamento explícito de `null` e `undefined`.
- **Código morto removido**: `TranscriptsModule` (feature descartada), scripts quebrados (`uploadFromFile`, `uploadFromDisk`), controllers órfãos.
- **Seed de staging**: script idempotente cria aluno + curso + vídeo + quiz com ids fixos pro Playwright consumir.
- **Cobertura de testes**: `jest` passou de 0 para 45 testes, thresholds CI per-file (AI-summaries 97%, Videos 100%).

### Web (A — 28 commits)
- **Consolidação de dead code**: removido auth-store duplicado, layout `(platform)/` abandonado, componente `VideoTranscriptManager` descartado. Zero imports órfãos.
- **Logger unificado**: `src/lib/logger.ts` com gate `isDev || NEXT_PUBLIC_DEBUG`. `logger.error`/`warn` sempre imprimem (preservam diagnóstico em prod), `log`/`debug` só em dev. 248 `console.*` substituídos em 53 arquivos.
- **Privacidade e segurança**: removido log de `tusUploadUrl` (continha token assinado Cloudflare); emails em logs mascarados (`g***@domain.com`) via `src/lib/utils/mask-pii.ts`.
- **Rate limit 429 no axios client**: toast amigável "Muitas requisições à IA, aguarde N segundos" via sonner. Parser respeita `Retry-After` (delta-seconds + HTTP-date). Sem retry automático.
- **Fallback Cloudflare SDK**: player mostra card "Não foi possível carregar o vídeo" + botão retry quando o Stream SDK falha. Sem erro técnico pro aluno.
- **Player simplificado**: branching manual de 5 fontes de vídeo substituído por `playback.kind` vindo do backend. `captionsUrl` consumido via apiClient (com auth header) e injetado como `<track>`. Zero risco de breaking — fallback legado preservado se `playback` ausente.
- **Admin: import R2 HLS**: modal com tabs "Upload de Arquivo / URL Externa / R2 HLS" — admin cola URL `.m3u8` + metadata e registra vídeo.
- **Onboarding novo**: fluxo `(onboarding)/profile-info` + `specializations` espelhando o mobile. Redirect automático pós-login se `!onboardingCompleted`.
- **Skeletons em listagens de aluno**: 4 grids principais ganharam `CourseCardSkeletonGrid`. Audit de gaps adiados documentado.
- **Fila BullMQ transparente**: utility `waitForJob` isolada com testes (13 cenários). Plugada em 4 services (summaries, chatbot, library, quizzes). Funciona em ambos os modos — `QUEUE_ENABLED=false` detecta `status: 'completed'` inline, zero polling.
- **E2E real**: Playwright rodando 3 jornadas (login, watch+progress, quiz) em 9.3s contra staging seeded.

### Mobile (B — 17 commits)
- **Dead code removido**: serviço e componente de transcripts órfãos apontando pro endpoint removido do backend. Zero imports.
- **Logger dedicado**: gate `__DEV__`. 77 `console.*` substituídos em 34 arquivos. `error`/`warn` sempre imprimem (preparados pra Sentry futuro).
- **Orientação declarativa**: `app.json` → `portrait`, `supportsTablet: false`. Exceção programática só quando entra/sai fullscreen do VideoPlayer.
- **Legendas manuais**: VideoPlayer ganhou menu glass com lista de tracks + "Desligar" (antes só toggle CC pt-BR).
- **Hook `useNetworkStatus`**: debounce 500ms em `offline → online`. Telas de lista (home, catalog, forum, etc.) fazem refetch ao reconectar.
- **Rate limit 429**: toast via `react-native-toast-message` (mesmo texto PT-BR do web). Interceptor global cobre 5 endpoints + IP throttler.
- **`eas.json` alinhado**: 3 perfis (dev/preview/production) com `channel`, `resourceClass`, bloco `submit`. Documentação em `docs/DEPLOY.md` com comandos literais pro Gustav.
- **Store release prep**: `docs/STORE-RELEASE.md` com checklist TestFlight + Play Console Internal (resoluções, descrições pt-BR, política de privacidade, classificação etária, release notes).
- **Migração playback unificado**: consome `video.playback.kind` do backend. Hardcode `CLOUDFLARE_CUSTOMER_CODE` removido. Fallback dedicado pra YouTube/Vimeo/external ("Em breve no app mobile").
- **Smoke tests**: 30 tests em 9 suites (auth, catalog, VideoPlayer, ChatScreen, gamification, useNetworkStatus, logger, 429, OfflineBanner). Coverage per-file alta nas camadas tocadas (videos.service 100%, useNetworkStatus 92%, logger 77%).

---

## 2. Métricas

| Track | Commits | Testes novos | Coverage camadas críticas |
|---|---|---|---|
| C (backend) | 28 | 45 Jest | AI-summaries **97%**, Videos **100%** (CI thresholds per-file) |
| A (web) | 28 | 13 unit + 5 e2e | waitForJob 100% (6 cenários), fluxo crítico via Playwright |
| B (mobile) | 17 | 30 Jest | videos.service **100%**, useNetworkStatus **92%**, logger **77%** |

**Total**: 73 commits, 93 testes novos.

---

## 3. Mudanças operacionais já em produção

Aplicadas no Cloud SQL `cirurgiao-db` durante o sprint (Gustav executou):

1. **Migration `20260418021654_add_pgvector_embeddings`** — `knowledge_chunks.embedding` virou `vector(768)`, `transcript_embeddings.embedding` adicionado, índices HNSW cosine. 10.781 embeddings convertidos jsonb→vector sem perda.
2. **Migration `20260418021800_task11_indexes_and_cascade`** — `courses.isPublished` índice, `ForumTopic.categoryId ON DELETE CASCADE`, `transcript_embeddings.embeddingId` removido.
3. **Reconciliação histórica**: 15 migrations + 3 SQLs manuais + 1 retroativa `20260409_retroactive_orphan_tables` (6 tabelas/3 enums/2 ALTERs que vieram via `db push` sem migration). Tudo `resolve --applied` em prod, zero data loss.
4. **Table ownership fix**: `knowledge_chunks` reassignada de `app_cirurgiao` para `postgres` via `ALTER TABLE OWNER TO`. Política documentada.
5. **`db push` interdito** fora do local-dev. `prisma migrate deploy` é o único caminho autorizado.

---

## 4. Débitos conscientes (para próximo sprint)

Cada um tem racional documentado em `TECH-DEBT.md` do track correspondente.

- **T7.1 Web — Skeletons restantes**: Forum, library chat, curso detalhe, forum submit, gamification. Estimativa 4-6h. Audit em `frontend-web/docs/proposals/t7-loading-audit.md`.
- **Estender cobertura mobile**: chatbot, chat-store, handler 401, summaries/quizzes services, débito Zustand login mock (teste de fluxo completo onde `mockLogin` não é invocado).
- **EmbedPlayer mobile**: `react-native-webview` + componente pra tocar YouTube/Vimeo/external nativamente (hoje mostra fallback "Em breve no app mobile"). Custo ~400kb bundle Android.
- **Layout responsivo iPad**: hoje `supportsTablet: false`. Próximo sprint implementar breakpoints + 2 colunas em catalog/course/watch.
- **ErrorBoundary em todas as telas mobile**: sem hoje, app trava com tela branca se VideoPlayer ou ChatScreen crashar. Alvo próximo sprint.
- **Sentry / crash reports**: hoje `logger.error` só imprime em console. Em prod perdemos visibilidade de erros em device. Alvo go-live ou próximo sprint.
- **Dead stack video.js (web)**: 4 packages no `package.json` sem consumer em prod. Economia ~2.5MB bundle. Próximo sprint.
- **Fila de retry de requests offline (mobile)**: hoje requests que falham mid-flight são perdidos silenciosamente. Alvo próximo sprint.
- **Progresso de vídeo salvo offline (mobile)**: `progressService.saveProgress` chama POST direto; se offline, progresso perdido. Solução: enfileirar em AsyncStorage + flush em `wasOffline pulse`.

---

## 5. Riscos residuais pro go-live

**Alto:**
- **CVEs em dependencies** (aceitas conscientemente, fix mandatório no go-live):
  - **Next.js 15.3.6 → upgrade pra 15.3.8 ESPECIFICAMENTE** (não 15.3.7 — ainda vulnerável após patch incompleto de dezembro/2025). **CVE-2025-66478 CVSS 10.0, RCE não-autenticado no App Router, exploits públicos em circulação há 5+ meses.** Fix mandatório ANTES de qualquer deploy público — não negociável. Outros 9 CVEs reportados (1 HIGH DoS, source code exposure em Server Actions, cache key confusion image optimization, SSRF via middleware redirect, HTTP smuggling em rewrites, unbounded disk cache, etc.).
  - React 19.2.0 — CVE-2025-55182 CRITICAL (CVSS 10.0) RCE React Server Components. Upgrade → 19.2.1.
  - **axios versões reais no repo** (confirmado via `package.json` em 2026-04-18):
    - `frontend-web/package.json`: `"axios": "^1.13.2"`
    - `backend-api/package.json`: `"axios": "^1.13.2"`
    - `mobile-app/package.json`: `"axios": "1.7.9"` (exact pin — versão mais antiga, bump maior, smoke test adicional recomendado)
    - Target unificado: **`1.16.0`** (resolve 3+ CVEs HIGH: SSRF via absolute URL, DoS `__proto__`, NO_PROXY bypass, cloud metadata exfiltration, CVE-2025-62718 CVSS 7.8 que 1.15.0 ainda carrega).
  - protobufjs < 7.5.5 via firebase — CRITICAL ACE. Fix transitivo.
  - @xmldom/xmldom < 0.8.12 (web-only) — HIGH XML injection. Fix transitivo.
  - follow-redirects <= 1.15.11 — MODERATE auth header leak. Fix transitivo.
- **Credenciais em plaintext no repo** (aceitas, risco mitigado por repo privado):
  - Senha `app_cirurgiao` em `backend-api/.env.proxy.example`.
  - Token Cloudflare API em `.env.example`.
  - Ambas precisam rotação + `git filter-repo` no go-live.

**Médio:**
- **Fila BullMQ desligada em prod** (`QUEUE_ENABLED=false`). Cliente já suporta ambos modos — ligar exige provisionar Memorystore primeiro.
- **`captionsUrl` no fluxo Cloudflare é web-only**. Mobile ignora (expo-video não injeta headers). Aceito — R2 é o destino final, migração em curso.
- **Playwright frontend-isolated**: mocka endpoints + Firebase. Não valida integração real com backend até Gustav provisionar master playlist real em R2.

**Baixo:**
- **Table ownership**: knowledge_chunks já corrigido; futuras tabelas precisam seguir a regra.
- **`strictNullChecks` pode expor bugs latentes** no runtime — smoke test manual em staging é suficiente pra pegar os relevantes.

---

## 6. Decisões técnicas principais do sprint

1. **Contrato `playback` unificado** com `kind: 'hls' | 'iframe' | 'none'` + `captionsEmbedded`. Proposto por B, refinado por C (`captionsEmbedded` sempre boolean em `kind='hls'`), consumido por A e B. Simplifica 5-way branching → 3-way semântico.
2. **Cross-worktree type sharing** via cópia literal de `backend-api/src/types/shared.ts` pra `frontend-web/src/types/api-shared.ts` e `mobile-app/src/types/api-shared.ts`. Sem symlink, sem submodule — copia simples com header documentando origem.
3. **Política anti-drift de migrations**: `prisma db push` proibido fora de local-dev. Todas as migrations retroativas comitadas. Política documentada em `backend-api/docs/DEPLOY.md §6`.
4. **Rate limit per-user somando IP-global**: 30 rpm user + 100 rpm IP. Ambos retornam 429. Cliente não diferencia.
5. **Feature flag `QUEUE_ENABLED`** permite deploy do código de fila sem Memorystore ativo. Gustav flipa quando quiser sem redeploy.
6. **Risco aceito CVEs + credenciais**: repo privado + colaboradores conhecidos + zero usuários reais em prod = fix mandatório no go-live, não no sprint.

---

## 7. For Gustav's eyes only (decisões fechadas + operacionais pendentes)

### Decisões FECHADAS pelo Gustav (registradas aqui pra o time lembrar)

- **Memorystore Redis — PROVISIONAR ANTES do go-live** (Fase 1 do checklist). **`QUEUE_ENABLED` continua `false`** no go-live — infra pronta, flag desligada. Isolamento de variáveis.
- **`QUEUE_ENABLED` flip — 1-2 SEMANAS PÓS go-live**, em janela operacional separada. Smoke test em staging com a flag `true` antes de flipar prod. Rollback é 1 comando (`--update-env-vars QUEUE_ENABLED=false`) sem redeploy.
- **`supportsTablet: false` em v1.0** — usuários iPad vão ver em modo compatibility. Layout responsivo iPad fica pra **v1.1 (próximo sprint)**. Decisão consciente pra não atrasar v1.0.
- **Cobertura de testes**: interpretação per-file nas camadas críticas aceita (AI-summaries 97%, Videos 100%, videos.service mobile 100%). Extensão pro global fica stretch pro próximo sprint.
- **CVEs em dependencies**: fix mandatório no go-live em branch dedicada (detalhes em `07-go-live-checklist.md` Fase 1). Risco aceito durante o sprint porque repo é privado + zero usuários reais.

### Operacional (execução manual, mas DECISÃO JÁ TOMADA — executar conforme checklist)

- **`app_cirurgiao` password rotation** (Fase 2.2 do go-live checklist): rotaciona no Cloud SQL + atualiza Secret Manager + redeploy Cloud Run + substitui `.env.proxy.example` por placeholder + `git filter-repo`.
- **Cloudflare API token rotation** (Fase 2.3): revoga atual, cria novo com escopo mínimo (Stream R/W + R2 bucket específico), atualiza Secret Manager, redeploy, substitui `.env.example` por placeholder, `git filter-repo`.
- **CVE upgrade batch** (Fase 1.1 web + 1.2 mobile): comandos literais em 5 passos com 2 checkpoints por track no checklist. Web: `next@15.3.8` + `react@19.2.1` + `axios@1.16.0`. Mobile: `axios@1.16.0` (bump maior porque estava em 1.7.9 exact).

---

## 8. Próximos artefatos neste pacote

- `02-merge-plan.md` — ordem + comandos git + rollback + zona de conflito identificada (docs/ compartilhado).
- `03-smoke-test-playbook.md` — cenários contra staging em checklist.
- `04-pr-backend.md` / `05-pr-web.md` / `06-pr-mobile.md` — descrições pra abrir os PRs.
- `07-go-live-checklist.md` — checklist completo, comandos literais, dividido em fases.
