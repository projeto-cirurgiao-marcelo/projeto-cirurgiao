# HANDOFF — 2026-09-15 · Transferência do sistema para novo desenvolvedor

> **Documento de entrada do projeto.** Escrito para quem nunca viu o código.
> Consolida os handoffs anteriores (que continuam no repo como histórico) e
> separa o que é **verificado hoje** do que é **último registro conhecido**.
>
> Nenhum valor de segredo aparece aqui — só nomes e onde estão.
>
> **Leitura na ordem:**
> 1. Este documento (visão completa + pendências)
> 2. `CLAUDE.md` — arquitetura resumida e gotchas permanentes (curto, ler inteiro)
> 3. `docs/HANDOFF-2026-08-14-vitrines.md` — a última grande feature (controle de acesso) com os adendos de setembro
> 4. `docs/plans/2026-08-12-vitrines-controle-acesso-design.md` — design do modelo de acesso
> 5. `docs/HANDOFF-2026-08-11-pre-live-execucao.md` §4 e §6 — mudanças de console e gotchas que custaram tempo

---

## Sumário

1. [O produto em 1 minuto](#1-o-produto-em-1-minuto)
2. [Estado atual](#2-estado-atual)
3. [Contas, acessos e donos](#3-contas-acessos-e-donos)
4. [Ação obrigatória na transferência: segurança](#4-ação-obrigatória-na-transferência-segurança)
5. [Arquitetura](#5-arquitetura)
6. [Modelo de acesso (vitrines)](#6-modelo-de-acesso-vitrines)
7. [Autenticação](#7-autenticação)
8. [Pipeline de vídeo](#8-pipeline-de-vídeo)
9. [IA](#9-ia)
10. [Setup local](#10-setup-local)
11. [Testes e CI](#11-testes-e-ci)
12. [Deploy por componente](#12-deploy-por-componente)
13. [Operação em produção (banco, scripts, rollback)](#13-operação-em-produção)
14. [Pendências priorizadas](#14-pendências-priorizadas)
15. [Riscos aceitos](#15-riscos-aceitos-decisões-não-bugs)
16. [Gotchas que mais custam tempo](#16-gotchas-que-mais-custam-tempo)
17. [Documentação desatualizada](#17-documentação-desatualizada-não-confiar-sem-conferir)
18. [Checklist da primeira semana](#18-checklist-da-primeira-semana)

---

## 1. O produto em 1 minuto

SaaS de **educação em cirurgia veterinária**: aulas em vídeo (HLS), legendas
automáticas, resumos, quiz e chat por aula gerados por IA, biblioteca de livros
consultável por IA (RAG), fórum, gamificação (XP, streaks, badges, ranking).

- **Cliente/professor:** Marcelo Portilho (nome exibido nos 10 cursos ativos).
- **Venda:** acontece **fora** da plataforma, no **TheMembers** (checkout). Um
  webhook libera o acesso automaticamente.
- **Fase:** pré-V1, **cohort fechado**, acesso por convite. Cerca de 30
  usuários (28 alunos) no último registro. Registro público **desligado**.
- **Catálogo em produção** (último registro): 12 cursos · 165 módulos · ~1.420
  vídeos.
- **Plataformas:** web (Vercel), app Android e iOS (Expo/EAS). iOS e Android
  estão em preparação para as lojas.

---

## 2. Estado atual

### 2.1 Verificado em 2026-09-15

| Alvo | Estado |
|---|---|
| `main` | `37ab985` (08/09/2026), igual a `origin/main`, working tree limpo |
| API `/api/v1/health` | **200** |
| `app.projetocirurgiao.app` (canônico) / `www.` | **200** / **200** |
| `projetocirurgiao.app` (apex) | **307** → `www` |
| `/ajuda`, `/privacy` | **200** |
| Vercel Production | `37ab985` (08/09 11:45Z) |
| GitHub Actions em `main` | `Backend CI` e `Mobile Tests` **verdes** em `37ab985` |
| Testes locais | web 24/24 · mobile 170/170 · backend 328/335 (as 7 falhas são de ambiente, ver §11) |

**Builds EAS existentes (mais recentes primeiro):**

| Plataforma | Perfil | Versão (build) | Commit | Data |
|---|---|---|---|---|
| Android | production | 1.0.0 (2) | `37ab985` | 08/09 |
| iOS | production | 1.0.0 (4) | `37ab985` | 08/09 |
| iOS | production | 1.0.0 (3) | `a79a88f` | 07/09 — **enviado ao App Store Connect** |
| iOS | preview (ad-hoc) | 1.0.0 (1) | `5434d76` | 04/09 |
| Android | preview (APK) | 1.0.0 (1) | `c359d7f` | 31/08 |

> ⚠️ Os builds **iOS (4)** e **Android production (2)** de 08/09 **não estão
> registrados em nenhum handoff**. Não se sabe se foram submetidos. Conferir no
> App Store Connect (app `6808997426`) e no Play Console antes de gerar outro.

### 2.2 Último registro conhecido (não reverificado hoje)

| Alvo | Último registro | Por que não verifiquei |
|---|---|---|
| Cloud Run `projeto-cirurgiao-api` | revisão **`00119-7fb`** (08/09) | token do `gcloud` expirado nesta máquina |
| Migrations em prod | 44 (última `20260904180000_course_instructor_display`) | idem |
| `video-processor` | última revisão boa registrada: `00015-v8d` | idem |

Primeiro comando do novo dev com acesso GCP:
```bash
gcloud run revisions list --service=projeto-cirurgiao-api --region=southamerica-east1 --project=projeto-cirurgiao-e8df7 --limit=3
```

---

## 3. Contas, acessos e donos

Todo o acesso hoje está concentrado no Gustavo. **Nada abaixo é transferido
automaticamente** — cada linha é um convite a fazer.

| Serviço | Identificador | Conta dona / login | Para o novo dev |
|---|---|---|---|
| **GitHub** | `projeto-cirurgiao-marcelo/projeto-cirurgiao` (privado) | org; commits como `xoiurp` | convidar na org |
| **Vercel** | projeto do `frontend-web`, região `gru1` | **plano Hobby**, conta `xoiurp` | ⚠️ ver §3.1 |
| **GCP** | projeto `projeto-cirurgiao-e8df7` | `contato@projetocirurgiao.app` | IAM: Cloud Run Admin, Cloud SQL Client, Secret Manager Accessor, Cloud Build Editor, Artifact Registry Writer, Logs Viewer |
| **Firebase** | mesmo projeto GCP (só Auth; Hosting é legado) | idem | vem junto com o IAM |
| **Cloud SQL** | `cirurgiao-db` (Postgres, `southamerica-east1`), DB `projeto_cirurgiao` | usuário app `app_cirurgiao`; migrations com superuser | senha via Secret Manager |
| **Cloudflare** | R2 bucket `s3-projeto-cirurgiao`, DNS do domínio, Workers, Queue `video-processing`, Stream (legado) | conta do Gustavo | convidar como membro |
| **Expo / EAS** | projeto `c048ea29-2617-43af-a299-059c5d53b016`, owner `projetocirurgiao` | `contato@projetocirurgiao.app` | convidar na org Expo |
| **Apple Developer** | Team **`2PLJU3QXNH`** (Projeto Cirurgiao Ltda), bundle `app.projetocirurgiao.mobile`, ASC app `6808997426` | Apple ID `marcelo_444@hotmail.com` | adicionar no App Store Connect |
| **Google Play Console** | package `com.projetocirurgiao.app` | **conta/app ainda não registrados** (pendência de loja) | — |
| **Sentry** | org `o4511889897095168`, projeto `4511889952342016` | só mobile | convidar |
| **TheMembers** | webhook "Plataforma Projeto Cirurgião" (id `7500243567910440960`), tenant `5242` | conta do professor | acesso para mapear produtos |
| **Vertex AI** | mesmo projeto GCP (ADC da SA do Cloud Run) | — | vem com o IAM |

**Contas de teste em produção** (duas quase homônimas — não confundir):
- `gustavobressnin6@gmail.com` (sem o "a") — aluno **em estado de teste proposital**: acesso total revogado, só a vitrine `castracao-descomplicada`. Simula comprador de recorte. Não é bug.
- `gustavobressanin6@gmail.com` — acesso total legado.
- Conta demo para revisor das lojas: **não existe ainda**.

### 3.1 ⚠️ Vercel Hobby bloqueia deploy de outro autor

O plano Hobby só builda commits cujo autor é o dono da conta. Hoje todo commit
é feito com `--author='xoiurp <102543650+xoiurp@users.noreply.github.com>'` e
PR é mergeado com `gh pr merge --rebase` (squash reescreve a autoria).

**Um novo desenvolvedor commitando com o próprio nome não dispara deploy do
web.** Decidir antes do primeiro PR: **migrar a Vercel para Pro/Team**
(recomendado) ou manter o truque de autoria.

---

## 4. Ação obrigatória na transferência: segurança

A rotação de segredos foi **risco aceito** para o cohort fechado
(`docs/TECH-DEBT.md`), com gatilhos explícitos que reabrem a obrigação.
**Dois deles já dispararam:**

1. **Adicionar colaborador ao repo** — é exatamente esta transferência.
2. **Indício de vazamento** — o notebook do Gustavo foi **furtado** (fim de
   agosto/2026) com `.env` de produção, chave da service account do Firebase
   Admin e credenciais Cloudflare/R2.

Além disso, a senha do Postgres de prod está no **histórico git**
(`docs/HANDOFF-2026-05-09-prod-stabilization.md`, commit `24a77de`) — remover o
arquivo não resolve, só rotação.

**Rotacionar, nesta ordem** (procedimentos em `docs/TECH-DEBT.md` e `docs/DEPLOY.md §3`):

| # | Segredo | Onde vive | Cuidado |
|---|---|---|---|
| 1 | Chave SA do Firebase Admin | Secret Manager `FIREBASE_SERVICE_ACCOUNT_KEY` + cópias locais `backend-api/firebase-service-account.json` | revogar a chave antiga no IAM |
| 2 | Senha `app_cirurgiao` (Cloud SQL) | Secret `DATABASE_URL` | redeploy do Cloud Run + atualizar o Job migrator |
| 3 | Par R2 + token Cloudflare API | secrets `CLOUDFLARE_*` (backend) **e** env `R2_ACCESS_KEY`/`R2_SECRET_KEY` do `video-processor` | criar token com escopo mínimo |
| 4 | `JWT_SECRET` / `JWT_REFRESH_SECRET` | Secret Manager | derruba sessões ativas (aceitável) |
| 5 | `WEBHOOK_SECRET` (Worker ↔ video-processor) | `wrangler secret` **e** Secret Manager | trocar as duas pontas na mesma janela |
| 6 | `VIDEO_WEBHOOK_SECRET` (video-processor → backend) | Secret Manager nas duas pontas | idem |
| 7 | `THEMEMBERS_WEBHOOK_SECRET` | Secret Manager + painel TheMembers | regenerar no TheMembers e sincronizar |
| 8 | Token Cademí (integração antiga) | fora do repo | avaliar se ainda é usado |

Também:
- Remover do time Apple o iPhone furtado: `eas device:delete --apple-team-id 2PLJU3QXNH --udid 00008110-000918E91405801E`.
- A cópia antiga do projeto no OneDrive do Gustavo (com `.env` de prod) — confirmar se foi apagada.
- Depois da rotação: `git filter-repo` para limpar o histórico (procedimento em `docs/DEPLOY.md §5`), com force-push coordenado.

---

## 5. Arquitetura

```
                ┌────────────── Clientes ──────────────┐
                │ Web Next.js 15 (Vercel)              │
                │ App Expo SDK 54 (Android / iOS)      │
                └──────┬───────────────────┬───────────┘
          Firebase ID token             HLS direto do R2
                       │                    │
                       ▼                    │
   ┌─────────────────────────────────────┐  │    ┌───────────────────────┐
   │ backend-api  NestJS 10 + Prisma 5   │  │    │ TheMembers (checkout) │
   │ Cloud Run  southamerica-east1       │◄─┼────┤ webhook release/revoke│
   │ /api/v1/*                           │  │    └───────────────────────┘
   └──┬───────────┬──────────────┬───────┘  │
      │           │              │          │
 Cloud SQL    Vertex AI     Firebase Auth   │
 Postgres +   gemini-2.5-   (Admin SDK)     │
 pgvector     flash / emb.                  │
                                            │
   ┌────────────────── Cloudflare ──────────┴─────────────────────────┐
   │ R2 s3-projeto-cirurgiao   inbox/ (uploads)  videos/ (HLS final)  │
   │ Worker r2-browser  (admin de arquivos, índice em KV, cron 1h)    │
   │ Queue video-processing ─► Worker video-processor-trigger         │
   └───────────────────────────────────┬──────────────────────────────┘
                                       ▼
                   video-processor (Cloud Run GPU L4, europe-west1)
                   FFmpeg NVENC → HLS multi-bitrate · Whisper → VTT pt-BR
                   upload R2 + callback pro backend
```

### 5.1 Repositório (monorepo manual, sem workspaces)

| Pasta | O que é |
|---|---|
| `backend-api/` | API NestJS. Schema em `prisma/schema.prisma`; scripts operacionais em `scripts/`; deploy em `deploy-artifact-registry.ps1` |
| `frontend-web/` | Next.js 15 App Router. Layout oficial `src/app/(dashboard)/`. Services axios em `src/lib/api/*.service.ts` |
| `mobile-app/` | Expo Router v6 + NativeWind v5. Telas em `app/`, componentes em `src/components/`, API em `src/services/api/` |
| `cloudflare-workers/` | `r2-browser` e `video-processor-trigger` |
| `video-pipeline/cloud-run/` | `server.py` + `Dockerfile` do processador GPU. ⚠️ pasta no `.gitignore` — adicionar arquivos com `git add -f` |
| `docs/` | handoffs, planos, runbooks, ADRs |
| `.github/workflows/` | `backend-ci.yml`, `ios-tests.yml` (que na verdade roda o Jest do mobile) |
| Legado/ruído | `firebase-hosting/` (só redirect), `workflows/` (n8n de consultoria, fora do produto), `HANDOFF-progress-day-1.md`, `INVESTIGATION-PLAYER-*.md`, `add-video-jobs.sql` na raiz |

### 5.2 Backend — módulos (`backend-api/src/modules/`)

| Domínio | Módulos |
|---|---|
| Identidade | `auth`, `firebase`, `users`, `profile` |
| Catálogo | `courses`, `modules`, `videos`, `media-folders`, `captions`, `materials`, `upload`, `cloudflare` |
| Acesso/venda | `showcases` (inclui `AccessService`), `webhooks` (TheMembers) |
| Aluno | `progress`, `likes`, `notes`, `quizzes`, `gamification` |
| IA | `ai-summaries`, `ai-chat`, `ai-library`, `jobs` |
| Comunidade | `forum`, `forum-categories` |
| Admin/ops | `admin-dashboard`, `health` |
| Compartilhado (`src/shared/`) | `prisma`, `queue` (BullMQ, desligável), `audit`, `analytics` (PostHog, opcional), `throttler` |

Prefixo global `api/v1`. Swagger nos controllers. Throttling global (20/s e
100/min) e mais apertado nos endpoints de auth.

### 5.3 Web — rotas principais

- **Público:** `/` (marketing), `/login`, `/forgot-password`, `/auth/action` (reset e resgate de convite), `/ajuda` (Central de Ajuda, aceita `?desbloquear=<slug>` e `?embed=1`), `/privacy`, `/terms`, `/cookies`. `/register` só mostra um aviso de acesso por convite.
- **Aluno** (`/student/*`): `courses` (Explorar + "Meus Cursos" com as vitrines), `courses/[id]`, `watch/[videoId]`, `quiz/[quizId]`, `showcases/[slug]` (`?locked=1` = prévia), `my-courses`, `in-progress`, `completed`, `areas/*`, `library` (chat RAG), `forum/*`, `gamification/*`, `search`, `profile` (inclui "Excluir conta").
- **Admin** (`/admin/*`): `courses`, `modules`, `videos`, `media` (pastas lógicas), `r2-browser`, `showcases` (composição de vitrines), `students`, `jobs`, `settings`.
- Middleware edge faz o gate de `/admin` e `/student`. CSP em `next.config.ts`.

### 5.4 Mobile — telas (`mobile-app/app/`)

`(auth)` login/forgot/register(aviso) · `(onboarding)` · `(tabs)` Home, Fórum,
Mentor IA, Perfil · `course/[id]` → `module/[moduleId]` → `watch/[videoId]` ·
`courses/catalog`, `in-progress`, `showcase/[slug]` · `forum/*` · `profile/*`
(editar, senha, FAQ, gamificação, excluir conta) · `help.tsx`.

**Diferença de plataforma que é decisão, não bug:** no **iOS**, `/help` abre uma
tela nativa (FAQ + e-mail) **sem caminho de compra** (App Store 3.1.1). No
**Android**, abre a Central de Ajuda web num WebView, que leva ao checkout.

Identificadores: Android `com.projetocirurgiao.app`, iOS
`app.projetocirurgiao.mobile`. A assimetria é forçada (o ID antigo ficou
indisponível na Apple) — **não "corrigir"**.

### 5.5 Três dimensões de um vídeo (não confundir)

- **Prefixo R2** — físico e imutável (`videos/<path>/<basename>/playlist.m3u8`).
- **MediaFolder** — catálogo lógico no banco (`Video.folderId`). Reorganizar = mexer aqui, nunca no R2.
- **Module placement** — sequência pedagógica. A mesma aula pode estar em N módulos = N linhas `Video` com o mesmo `r2Basename` (`@@unique([r2Basename, moduleId])`). Quiz, materiais, legendas e progresso são **por linha Video**.

Submódulos: `Module.parentModuleId`, **1 nível só** (validado no service). Reorder
sempre em `prisma.$transaction` com offset temporário `-1_000_000_000`.

`Video.videoSource`: `r2_hls` (destino) · `cloudflare` (Stream, legado em
descontinuação) · `youtube` · `vimeo` · `external`.

---

## 6. Modelo de acesso (vitrines)

É a parte com mais regra de negócio e a mais recente. Design completo em
`docs/plans/2026-08-12-vitrines-controle-acesso-design.md`.

| Conceito | Significado |
|---|---|
| `Showcase` (vitrine) | Recorte vendável = um produto do TheMembers (`externalProductId`). Lista **explícita** de vídeos (`ShowcaseVideo`), pode cruzar cursos. `grantsAllContent=true` = acesso total sem materializar linhas (pós-graduação, legado) |
| `Entitlement` | Direito de um usuário a uma vitrine. `source`: `GRANDFATHER` (30 alunos antigos), `ADMIN`, `COURTESY`, `PURCHASE` (webhook). `expiresAt` (null = vitalício), `revokedAt`. Único por `(userId, showcaseId)` |
| `WebhookEvent` | Log idempotente do TheMembers (`externalId = event:payload.id`). `error` preenchido e `processedAt=null` = pendente de reprocesso |
| `hasAccess` por aula | Os endpoints de leitura anotam cada aula. Sem acesso → **prévia de 2 min** (ou `min(120s, 50% da duração)`) com overlay de oferta |
| `Enrollment` | É **telemetria** ("começou a assistir"), não direito. `suspendedAt` marca matrícula de curso que o aluno não alcança mais; `AccessService.reconcileEnrollments` suspende/restaura |
| `courseAccessLevel` | `full / partial / none` por curso. `partial` não aparece em "Em andamento" — o progresso do recorte fica no card da vitrine |

**Fluxo de compra (em produção desde 31/08):** TheMembers →
`POST /api/v1/webhooks/themembers` (HMAC-SHA256 do corpo cru no `X-Signature`) →
acha a vitrine pelo produto → acha ou cria o User (+ Firebase + e-mail de
definição de senha) → upsert do `Entitlement` → reconcilia matrículas. Responde
**sempre 200** (menos assinatura inválida = 403), porque o TheMembers só reenvia
3× e desiste. Detalhes: `docs/themembers-catalog/WEBHOOK-COMPRA.md`.

**Onde tem lacuna:**
- **Não existe endpoint nem UI para conceder ou revogar acesso manualmente.** Hoje é SQL direto ou webhook (ver §14).
- Nem todas as vitrines têm `externalProductId` — compra desses produtos cai na fila de erro.
- Migração do catálogo TheMembers → vitrines: guia em `docs/themembers-catalog/MIGRACAO-VITRINES.md` (~20 produtos são conteúdo real; o piloto Cistotomia está criado mas não publicado).

**Fail-open no front:** `hasAccess?: boolean` checado com `=== false`. Isso
permite subir o front antes do backend quando o campo é novo. **Endpoint novo
não tem fail-open** — o backend vai primeiro.

---

## 7. Autenticação

- **Fonte de verdade: Firebase Auth.** Os clientes mandam o **Firebase ID token**; `FirebaseAuthGuard` valida e resolve o User do Postgres por `firebaseUid` (unique), com fallback por e-mail **verificado** (`resolveFirebaseUser`). Token válido sem User no Postgres **não** cria conta.
- **JWT próprio legado** (`/auth/login`, `/auth/refresh`, 15 min / 7 dias) ainda existe; alguns fluxos usam. Autenticação híbrida = débito (ver `docs/TECH-DEBT.md`). Para `curl`, use o ID token do Firebase, não o JWT.
- **Registro público desligado no console do Firebase.** Contas entram por:
  - webhook de compra (cria sozinho);
  - `backend-api/scripts/create-test-students.ts` (convite: link próprio de 7 dias, uso único, via `/auth/invite/redeem`);
  - rota ADMIN `POST /api/v1/aulas/92339018203` (registro protegido; o path obscuro é intencional).
- Os requisitos de código para **reabrir o registro** (UID unique, backfill 30/30, guard por UID) já estão feitos. Reabrir é decisão de produto — antes, revisar `resolveFirebaseUser` e rodar um pentest de takeover por e-mail.
- **Autoexclusão:** `DELETE /users/me` anonimiza nome, e-mail e perfil, apaga conversas de IA, notas, favoritos e refresh tokens, remove o login Firebase e registra auditoria. ADMIN recebe 403.
- Estado no cliente: Zustand + persist (web `src/lib/stores/auth-store.ts`). O mobile lê o token do Firebase a cada request.

---

## 8. Pipeline de vídeo

1. Upload do professor/admin em `R2 inbox/*.mp4` (web usa upload multipart via Worker `r2-browser`).
2. Evento R2 → Queue `video-processing` (DLQ `video-processing-dlq`, 3 retries).
3. Worker `video-processor-trigger` → `POST /process` no Cloud Run `video-processor`, com `Bearer WEBHOOK_SECRET`, fire-and-forget.
4. `server.py`: normaliza fontes acima de 4K (NVENC limita largura a 4096) → HLS multi-bitrate → Whisper `large-v3` → `subtitles_pt.vtt` + `subtitles.m3u8` no master → upload em `R2 videos/` → callback no backend (`VIDEO_WEBHOOK_SECRET`).
5. Admin registra o vídeo num módulo (placement) apontando pro `r2Basename`.

Idempotente por playlist: reprocessar sobrescreve sem duplicar.

- Teste: `cd video-pipeline/cloud-run && python -m pytest test_encode_fallback.py` (a máquina atual não tem Python).
- ⚠️ **Débito:** o Worker `video-processor-trigger` versionado está em `cloudflare-workers/`, mas o deploy vivo pode ter saído de `video-pipeline/cloudflare-worker/` (gitignored). Conferir com `wrangler deployments list` antes de redeployar.
- Players: web `hls-video-player.tsx`, mobile `expo-video` (`VideoPlayer.tsx`).
- ⚠️ Objetos em R2 são públicos. A prévia de 2 min é corte no player (risco aceito, §15).

---

## 9. IA

| Feature | Modelo | Onde |
|---|---|---|
| Resumo por aula | `gemini-2.5-flash` (Vertex) | `ai-summaries` — cota persistente por usuário (`VideoSummaryGenerationQuota`) |
| Quiz por aula | `gemini-2.5-flash` | `quizzes` + banco de questões / maestria |
| Chat da aula (RAG sobre transcrição) | `gemini-2.5-flash` + `text-embedding-004` | `ai-chat`, `TranscriptEmbedding` (pgvector, HNSW) |
| Biblioteca (RAG sobre livros Fossum e Tobias) | idem | `ai-library`, `KnowledgeDocument/Chunk` (pgvector); PDFs em `gs://projeto-cirurgiao-knowledge-base/books/` |

- Autenticação por **ADC** da service account do Cloud Run (sem API key em prod).
- Gotcha: o Gemini 2.5 gasta *thinking tokens* dentro de `maxOutputTokens`. Teto baixo = resposta truncada (aconteceu com as sugestões do chat; corrigido com 1024).
- `QUEUE_ENABLED` (BullMQ + Redis/Memorystore) é feature flag. Sem fila, os jobs rodam inline com o mesmo contrato HTTP. Confirmar o valor atual no Cloud Run.
- Plano pendente de verificação: `docs/plans/2026-07-02-rag-tobias-reembedding-plan.md` (Tobias indexado em inglês, perde para o Fossum em perguntas em português). **Não há registro de que foi executado.**

---

## 10. Setup local

Pré-requisitos: **Node 20** (não 24), Docker Desktop, Git. Para mobile: Android
Studio + **JDK 17** (o JBR do Studio não serve pro RN 0.81). Opcionais: `gh`,
`gcloud`, `eas-cli`, `wrangler`, Python 3 (pipeline).

```bash
# 1. Infra local (raiz do repo): Postgres pgvector na porta 5433, Redis, pgAdmin
docker compose up -d
#    se esbarrar em conflito de nome: docker start projeto-cirurgiao-postgres projeto-cirurgiao-redis

# 2. Backend
cd backend-api
npm ci
#    criar backend-api/.env (nomes abaixo). O .env aponta para app_cirurgiao@127.0.0.1:5433:
#    criar esse role no Postgres local (o compose só cria "postgres").
npx prisma migrate deploy && npx prisma generate
npm run db:seed:specialties      # xp_rules — sem isso os testes de gamificação falham
npm run start:dev                # http://localhost:3000/api/v1

# 3. Web
cd ../frontend-web && npm ci && npm run dev    # http://localhost:3001

# 4. Mobile
cd ../mobile-app && npm ci && npm start
```

**Variáveis de ambiente (só nomes; valores no Secret Manager / Vercel / EAS, nunca por chat):**

- `backend-api/.env`: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION`, `NODE_ENV`, `PORT`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_PUBLIC_URL`, `CLOUDFLARE_STREAM_CUSTOMER_CODE`, `CLOUDFLARE_STREAM_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_AI_MODEL`, `VERTEX_AI_API_KEY`, `VERTEX_SUMMARY_MAX_OUTPUT_TOKENS`, `CORS_ORIGINS`, `THEMEMBERS_WEBHOOK_SECRET`, `POSTHOG_API_KEY`, `POSTHOG_HOST`, `ANALYTICS_ENABLED`. Em prod também: `FIREBASE_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `VIDEO_WEBHOOK_SECRET`, `QUEUE_ENABLED`/`REDIS_*`, `SENTRY_DSN`.
- `frontend-web/.env.local`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_FIREBASE_*` (6), `NEXT_PUBLIC_R2_BROWSER_WORKER_URL`.
- `mobile-app/.env`: `EXPO_PUBLIC_FIREBASE_*` (7); `EXPO_PUBLIC_API_URL` vem do perfil do `eas.json` (no Metro, passar pelo ambiente); `EXPO_PUBLIC_WEB_URL` (opcional); `EXPO_PUBLIC_SENTRY_DSN` (environment do EAS).
- Arquivos locais ignorados pelo git que o dev precisa receber (por canal seguro, **depois da rotação**): `backend-api/firebase-service-account.json`, `mobile-app/google-services.json`, `mobile-app/GoogleService-Info.plist`.

⚠️ `/.env.example` e `backend-api/.env.proxy.example` são **rastreados**. O
segundo já teve senha real de prod (está no histórico). Nunca colocar valor
real neles.

**Mobile no emulador sem gastar build EAS:** fluxo validado de dev client local
(gotchas do Windows: MAX_PATH exige `subst X:`, Metro sem `CI=1`, captura de tela
pelo Git Bash). `eas build:run --platform android --latest` instala a última APK
preview.

---

## 11. Testes e CI

| Suíte | Comando | Resultado 15/09 |
|---|---|---|
| Backend (Jest) | `cd backend-api && npm test` | **328/335** sem Docker. As 7 falhas (2 suítes de gamificação) pedem Postgres em `localhost:5433`: subir o Docker e rodar o seed de specialties → 335/335 |
| Web (Vitest) | `cd frontend-web && npm test` | **24/24** |
| Web E2E (Playwright) | `npm run test:e2e` | não rodado; depende do seed de staging |
| Mobile (Jest) | `cd mobile-app && npm test` | **170/170** |
| Pipeline (pytest) | ver §8 | não rodado |

**GitHub Actions** (push em `main` e PRs):
- `Backend CI`: `npm ci` → prisma generate → build → `migrate deploy` num Postgres pgvector descartável → seed → suíte completa, mais **gitleaks** no histórico inteiro (bloqueante).
- `Mobile Tests` (arquivo `ios-tests.yml`): Jest do `mobile-app`.
- **Não há CD.** Nenhum workflow faz deploy. Web deploya pela Vercel no push; backend e mobile são manuais.

Cobertura baixa. Não há testes para o front além de 24 unitários.

---

## 12. Deploy por componente

| Componente | Como | Notas |
|---|---|---|
| **Web** | push/merge em `main` → Vercel builda sozinha | autoria `xoiurp` enquanto for Hobby (§3.1). Verificar com `gh api repos/projeto-cirurgiao-marcelo/projeto-cirurgiao/deployments`, não pelo HTML |
| **Backend** | `cd backend-api && ./deploy-artifact-registry.ps1` (~6 min): Cloud Build → imagem no Artifact Registry → **Job `cirurgiao-api-migrator`** (migrations) → `gcloud run deploy`, preservando env e secrets | exige `gcloud auth login` recente (o token expira em menos de 2h). No PowerShell 5.1 **não** redirecionar `2>&1`; pelo Git Bash: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./deploy-artifact-registry.ps1 > deploy.log 2>&1` |
| **Mobile** | `cd mobile-app && eas build --profile <preview\|production> --platform <android\|ios>`; `eas submit` para as lojas | `appVersionSource: remote`, `autoIncrement` no production. Mudança só de JS poderia ir por EAS Update (canais existem, **não está em uso**) |
| **Workers** | `cd cloudflare-workers/<worker> && npx wrangler deploy`; segredos com `wrangler secret put` | ver o débito do trigger no §8 |
| **video-processor** | build da imagem de `video-pipeline/cloud-run/` + `gcloud run deploy video-processor --region europe-west1` (GPU L4) | sem script versionado. Conferir a config atual com `gcloud run services describe` antes |

**Ordem quando a mudança cruza camadas:** migration aditiva → backend → web e
mobile. Nunca migration destrutiva sem backup (ver `docs/RUNBOOK-ROLLBACK.md §6`).

**Domínio novo = dois sistemas:** Vercel/Cloudflare DNS **e** `CORS_ORIGINS` no
Cloud Run (e `ALLOWED_ORIGINS` no `wrangler.toml` do `r2-browser`). `Network
Error` no axios nunca vem do servidor: é CORS, CSP ou rede.

---

## 13. Operação em produção

### 13.1 Acesso ao banco (read-only por padrão)

```bash
gcloud auth login
backend-api/cloud-sql-proxy.exe --token "$(gcloud auth print-access-token)" \
  --port 5434 projeto-cirurgiao-e8df7:southamerica-east1:cirurgiao-db
# psql via container local, se não houver psql instalado:
docker exec -it projeto-cirurgiao-postgres psql -h host.docker.internal -p 5434 -U app_cirurgiao -d projeto_cirurgiao
# Ao terminar: matar o proxy (no Windows: Get-Process cloud-sql-proxy | Stop-Process -Force)
```
O `cloud-sql-proxy.exe` é gitignored; baixar a v2 do site do Google. A senha
vem de `gcloud secrets versions access latest --secret=DATABASE_URL`.

### 13.2 Scripts operacionais (`backend-api/scripts/`)

**Padrão obrigatório para script que grava em prod:** dry-run por padrão,
`--apply` explícito, idempotente.

| Script | Uso |
|---|---|
| `create-test-students.ts` | cria alunos por convite (`--send-invites` / `--print-links`) |
| `grandfather-entitlements.ts` | já aplicado (30 alunos). Não rodar de novo sem motivo |
| `reconcile-enrollments.ts` | suspende ou restaura matrículas conforme o acesso |
| `cleanup-preview-enrollments.ts`, `backfill-firebase-uid.ts` | já aplicados (idempotentes) |
| `backfill-embeddings.ts`, `reembed-tobias.ts`, `rollback-tobias.ts`, `probe-vertex-embedding-quota.ts` | RAG |
| `set-hls-urls.ts` | manutenção de URLs HLS |

`prisma/seed-staging.ts`: **nunca em prod** (apaga e recria dados de IDs fixos).

### 13.3 Operações manuais comuns (SQL, enquanto não houver UI)

```sql
-- Conceder vitrine a um aluno (source ADMIN). unique(userId, showcaseId): se já
-- existir linha revogada, reativa em vez de duplicar.
INSERT INTO entitlements (id, "userId", "showcaseId", source)
SELECT gen_random_uuid(), u.id, s.id, 'ADMIN'
FROM users u, showcases s WHERE u.email = '<email>' AND s.slug = '<slug>'
ON CONFLICT ("userId", "showcaseId") DO UPDATE SET "revokedAt" = NULL, "revokedReason" = NULL;

-- Revogar
UPDATE entitlements e SET "revokedAt" = now(), "revokedReason" = 'admin'
FROM users u, showcases s
WHERE e."userId" = u.id AND e."showcaseId" = s.id AND u.email = '<email>' AND s.slug = '<slug>';

-- Depois de conceder/revogar: scripts/reconcile-enrollments.ts (dry-run, depois --apply)

-- Eventos de webhook com erro (fila de reprocesso sem UI)
SELECT "externalId", event, error, "receivedAt" FROM webhook_events
WHERE "processedAt" IS NULL ORDER BY "receivedAt" DESC;
```

### 13.4 Rollback

`docs/RUNBOOK-ROLLBACK.md`. Resumo: backend = `gcloud run services
update-traffic --to-revisions <rev>=100`; web = Instant Rollback na Vercel;
**rollback de app não reverte migration**.

### 13.5 Observabilidade

- Sentry **só no mobile** (DSN no environment do EAS). O backend tem `@sentry/node` instrumentado, mas no-op sem `SENTRY_DSN` (não confirmado em prod). Web sem Sentry.
- Logs: Cloud Logging (Cloud Run), `wrangler tail` (Workers).
- Sem alerta ou uptime monitor configurado. O health check fica em `/api/v1/health`; `/health` dá 404.

### 13.6 Regra de registro

Toda mudança em **dados ou consoles de produção** precisa entrar num handoff
(`docs/HANDOFF-*.md`). É a única forma de o próximo saber — o `git log` não
mostra.

---

## 14. Pendências priorizadas

### P0 — transferência (antes ou junto do primeiro commit do novo dev)

| # | Item |
|---|---|
| T1 | Rotação de segredos + remover o device furtado (§4) |
| T2 | Provisionar acessos (§3) e decidir Vercel Pro × truque de autoria (§3.1) |
| T3 | Verificar a revisão do Cloud Run, as env vars e o `QUEUE_ENABLED` atuais (§2.2) |
| T4 | Descobrir o status de submissão dos builds de 08/09 (iOS 4, Android 2) |

### P1 — publicação nas lojas

Do adendo de 07-08/09 do handoff de vitrines e de `mobile-app/docs/STORE-RELEASE.md`:

- [ ] Registrar conta e app no **Play Console** (`com.projetocirurgiao.app`); gerar `playstore-service-account.json` (gitignored) para o `eas submit`
- [ ] Screenshots: iPhone 6,9" e 6,5"; Android phone + feature graphic 1024×500
- [ ] Textos de loja, classificação etária, questionário de privacidade e Data Safety (declarar Vertex AI, Firebase, Cloudflare)
- [ ] **Conta demo para o revisor** (aluno com acesso a pelo menos uma vitrine)
- [ ] Verificar aviso ITMS-90683 no upload do build 3. `app.json` não declara `NSMicrophoneUsageDescription` e o app usa `expo-audio`
- [ ] Revisar os textos de `STORE-RELEASE.md`: citam "conta Google" e "cadastro", que não existem hoje
- [ ] Risco de revisão Apple 3.1.1: o iOS não tem caminho de compra; o Android abre FAQ web com link de checkout

### P2 — produto e negócio

| # | Item | Onde |
|---|---|---|
| N1 | **UI e endpoint admin para conceder ou revogar `Entitlement`** (hoje só SQL ou webhook) | `showcases` controller + `admin/students/[id]` |
| N2 | **Fila de reprocesso de webhook no admin** (`WebhookEvent` com `error`) | `webhooks.service.ts` |
| N3 | Completar `externalProductId` das vitrines sem vínculo e migrar os ~20 produtos restantes | `docs/themembers-catalog/MIGRACAO-VITRINES.md` |
| N4 | Decisão do professor sobre publicar os vídeos migrados com `isPublished=false` | admin |
| N5 | Consumidores de `Enrollment` que ignoram `suspendedAt`: `gamification.service.ts`, `badges.service.ts`, `admin-dashboard.service.ts` (é um `where: { suspendedAt: null }` cada) | backend |
| N6 | Confirmar se o re-embedding do Tobias foi executado | `docs/plans/2026-07-02-rag-tobias-reembedding-plan.md` |
| N7 | Pós-V1 prometido ao cliente: relatórios de presença, índices de abandono, retenção | — |

### P3 — técnico (dos findings pré-live; status conferido no código em 15/09)

| # | Item | Status | Onde |
|---|---|---|---|
| M2 | Refresh tokens gravados **em claro** no banco; falta hash sha256 + revogar a família no reuso | aberto | `auth.service.ts` (`refreshTokens`, `saveRefreshToken`) |
| M5 | Loggers imprimem o `AxiosError` inteiro (com `Bearer`) no console e no logcat | aberto | `frontend-web/src/lib/logger.ts`, `mobile-app/src/lib/logger.ts` |
| M4 | Fallback `http://localhost:8787` do Worker em prod; deveria dar erro | aberto | `frontend-web/src/lib/api/r2-browser.service.ts:12`, `multipart-uploader.ts:13` |
| M3 | Health só em `/api/v1/health` | aberto (documentar ou `exclude`) | `backend-api/src/main.ts:63` |
| M1 | Mobile usa progresso ponderado onde o web usa binário (filtro de "concluído") | aberto | `mobile-app/src/lib/course-progress.ts` |
| M8 | `.sql` manuais soltos em `prisma/migrations/` (o `migrate deploy` ignora) | aberto | mover para `prisma/manual/` |
| M9, M10 | `app.json` espúrio na raiz; "Criar conta" no mobile | **fechados** | — |
| — | Sentry no web; DSN do backend | aberto | `docs/observability.md` |
| — | Auth híbrida Firebase + JWT | aberto | `docs/TECH-DEBT.md` |
| — | Highs do `npm audit` que exigem major (Nest 10→11, `sharp`) | aberto | backend |
| — | CSP com `unsafe-inline`/`unsafe-eval` | aberto | `frontend-web/next.config.ts` |
| — | CD do backend (GitHub Actions + Cloud Build) | aberto | — |
| — | `video-pipeline/` no `.gitignore` raiz; Worker trigger com duas cópias | aberto | §8 |
| — | Ordem da capa da vitrine com vários módulos (hoje pedagógica, ok) | fechado em 03/09 | — |
| — | `noImplicitAny: false`, `strictBindCallApply: false` | aberto | `backend-api/tsconfig.json` |
| — | EAS Update não configurado (todo fix de JS exige build novo) | aberto | `mobile-app` |
| — | `expo-dev-client` não instalado (o perfil `development` do EAS não funciona na nuvem) | aberto | `mobile-app` |

### P3 — próxima feature planejada: contador de vidas salvas

Design aprovado pelo Gustavo em 10/09 (`docs/plans/2026-09-10-vidas-salvas-design.md`),
protótipo interativo com tokens Atlas/mobile validado. **Fases 1 (backend),
2 (web) e 4 (mobile) implementadas em 18/09** (commits `fbb5b53`, `9cf5afb`,
`a03648e`), **em produção desde 18/09** (backend rev `00120-sjd`, migration
aplicada pelo job migrator; web via Vercel). Smoke feito: relato criado no
app, aprovado no admin web, contador em 1 no app. Faltam: fase 0 (CORS de
PUT no bucket R2 pra upload pelo browser; upload pelo app não depende disso),
fase 3 (tela corporativa + credencial de exibição) e uma build EAS nova
(expo-image-picker é módulo nativo; a APK preview publicada ainda não tem
a feature). Há 1 relato de TESTE aprovado em prod (conta
gustavobressnin6) — devolver no admin pra tirar do contador antes do
lançamento. `gcloud` nesta máquina usa `CLOUDSDK_CONFIG=C:/Users/guh_r/gcloud-config`
(a pasta de credenciais padrão ficou com ACL quebrada). Resumo: cada vida salva é um relato moderado de um
veterinário (nome, CRMV e atribuição obrigatórios, mídia opcional via
presigned PUT no R2), o contador é `COUNT(aprovados)`, só usuários logados
veem, e a tela corporativa usa credencial de exibição emitida pelo admin.
Decisões ainda abertas estão no §8 do plano.

### P4 — higiene do repo

- **27 branches remotas não mergeadas.** Quase todas foram integradas por rebase (sem commit único). Só três têm conteúdo sem equivalente em `main`:
  - `fix/android-statusbar-darkmode` — 1 commit (status bar no dark mode). Avaliar.
  - `chore/repo-housekeeping` — 7 commits de abril, provavelmente superados.
  - `feat/admin-dashboard-atlas-reskin` — 88 commits de abril/maio, redesign abandonado.
  - As demais podem ser apagadas.
- Arquivos legados na raiz (§5.1) e `firebase-hosting/`.
- `workflows/` (n8n) não pertence ao produto.

---

## 15. Riscos aceitos (decisões, não bugs)

| Risco | Decisão / quando reabrir |
|---|---|
| **Prévia contornável**: a URL completa do `playlist.m3u8` chega ao cliente e o R2 é público; com DevTools dá para assistir a aula inteira | Aceito em 12/08. Reabrir com evidência de link circulando (nível 2 = URL assinada) |
| **Rotação de segredos** | Era aceito. **Os gatilhos dispararam** (§4) |
| Vínculo produto↔vitrine digitado à mão | Aceito; o admin mostra `product.name` do primeiro evento para conferência |
| iOS sem caminho de desbloqueio | Decisão conservadora frente à regra 3.1.1 da App Store |
| Assimetria dos bundle IDs iOS/Android | Forçada pela Apple; não alinhar |

---

## 16. Gotchas que mais custam tempo

Lista completa no `CLAUDE.md` e em `HANDOFF-2026-08-11 §6`. Os mais caros:

1. **Ignore-files múltiplos.** `.gitignore`, `.dockerignore`, `.gcloudignore` e `.easignore` (este na **raiz**, lido pelo eas-cli) são consumidores diferentes. Já vazaram dump de banco e chave SA por cobrir só um. No `.easignore`, a regra `!mobile-app/**` re-inclui tudo que veio antes, então exclusão sensível vai **depois** dela. Validar: `eas build:inspect --stage archive` e `gcloud meta list-files-for-upload` (de dentro de `backend-api/`). **Não usar `*.sql`** no `.gcloudignore`, que remove as migrations da imagem.
2. **`createMany` grava o mesmo timestamp** em todas as linhas: ordenar por `addedAt` exige desempate.
3. **Feature nova muda o significado de conceito antigo** (`Enrollment`, `CORS_ORIGINS`, `grantsAllContent`). Ao introduzir um conceito, procurar quem lê o antigo.
4. **`gcloud` expira em menos de 2h.** `Reauthentication failed` = `gcloud auth login`. O `cloud-sql-proxy` vira zumbi com token morto e segura a porta.
5. **Windows:** diretórios ReadOnly herdados do OneDrive quebram o `eas build` (`EPERM rmdir`); MAX_PATH quebra o build nativo Android (`subst`); `adb screencap` pelo PowerShell corrompe o PNG.
6. **Migrations:** nunca `prisma db push` fora do local. Tabelas precisam pertencer ao `postgres`, não ao `app_cirurgiao`. Drift: `prisma migrate resolve --applied`.
7. **Domínios:** `www.` é o que os alunos usam; `app.` é o canônico. Os dois precisam funcionar.

---

## 17. Documentação desatualizada (não confiar sem conferir)

| Documento | O que está velho |
|---|---|
| `CLAUDE.md` | "`KnowledgeChunk.embedding` em JSON" — já é pgvector com índice HNSW |
| `docs/DEPLOY.md §1/§3/§4` | `DATABASE_URL` como "placeholder" e serviço `projeto-cirurgiao-backend` — hoje é secret ref e o serviço é `projeto-cirurgiao-api` |
| `docs/RUNBOOK-ROLLBACK.md` | "última revisão boa `00092-7zn`" — muito antiga; o fluxo mobile descreve ciclo "iOS-only interno" |
| `docs/setup-local.md` | Postgres na 5432 com `postgres/postgres`; o real é 5433 com role `app_cirurgiao` |
| `docs/TECH-DEBT.md` | valores do `.env.example` "comitados" — o arquivo atual tem placeholders; o problema é o **histórico** |
| `mobile-app/docs/STORE-RELEASE.md` | login com Google, cadastro, "150 vídeos" |
| `docs/mobile-preview-smoke-checklist.md`, go-live checklist | dão iOS como validado em 02/07; esse build nunca existiu no EAS |
| `docs/architecture/system-overview.md` | visão de nov/2025 |
| `docs/sprint-v1.0/*`, handoffs de abril/maio | histórico; não refletem o sistema atual |

---

## 18. Checklist da primeira semana

- [ ] Ler `CLAUDE.md` inteiro e este documento
- [ ] Receber os acessos da §3 e rodar `gh auth status`, `gcloud auth list`, `eas whoami`, `wrangler whoami`
- [ ] Setup local (§10) → backend 335/335 com Docker de pé, web 24/24, mobile 170/170
- [ ] Rodar a sonda de produção (§2) e confirmar a revisão do Cloud Run
- [ ] Executar ou acompanhar a rotação de segredos (§4) **com o Gustavo**
- [ ] Logar no web e no app com as duas contas de teste (§3) e entender a diferença de acesso na prática
- [ ] Abrir uma vitrine bloqueada, ver a prévia de 2 min e o fluxo "Como acessar?" (Android × iOS)
- [ ] Fazer um deploy de backend "vazio" (mesma imagem) acompanhado, para validar o script e as permissões
- [ ] Acordar prioridades entre P1 (lojas) e N1/N2 (operação de acesso)
- [ ] Ao fim de cada rodada: novo `docs/HANDOFF-AAAA-MM-DD-<tema>.md`, apontado no topo do `CLAUDE.md`

---

*Handoffs anteriores (histórico): `HANDOFF-2026-08-14-vitrines.md` (com adendos
até 08/09), `HANDOFF-2026-08-11-pre-live-execucao.md`,
`HANDOFF-2026-05-26-aluno-resumos-quiz-gamificacao.md`,
`HANDOFF-2026-05-13-video-admin-catalogo.md`,
`HANDOFF-2026-05-09-prod-stabilization.md`.*
