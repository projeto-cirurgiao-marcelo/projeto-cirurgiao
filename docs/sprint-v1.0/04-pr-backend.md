# PR — Backend (track/backend-video → release/v1.0)

**Título**: `feat(backend): sprint v1.0 — Secret Manager, rate limit, pgvector, BullMQ queue, playback contract, soft delete, test coverage`

**Base**: `release/v1.0` (ou `main` direto)
**Compare**: `track/backend-video`
**Autor**: Teammate C
**Commits**: 28

---

## Summary

Consolidação operacional do backend pro go-live: segredos fora do repo (Secret Manager), rate limit por usuário em endpoints de IA, busca semântica real com pgvector, fila BullMQ feature-flagged, contrato `playback` unificado, soft delete + audit nos models principais, `strictNullChecks` ligado, cobertura Jest com thresholds CI.

---

## ⚠️ Breaking changes

1. **`GET /videos/:id` agora retorna `playback: { kind, playbackUrl, captionsEmbedded?, captionsUrl?, poster? }`**. Clientes antigos que lêem `cloudflareUrl`/`hlsUrl`/`externalUrl` direto continuam funcionando (campos preservados), mas devem migrar pra `playback.playbackUrl` + `playback.kind`. Documentado em `backend-api/docs/API-CHANGES-SPRINT.md`.

2. **Endpoints de IA (summaries, quizzes, library ingest, captions) retornam `202` em vez de `201`**:
   ```json
   { "jobId": "inline-<uuid>", "status": "completed", "resultRef": "<artifact_id>" }
   ```
   Quando `QUEUE_ENABLED=false` (default), `status: 'completed'` é inline. Quando `QUEUE_ENABLED=true`, `status: 'queued'` e cliente pollar `GET /api/v1/jobs/:id`.

3. **Rate limit per-user em endpoints de IA**: 30 rpm/user, respondendo `429` com `Retry-After` header. Somado ao IP throttler existente. `X-RateLimit-*` headers presentes em todas responses.

4. **`TranscriptsModule` removido**: `GET /videos/:id/transcript` e `/videos/:id/transcript/exists` não existem mais. Feature descartada — nenhum frontend usava.

5. **Soft delete**: `DELETE /courses/:id`, `/modules/:id`, `/videos/:id` agora são soft delete (`deletedAt` populado, não remove row). Listagens filtram `deletedAt IS NULL` por default. Novo query param `?includeDeleted=true` para ADMIN.

6. **`strictNullChecks: true`**: TypeScript no backend agora é estrito com null/undefined. Consumers de tipos exportados (ex: shared.ts) podem ter que ajustar pra tipar `T | null`.

---

## Commits agrupados por feature

### Infra e segurança
- `52d545a` remove TranscriptsModule (feature descartada)
- `2dec98f` Secret Manager wiring (ADC-based, `loadSecretsIntoEnv` em main.ts)
- `ac01d6b` per-user rate limit (`UserThrottlerGuard`, 30 rpm em endpoints IA)
- `c414370` Vertex AI embeddings reais (substitui mock)

### Database
- `df3c0a1` commit historical Prisma migrations (retroactive — 15 migrations + SQLs manuais que estavam no `.gitignore`)
- `bd93a49` align retroactive migrations with real prod shape (hlsUrl, chatbot tables UUID→TEXT FKs)
- `1820d07` switch local postgres to pgvector/pgvector:pg15 + init-db.sql + shadow DB
- `8c6a30e` pgvector migration: `embedding TYPE vector(768)` + HNSW indexes
- `b781578` `Course.isPublished` index + `ForumCategory → ForumTopic` cascade + drop obsolete `embeddingId`
- `387a86e` seed-staging.ts (aluno + curso + módulo + vídeo + quiz, idempotente, double-guard anti-prod)
- `a5bb8a0` soft delete + audit log em Course/Module/Video/User
- `b4b50c6` enable strictNullChecks in tsconfig

### Videos & playback
- `332d792` `buildPlaybackUrls` helper com r2_hls support
- `734d94e` `POST /modules/:moduleId/videos/from-r2-hls` endpoint
- `6f8847f` add `kind` + `captionsEmbedded` to playback contract
- `f0d5c7c` document unified playback contract

### BullMQ queue
- `bcbff82` QueueModule + QUEUE_ENABLED feature flag + JobsModule (`GET /api/v1/jobs/:id`)
- `bc5bbda` enqueue summary generation
- `e49ed66` enqueue quiz generation
- `4cbe69d` enqueue PDF ingest
- `734c7c7` enqueue caption generation
- `663d96f` document BullMQ contract + Memorystore config

### Docs & cleanup
- `2135c8c` database migration policy + post-rotation cleanup plan
- `72e4dda` table ownership rule (após fix do prod `knowledge_chunks`)
- `0ae5098` remove dead code (uploadFromFile/uploadFromDisk + broken scripts)
- `1824d8f` SECURITY-CRITICAL consolidado + T7.1 web reference
- `d79f030` 429 client contract + runtime caveats

### Testes
- `57032ae` raise Jest coverage on core services + pin thresholds (45 tests, thresholds per-file)

---

## Schema changes aplicadas em prod

Já rodadas pelo Gustav durante o sprint. Não precisa executar de novo:

- `20260418021654_add_pgvector_embeddings` — `knowledge_chunks.embedding → vector(768)`, `transcript_embeddings.embedding vector(768)` adicionado, HNSW indexes cosine. 10.781 chunks convertidos.
- `20260418021800_task11_indexes_and_cascade` — `courses.isPublished` index, `ForumTopic.categoryId ON DELETE CASCADE`, `transcript_embeddings.embeddingId` removido.
- `20260409_retroactive_orphan_tables` — alinhamento retroativo de 6 tabelas + 3 enums + 2 ALTERs que vieram via `db push` sem migration.

Migrations pendentes (soft delete + audit): **precisam rodar em prod no deploy**. Comando:

```bash
DATABASE_URL="<prod>" npx prisma migrate deploy
```

Executar com credencial de superuser (`postgres`, não `app_cirurgiao` — `app_cirurgiao` não tem DDL).

---

## Testing notes

```bash
cd backend-api
npm ci
npx prisma generate
npx tsc --noEmit              # deve passar clean (strictNullChecks)
npx jest --silent             # 45 tests, thresholds per-file ativos
npx ts-node prisma/seed-staging.ts  # seed contra local/staging DB
```

Smoke tests manuais: `docs/sprint-v1.0/03-smoke-test-playbook.md` Bloco A.

---

## Links

- **Contract de API completo**: `backend-api/docs/API-CHANGES-SPRINT.md`
- **Deploy guide**: `backend-api/docs/DEPLOY.md` (seções §1 Secret inventory, §4 Wiring, §6 Migration policy, §7 BullMQ + Memorystore, §8 Staging seed)
- **SECURITY-CRITICAL**: `backend-api/docs/TECH-DEBT.md`

---

## Release notes checklist (pra Gustav popular depois)

- [ ] Novidade usuário: [ex: "Chat inteligente agora busca em textos veterinários com busca semântica real (10.000+ chunks indexados)"]
- [ ] Novidade admin: [ex: "Cadastro direto de vídeos pré-processados em R2 (sem re-upload)"]
- [ ] Breaking changes resumo: `POST /videos/.../generate` endpoints retornam `202` agora (cliente atualizado)
- [ ] Como reportar bug: [link canal]
- [ ] Próxima release ETA: [data]
