# Projeto Cirurgião — Contexto do Agent Team

## O que é
SaaS de educação em cirurgia veterinária. Monorepo manual (sem workspaces; scripts na raiz só fazem `cd`) com quatro componentes que sobem em serviços separados.

## Stack & deploy

| Componente | Stack | Deploy |
|---|---|---|
| `backend-api/` | NestJS 10 + Prisma 5 + PostgreSQL (Cloud SQL) + Vertex AI | Cloud Run `southamerica-east1` |
| `frontend-web/` | Next.js 15 + React 19 + shadcn/ui + Tailwind v4 | **Vercel** + Firebase Hosting |
| `mobile-app/` | Expo SDK 54 + React Native 0.81 + Expo Router v6 + NativeWind v5 | EAS |
| `video-pipeline/cloud-run/` | Python + FFmpeg/NVENC + Faster-Whisper (GPU L4) | Cloud Run `europe-west1` |
| `cloudflare-workers/` | `r2-browser` (admin file mgmt + índice KV) e `video-processor-trigger` (Queue consumer) | Cloudflare Workers |

Auth: JWT (access 15min / refresh 7d) + Firebase ID token. Estado em Zustand + persist nos dois frontends.

## Arquitetura que o agent precisa saber

- **Layout web oficial:** `(dashboard)/`. (O redesign Coursera-like `(platform)/` e as rotas duplicadas tipo `/admin/courses-new` já foram removidos — não recriar.)
- **As 3 dimensões de um Video** — não confundir:
  - **R2 prefix** — físico, imutável. `s3-projeto-cirurgiao/videos/<path>/<basename>/playlist.m3u8`. R2 é object-store flat; não existe "mover pasta".
  - **MediaFolder** — catálogo lógico, mutável (`Video.folderId`). Toda reorganização vive aqui no DB, nunca no R2.
  - **Module placement** — pedagógico, a sequência de aulas que o aluno vê.
- **Submódulos:** `Module.parentModuleId`, self-relation, **1 nível só** (validado em service, sem constraint SQL). Order scoped por `(courseId, order)` na raiz e `(parentModuleId, order)` no filho.
- **Reuso de aula entre módulos:** `@@unique([r2Basename, moduleId])` (composto). A mesma aula R2 pode ser registrada em N módulos = N Videos com mesmo `r2Basename`. **Quiz, Materials, Captions e Progresso do aluno são por-Video**, não por-source — cada placement é independente.
- **Pipeline de vídeo:** roda no serviço `video-processor` (Cloud Run GPU, `europe-west1`), código em `video-pipeline/cloud-run/server.py`. FFmpeg + NVENC → HLS multi-bitrate; Whisper L4 → VTT pt-BR; upload R2. Disparado pelo Worker `video-processor-trigger` (eventos R2 → Queue → dispatch fire-and-forget). Cap de largura NVENC = 4096px (sources >4K passam por mezzanine CPU). O agent pode mexer aqui — não é mais externo.
- **Players já adaptados** pro R2 HLS: web `hls-video-player.tsx`, mobile `expo-video` em `VideoPlayer.tsx`.
- **5 fontes em `Video.videoSource`:** `cloudflare`, `youtube`, `vimeo`, `external`, `r2_hls`. Cloudflare Stream = legado em descontinuação (manter válido até migração R2 100%); `r2_hls` = destino final.
  - Legendas: fluxo Cloudflare gera via `CloudflareStreamService.generateCaptions()` → VTT em R2. Fluxo R2 já vem pronto do pipeline (`subtitles_pt.vtt` + `subtitles.m3u8` no master playlist).

## Convenções de código
- **Backend:** TypeScript, NestJS modules por domínio. Schema Prisma em `backend-api/prisma/schema.prisma`. `strictNullChecks: true` (já ligado); `noImplicitAny: false` e `strictBindCallApply: false` ainda relaxados.
- **Web:** App Router, `'use client'` no que precisa. Services em `src/lib/api/*.service.ts` (axios, **não** TanStack Query). Auth store oficial: `src/lib/stores/auth-store.ts`.
- **Mobile:** Expo Router file-based. Componentes em `mobile-app/src/components/`, services em `mobile-app/src/services/api/`.
- **Progresso de curso:** helper compartilhado `frontend-web/src/lib/course-progress.ts` espelha `mobile-app/src/lib/course-progress.ts`. Web e mobile usam `weightedPercentage` pras barras e binary (`progressPercentage`) pra "X/Y aulas" e filtro de "concluído".

## 🔴 Gotchas operacionais (ignore = quebra deploy/processo)
- **Vercel Hobby trava deploy por autoria.** Commitar como `xoiurp <102543650+xoiurp@users.noreply.github.com>` (`git commit --author=...`) e mergear PR com `gh pr merge --rebase` (não squash, que sobrescreve autoria). Sem isso o build do frontend não dispara.
- **`video-pipeline/` está no `.gitignore` raiz.** Arquivos desse dir só entram com `git add -f`. (Débito de processo conhecido — idealmente mover o código rastreado pra fora ou remover a regra.)
- **Prisma:** rodar `npx prisma generate` após qualquer mudança de schema. Migrations aplicam sozinhas no cold start do backend (`prisma migrate deploy` na CMD do Dockerfile + Cloud Run Job `cirurgiao-api-migrator`).
- **Reorder de listas** (Module/Video/Course): sempre dentro de `prisma.$transaction`, com offset gigante temporário (`-1_000_000_000`) na fase 1. Partial unique indexes `WHERE deletedAt IS NULL` evitam soft-deletes ocupando slot.

## Regras pros teammates
1. **Nunca commitar segredos.** Credencial hardcoded → flaguear e não commitar. (Connection strings, senhas de banco e webhook secrets ficam nos handoffs, nunca aqui.)
2. **Não mexer na branch `feat/mobile-juice-lab`** — segue em desenvolvimento paralelo.
3. **Não mexer no worktree dos outros.** Cada track tem seu próprio diretório.
4. **Antes de mudar contrato de API**, avisar o time.
5. **Commits pequenos e descritivos:** `feat(área): descrição`, `fix(área): …`, `chore(área): …`.
6. **Console.log:** remover ou converter pra logger dedicado antes de marcar tarefa como pronta.
7. **Credenciais:** migrar pra Secret Manager (rotação efetiva fica pro go-live).

## Comandos frequentes
```bash
# Backend local
cd backend-api && docker-compose up -d && npm run start:dev

# Prisma
cd backend-api && npx prisma migrate dev && npx prisma generate

# Web
cd frontend-web && npm run dev

# Mobile
cd mobile-app && npm start

# Video pipeline (testes de encode)
cd video-pipeline/cloud-run && python -m pytest test_encode_fallback.py
```

## Débito técnico consciente
- `noImplicitAny: false` / `strictBindCallApply: false` no backend — relaxados (strictNullChecks já está ligado).
- `KnowledgeChunk.embedding` em JSON (alvo: pgvector, track backend).
- Credenciais ainda em env var plaintext no Cloud Run — migrar pra Secret Manager pré go-live.
- Sem CI/CD de backend (deploy manual via PowerShell; idealmente GitHub Actions + Cloud Build em push pra `main`).
- Cobertura de testes baixa — meta do sprint é cobertura mínima por camada, não 100%. (Já existe `video-pipeline/cloud-run/test_encode_fallback.py`.)

---
*Histórico de sessões em `docs/HANDOFF-*.md`. Backup da versão anterior deste arquivo: `docs/CLAUDE-2026-05-04.md.bak`.*
