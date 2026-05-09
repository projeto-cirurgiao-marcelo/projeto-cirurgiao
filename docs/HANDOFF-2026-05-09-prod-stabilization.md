# Handoff — 2026-05-08/09 — Estabilização de Produção + Submódulos

Sessão longa cobrindo desbloqueios de produção, refatorações de UX, hierarquia de módulos (submódulos) e alinhamento de progresso web/mobile.

## TL;DR

- Production back online (`api.projetocirurgiao.app` redirecionado pra Cloud Run direto via env).
- Auto-migrate pipeline funcional (Cloud Run Job + safety net no Dockerfile).
- R2 Browser, Media Library admin e player todos funcionais.
- Hierarquia Module → Submódulo → Vídeo entregue end-to-end (schema + backend + frontend admin/aluno).
- Web alinhado com mobile no cálculo de progresso (weightedPercentage para barras, binary para conclusão).
- Video pipeline (Cloud Run GPU) corrigido: idempotency check + fire-and-forget Queue + dependências do requirements.txt.

---

## Cronograma de PRs (ordem de merge)

| PR | Branch | Conteúdo |
|---|---|---|
| #8 | fix/prod-backend-pipeline-migration | DNS api → Cloud Run direto + auto-migrate Cloud Run Job |
| #9 | fix/r2-browser-list-pagination | R2 list pagination com cursor (R2 corta páginas por scan budget) |
| #10 | fix/r2-browser-reindex-caps | Caps maiores no reindexer (50→500), pages-per-chunk 12→24 |
| #11 | feat/r2-playlist-picker-add-video | Picker R2 no modal AdicionarVideo (R2 HLS) |
| #12 | chore/trigger-vercel-redeploy | Empty commit para destravar Vercel Hobby (resolvido depois) |
| #13 | chore/redeploy-vercel-picker | Forçar redeploy Vercel após restauração de visibilidade |
| #14 | feat/media-folders-schema | Schema MediaFolder + folderId/r2Basename em Video |
| #15 | feat/media-folders-backend | NestJS module media-folders com CRUD + move |
| #16 | feat/media-folders-sync-status | Worker /index + sync-status endpoint |
| #17 | feat/media-folders-frontend | Página /admin/media + modal "Mover para" |
| #18 | feat/media-folders-backfill | Auto-set r2Basename + backfill endpoint |
| #19 | fix/cdn-url-encode-segments | encodeURIComponent em cdnUrl (URL inválida @ IsUrl) |
| #20 | fix/video-r2-hls-restore-on-conflict | Restaurar Video soft-deletado em recadastro R2 HLS |
| #21 | feat/video-processor-notify-processing | Notify status=processing no início + idempotency + fire-and-forget |
| #22 | fix/video-processor-requirements | Dockerfile usa requirements.txt (requests faltava) |
| #23 | fix/reorder-videos-payload-key | Payload reorder usa `videos:` ao invés de `videoOrders:` |
| #24 | fix/reorder-atomic-and-partial-unique | $transaction + offset gigante + partial unique scoped |
| #26 | feat/course-position-reorder | Course.position + drag-drop persiste ordem em /admin/courses |
| #27 | feat/module-parent-schema | Schema parentModuleId + partial unique scoped (chunk 1/6) |
| #28 | feat/module-parent-services | Services + endpoints hierarquia (chunk 2/6) |
| #29 | refactor/move-to-modal-generic | MoveToModal genérico em components/tree/ (chunk 3/6) |
| #30 | feat/course-edit-hierarchy-frontend | Drag-drop hierárquico admin (chunk 4/6) |
| #31 | feat/student-hierarchy-render | Render hierárquico aluno (chunk 5/6) |
| #32 | fix/student-module-page-and-player-sidebar | Module page UX (thumbnails, accordion, voltar contextual) + player sidebar scroll |
| #33 | fix/player-sidebar-current-module-only | Sidebar só mostra módulo atual + submódulos |
| #34 | fix/player-like-button-align | Like alinhado com Anterior/Próxima |
| #35 | feat/web-weighted-progress | weightedPercentage no web (alinha com mobile) |

**PRs ainda abertas:**
- #25 — fix/admin-edit-modules-collapsed-default — módulos do curso começam fechados em `/admin/courses/:id/edit` (frontend pure, aguarda OK preview).

---

## Mudanças aplicadas direto em prod (sem PR)

### Env vars
- Backend Cloud Run (`projeto-cirurgiao-api`): `VIDEO_WEBHOOK_SECRET=6ac3c25...` adicionado.
- Backend Cloud Run: `DATABASE_URL` atualizado pra `13802170` (senha rotacionada).
- video-processor Cloud Run: `BACKEND_API_URL` corrigido (era Cloudflare tunnel morto).
- video-processor Cloud Run: `R2_ENDPOINT/R2_ACCESS_KEY/R2_SECRET_KEY/R2_BUCKET/WHISPER_MODEL` restaurados (revision 00005 perdeu — bug).
- R2 Worker `r2-browser` `BACKEND_API_URL`: trocado para Cloud Run direto.

### Senhas Cloud SQL
- `postgres` (super): rotacionada via `gcloud sql users set-password postgres --prompt-for-password` (Marcelo definiu).
- `app_cirurgiao`: rotacionada para `13802170` (estava `14096600`, mas senha real divergiu).

### SQL aplicado em prod
- **Cleanup reorder modules**: 13 módulos com order negativo residual no curso `10969942-...` voltaram para 1-16 conforme último payload de reorder dos logs.
- **Migration cleanup ownership**: tabelas legacy reownadas de `postgres` para `app_cirurgiao` (superuser-only ALTER OWNER).
- **Migração caso concreto submódulos**: módulos `c7945abd, ef8a8f13, 040ccac2, 8a44bcc0` viraram filhos de `981830d3`. Raízes restantes renumeradas 1-12.

### Cloud SQL reorder de partial unique
- `modules_courseId_order_active_key` substituído por dois indexes scoped (root vs filhos).
- `videos_moduleId_order_active_key` partial WHERE `deletedAt IS NULL`.

---

## Backups do banco (locais, gitignored)

`backend-api/db-backups/`:
- `prod-courses-modules-videos-20260509-073047.sql` (141 KB) — antes do reorder fix.
- `prod-full-pre-submodulos-20260509-083509.sql` (130 MB) — full DDL+data antes da hierarquia.
- `prod-schema-pre-submodulos-20260509-083509.sql` (71 KB) — schema only.

Restore:
```powershell
docker run --rm -e PGPASSWORD=13802170 -v "${backupDir}:/backup" postgres:15 \
  psql -h host.docker.internal -p 5437 -U app_cirurgiao -d projeto_cirurgiao \
  -f /backup/<arquivo>.sql
```

---

## Arquitetura — estado atual

### Cloud Run
- `projeto-cirurgiao-api` (southamerica-east1) — backend NestJS. Auto-migrate via Job `cirurgiao-api-migrator` + safety net no `CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]`.
- `video-processor` (europe-west1) — GPU encode + Whisper transcribe. Idempotency check, notify backend (start/end), Queue Worker fire-and-forget.

### Cloudflare Workers
- `r2-browser` (gustavobressanin6.workers.dev) — admin file management + KV folder index + multipart upload.
- `video-processor-trigger` — Queue consumer (R2 events → Cloud Run dispatch fire-and-forget).

### DB schema (prod)
- 38 migrations aplicadas. Última: `20260509083655_add_module_parent`.
- Models críticos atualizados: Course (+ position), Module (+ parentModuleId), Video (+ folderId, r2Basename), MediaFolder (novo).
- Partial unique indexes ativos para Module e Video orders WHERE deletedAt IS NULL.

### Vercel
- Frontend `projeto-cirurgiao` (Hobby plan).
- Deploy gating: commits autorados como `xoiurp <102543650+xoiurp@users.noreply.github.com>` para evitar block do Hobby.
- Estratégia de merge: `gh pr merge --rebase` (preserva autoria).

---

## Padrões/conhecimentos firmados

### Reorder de listas (Module/Video/Course)
- Sempre dentro de `prisma.$transaction`.
- Offset gigante temporário `-1_000_000_000` na fase 1 (não `-1..-N`).
- Partial unique indexes WHERE deletedAt IS NULL evitam soft-deletes ocupando slot.

### Hierarquia de Module (submódulos)
- 1 nível só (validado em service, sem constraint SQL).
- `parentModuleId` self-relation, `ON DELETE CASCADE`.
- Order scoped: raiz por `(courseId, order)`, filho por `(parentModuleId, order)` — duas partial unique distintas.
- Cross-parent move via "Mover para..." (admin), nunca via drag-drop (UX).

### Progresso de curso
- `progressPercentage` (binary): % aulas concluídas inteiras.
- `weightedPercentage`: % por watchTime/duration, capped em duration.
- **Web e mobile usam weighted para barras**, binary para "X/Y aulas" e filtros de "concluído".
- Helper compartilhado: `frontend-web/src/lib/course-progress.ts` (espelha `mobile-app/src/lib/course-progress.ts`).

### Componentes de tree/move-to genéricos
- `frontend-web/src/components/tree/types.ts` — `TreeNodeData`.
- `frontend-web/src/components/tree/move-to-modal.tsx` — reuso entre Media Library e Course Edit.

### Vercel + autoria
- Hobby plan bloqueia deploys de commits cuja autoria git não é a do dono Vercel.
- **Sempre commitar como** `xoiurp <102543650+xoiurp@users.noreply.github.com>` via `git commit --author=...`.
- **Sempre mergear PR via** `gh pr merge --rebase` (não squash, que sobrescreve autoria).

---

## Pendências conhecidas (não bloqueantes)

1. **PR #25 aberta** — módulos collapsed default em `/admin/courses/:id/edit`. Frontend pure.
2. **CI/CD pipeline backend**: deploy ainda manual via PowerShell. Idealmente GitHub Actions roda Cloud Build em push para `main`.
3. **Schema drift detection no CI**: rodar `prisma migrate diff --exit-code` em PRs pra catch divergence.
4. **Secret Manager**: credenciais ainda em env vars plaintext no Cloud Run (DATABASE_URL com senha, R2 keys, Cloudflare token, JWT secrets). Débito pre-go-live (CLAUDE.md já registra).
5. **Custom domain `api.projetocirurgiao.app`**: Cloud Run domain mapping não configurado. Hoje frontend aponta direto pro `*.run.app`. Se quiser estável, comando:
   ```
   gcloud run domain-mappings create --service=projeto-cirurgiao-api \
     --domain=api.projetocirurgiao.app --region=southamerica-east1 \
     --project=projeto-cirurgiao-e8df7
   ```
6. **Senha `app_cirurgiao` (13802170) está em env var plaintext + commit history desta sessão**. Considerar rotacionar de novo após Secret Manager migration.
7. **video-pipeline/ está no .gitignore raiz**. server.py foi commitado via `git add -f` — fix de processo: remover regra ou mover server.py pra outro path rastreado.
8. **Sidebar do player flat dentro do scope atual**: agora mostra módulo raiz + submódulos do escopo atual; não há agrupamento visual extra entre eles. Pode evoluir se UX pedir.
9. **R2_BROWSER_WORKER_URL hardcoded fallback**: `r2-browser.service.ts` cai pra `localhost:8787` se env ausente — silencioso em prod. Considerar `throw` quando NODE_ENV=production e var ausente.

---

## Ferramentas locais ainda em uso

- `cloud-sql-proxy.exe` rodando em background na porta 5437 (proxy pra Cloud SQL).
- Docker Desktop com:
  - `projeto-cirurgiao-postgres` (5433 — Postgres dev local, não-prod).
  - `projeto-cirurgiao-redis` (6379).
- Wrangler login OAuth ativo (cloudflare-worker `video-processor-trigger`).
- `gcloud auth application-default login` ativo.

---

## Connection strings de referência

```
# Cloud SQL connection name
projeto-cirurgiao-e8df7:southamerica-east1:cirurgiao-db

# Cloud Run interno (private IP via VPC connector)
postgresql://app_cirurgiao:13802170@172.21.0.3:5432/projeto_cirurgiao

# Local via cloud-sql-proxy 5437
postgresql://app_cirurgiao:13802170@127.0.0.1:5437/projeto_cirurgiao

# Cloud SQL Studio (web UI)
https://console.cloud.google.com/sql/instances/cirurgiao-db/studio?project=projeto-cirurgiao-e8df7
```

---

## Próxima sessão — possíveis frentes

- Mergear PR #25 (módulos collapsed default).
- Backfill `r2Basename` em vídeos legacy via `POST /admin/media/backfill-r2-basenames` + Sincronizar com R2 no admin.
- Migrar credenciais para Secret Manager.
- Configurar custom domain `api.projetocirurgiao.app` via Cloud Run domain mapping.
- Adicionar GitHub Actions CI pra backend (Cloud Build + deploy automático).
- Sidebar do player: agrupamento visual de submódulos (se feedback do uso pedir).
