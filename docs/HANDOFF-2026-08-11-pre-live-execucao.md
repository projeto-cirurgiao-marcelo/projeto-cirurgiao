# HANDOFF — 2026-08-06/11 · Review pré-live e execução dos findings

> **Para quem pega o projeto daqui:** este é o documento de entrada. Ele descreve
> **o estado atual verificado** (não o estado desejado), o que mudou dentro e
> **fora** do repositório, e o que sobrou em aberto com localização exata.
>
> Leitura complementar, nesta ordem:
> 1. `docs/plans/2026-08-06-pre-live-review.md` — o review completo (findings com evidência, veredicto GO/NO-GO por plataforma). Este handoff é o resumo executável dele.
> 2. `CLAUDE.md` — arquitetura e gotchas permanentes.
> 3. `docs/TECH-DEBT.md` — débito consciente, incluindo o que foi **aceito** e não corrigido.

---

## 1. O que foi esta sessão

Duas fases, em dias diferentes:

- **2026-08-06 — Review pré-live (read-only).** 4 subagentes de escopo fechado
  (backend, web, mobile, varredura transversal de segredos) + sondas HTTP em
  produção + smoke automatizado em emulador Android. Nenhum fix aplicado,
  nenhum deploy, nenhum dado criado em prod. Saída: 3 bloqueadores, 7 altos,
  10 médios.
- **2026-08-10/11 — Execução dos findings.** Itens 1–8 executados com
  autorização explícita do Gustavo, 8 commits em `main`, deploy web em produção
  confirmado.

Entregável paralelo (não técnico): **relatório de status para o dono da
plataforma** — artifact em
`https://claude.ai/code/artifact/41604ed0-1c7f-45ee-9502-d474964ae332` e PDF em
`D:\dashboard\Projeto-Cirurgiao-Status-Agosto-2026.pdf`. Cobre linha do tempo
Nov/2025→Ago/2026 e os planos pós-V1 (relatórios de presença, índices de
abandono, estratégias de retenção). Não vive no repo — é material de cliente.

---

## 2. Estado verificado em produção (sondado em 2026-08-11)

| Alvo | Estado | Observação |
|---|---|---|
| `app.projetocirurgiao.app` | **HTTP 200** | Domínio canônico. Adicionado à Vercel + CNAME no Cloudflare nesta rodada (antes: NXDOMAIN). |
| `www.projetocirurgiao.app` | **HTTP 200** | Também serve o app — é o host que os alunos vinham usando. |
| `projetocirurgiao.app` (apex) | **HTTP 307** | Redireciona para `www`. |
| Backend `/api/v1/health` | **HTTP 200** | Cloud Run `southamerica-east1`. Path canônico é com prefixo — `/health` dá 404 (finding M3, aberto). |
| Deploy web | **`b6d10f9` em Production** | Vercel: `Deployment has completed / success`, 2026-08-11T14:42:35Z. Next 15.5.23 servindo. |
| Deploy backend | **`b7e9985` → revisão `00102-s5s`** | Deployado em 2026-08-12, 100% do tráfego. `/api/v1/health` 200, `/api/v1/auth/me` sem token 401. Migração `cirurgiao-api-migrator-fxgl4` completou (no-op). O `npm ci` do Cloud Build reportou 4 low / 22 moderate / 15 high e **zero critical** — a CRITICAL do `websocket-driver` saiu de runtime. |
| Build mobile | **⚠️ Nenhum build novo** | As mudanças de `eas.json` só valem no próximo `eas build`. |

---

## 3. O que mudou **dentro** do repo (8 commits, todos em `origin/main`)

Todos autorados como `xoiurp <102543650+xoiurp@users.noreply.github.com>` —
obrigatório, senão a Vercel Hobby não dispara build (gotcha no `CLAUDE.md`).

| Commit | Finding | O quê |
|---|---|---|
| `453f6ad` | — | Relatório do review pré-live versionado em `docs/plans/`. |
| `527dddb` | R1 | `docs/cademi-api/` no `.gitignore` da raiz. O diretório tem credenciais R2 + token Cademí **vivas e hardcoded**, untracked; agora não é commitável por acidente. |
| `99154a0` | A5 | Web: `next` 15.3.8 → **15.5.23** (corrige bypass de middleware via segment-prefetch — o middleware é o gate de `/admin` e `/student`), `axios` → 1.19.0. |
| `5c9fd70` | A5 | Backend: `axios` → 1.19.0 + `npm audit fix` (`form-data`, `websocket-driver` que era a CRITICAL, `glob`). Zero critical restante. Highs que sobraram exigem major (Nest 10→11, `sharp`) — pós-V1. |
| `8aff4dc` | A4 / M9 | Blindagem de credenciais de loja em **duas camadas**: `mobile-app/.gitignore` e `.easignore` da raiz (`*-service-account*.json`, `*.keystore`, `*.jks`, `.env.production`). |
| `2c02cc4` | A6 | `eas.json`: `"environment": "production"` e `"preview"` nos perfis, para os builds consumirem as env vars do EAS (é assim que o Sentry DSN chega no app). |
| `23921ee` | M6 | `eas submit` iOS: `appleId` real (`marcelo_444@hotmail.com`), placeholders removidos. |
| `b6d10f9` | — | Banner de execução no topo do relatório do review. |

Fora dos commits (execução local, sem rastro no git por serem arquivos ignorados):

- **A3 ✅** — `.history/backend-api/` **apagado** (79 snapshots, incluindo 4 cópias da chave privada do Firebase Admin e 2 do env de prod do Cloud Run).
- **A2 parcial ✅** — `video-pipeline/HANDOFF.md` e `video-pipeline/cloudflare-worker/handoff.md`: valores de `R2_ACCESS_KEY`, `R2_SECRET_KEY` e `WEBHOOK_SECRET` substituídos por `<VALOR_NO_SECRET_MANAGER>` (3 em cada, verificado por grep = 0 restantes).

---

## 4. O que mudou **fora** do repo (consoles — não versionado, não descobrível por leitura de código)

Esta seção é a razão pela qual ler só o `git log` engana.

| Onde | Mudança | Efeito |
|---|---|---|
| **Firebase Auth** (`projeto-cirurgiao-e8df7`) | "Ativar criação (inscrição)" **DESATIVADO** | Fecha o finding A1 por configuração: ninguém cria conta via API pública com a chave web (que é pública por design). O fluxo de convite usa Admin SDK e **não** é afetado. Vinculação já estava correta ("Vincular contas que usam o mesmo e-mail"). |
| **Vercel** (projeto do `frontend-web`) | Domínio `app.projetocirurgiao.app` adicionado | Resolve R3. Estado: `Valid Configuration · Production`. |
| **Cloudflare DNS** | CNAME `app` → Vercel, **DNS only** (sem proxy laranja) | Par do item acima. |
| **EAS** (projeto mobile) | Env var `EXPO_PUBLIC_SENTRY_DSN` criada nos environments `production` **e** `preview` | Resolve A6. O código mobile já estava instrumentado (`mobile-app/src/config/sentry.ts`) — faltava só o DSN. |
| **Sentry** | Projeto criado (org `o4511889897095168`, projeto `4511889952342016`) | Só **mobile**. Web e backend não têm projeto Sentry — ver §5.4. |

---

## 5. O que ficou em aberto

### 5.1 ~~Ação imediata pendente do Gustavo~~ — **RESOLVIDA em 2026-08-12**

**Deploy do backend no Cloud Run: feito.** Revisão `00102-s5s`, verificada em
produção (ver §2). A CRITICAL do `websocket-driver` não está mais em runtime.

Segue valendo que **não há CI/CD de backend** — o deploy é manual via
`backend-api/deploy-artifact-registry.ps1`, e o script exige `gcloud` com token
válido (`gcloud auth login`; o token expira e falha com
`Reauthentication failed. cannot prompt during non-interactive execution`).

### 5.2 Riscos **aceitos** por decisão do Gustavo (não são pendências — são decisões)

| Risco | Decisão |
|---|---|
| **Rotação de segredos** (par R2, token Cademí, senha do Postgres de prod, `WEBHOOK_SECRET`, chave SA do GCP) | **Descartada** (2026-08-10). A senha do Postgres segue no histórico git (`docs/HANDOFF-2026-05-09-prod-stabilization.md:182` e `:185`, commit `24a77de`) — remover o arquivo hoje **não** resolve. ⚠️ **Reavaliação obrigatória antes de**: adicionar colaboradores ao repo, tornar o repo público, ou abertura ampla ao público. |
| **Smoke em device físico** | **Descartado** — sem aparelho disponível. O boot em emulador Android passou (§5 do review). |
| **M7 — `applicationId` do Android** | **Decidido em 2026-08-12: mantém `com.projetocirurgiao.app`.** O review tratou a assimetria iOS×Android como pendência, mas ela é **forçada**: `com.projetocirurgiao.app` ficou indisponível para o Apple Team `2PLJU3QXNH` (commit `b611476`, 01/07/2026), daí o iOS ser `app.projetocirurgiao.mobile`. Apple e Google têm namespaces independentes — não há requisito de igualdade. Ambos os `googleServicesFile` já declaram o identificador correto da sua plataforma (verificado). Alinhar custaria novo app no Firebase Console + `google-services.json` novo + `expo prebuild --clean`, com ganho funcional zero. Janela confirmada aberta no momento da decisão: `eas build:list --profile production` vazio — nenhum build de produção jamais existiu (não cobre upload manual fora do EAS). |

### 5.3 Condição futura obrigatória (não é opcional, é um gate)

**Antes de reativar o registro público** (previsto para pós-V1), o fix de código
do A1 é obrigatório:

- `firebaseUid String? @unique` no modelo `User` (`backend-api/prisma/schema.prisma`)
- popular no register / primeiro login
- `backend-api/src/modules/firebase/guards/firebase-auth.guard.ts:44-56` — resolver
  por UID, com fallback por e-mail **só** quando `email_verified === true`
- auditar quais `User` de prod não têm conta Firebase correspondente (é exatamente
  o conjunto exposto)

Hoje o guard vincula identidade **só por e-mail**. Com a inscrição desativada isso
é inofensivo. Reabrir a inscrição sem o fix reabre o vetor de takeover de conta
(inclusive ADMIN).

### 5.4 Médios documentados para "primeira semana" (nenhum iniciado)

Ordenados por custo/benefício, com localização exata. (**M7 saiu desta lista** —
foi decidido, ver §5.2.)

| # | Item | Onde |
|---|---|---|
| **M1** | Paridade dos helpers de progresso — portar as funções do web (com `Math.round` + clamp) pro mobile e trocar os filtros de "concluído" de weighted para binário | `mobile-app/src/lib/course-progress.ts:17`; consumo em `mobile-app/app/(tabs)/index.tsx:106` e `app/courses/in-progress.tsx:51` |
| **M5** | Scrub de token nos loggers — hoje o `AxiosError` inteiro (com header `Bearer`) vai pro logcat e pro console do navegador. O caminho Sentry já rediga; o console não | `mobile-app/src/lib/logger.ts:38-41`, `quizzes.service.ts:126`; `frontend-web/src/lib/logger.ts:30-33`, `auth-store.ts:169/230/304` |
| **M2** | Hash dos refresh tokens (`sha256`) + revogar a família inteira ao detectar reuso + evento no AuditService | `backend-api/src/modules/auth/auth.service.ts:371-375`, `:104-105`, `:120-126` |
| **M4** | Documentar e confirmar `NEXT_PUBLIC_R2_BROWSER_WORKER_URL` na Vercel; trocar o fallback `localhost:8787` por throw em prod | `frontend-web/src/lib/api/r2-browser.service.ts:10-18`, `multipart-uploader.ts:11-14` |
| **M3** | Alinhar health path/monitor — `exclude: ['health']` ou documentar `/api/v1/health` no runbook | `backend-api/src/main.ts:63` |
| **M9** | Higiene: deletar `app.json` espúrio da **raiz** (`{"expo": {}}`, 16 bytes, untracked — qualquer `expo`/`eas` rodado por engano na raiz lê config vazia), `.agent-bus/` no gitignore, placeholders no `.env.local.example` | raiz do repo |
| **M10** | Esconder "Criar conta" no app mobile — **cosmético** desde que a inscrição foi desativada (o fluxo falha no servidor, não vaza nada) | tela de login do mobile |
| **M8** | Mover os `.sql` manuais para `prisma/manual/` com README (o `migrate deploy` os ignora; sem drift hoje) | `backend-api/prisma/migrations/*.sql` |
| ~~**A7**~~ | **VERIFICADO em 2026-08-12 — nada a corrigir.** 9 segredos (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, tokens Cloudflare/R2, `VERTEX_AI_API_KEY`, `VIDEO_WEBHOOK_SECRET`) são secret refs do Secret Manager. As 15 env vars plaintext são config não-sensível (IDs de projeto, URLs de bucket/CDN, expirations, `CORS_ORIGINS`). Nenhuma mascara o Secret Manager. | — |

### 5.5 Oferecido, não pedido

Sentry para **web** (`@sentry/nextjs`) e **backend** (DSN Node como env var do
Cloud Run). Ambos exigem criar os projetos no Sentry primeiro. Só o mobile foi feito.

---

## 6. Gotchas novos aprendidos nesta rodada

Complementam os do `CLAUDE.md` — todos custaram tempo real.

1. **`.easignore`: `!mobile-app/**` re-inclui tudo que veio antes.** Semântica
   gitignore = a última regra que casa vence. Qualquer re-exclusão de arquivo
   sensível dentro de `mobile-app/` tem que vir **depois** daquela linha (é por
   isso que o bloco de credenciais de loja está no fim do arquivo). Validar o
   efeito **sem gastar build minutes**: `eas build:inspect --platform android
   --stage archive`, ou avaliar as regras direto com a lib `ignore` que o
   `eas-cli` usa.
2. **`eas submit` iOS: placeholder falso é pior que campo ausente.** Os
   `CONFIGURAR_VIA_EAS_SECRETS` causavam falha dura. `ascAppId`/`appleTeamId`
   ausentes resolvem interativamente no submit — deixar só o `appleId`.
3. **Não detectar deploy da Vercel pelo `buildId` do HTML.** O grep no HTML
   servido falhou silenciosamente e reportou TIMEOUT num deploy que tinha dado
   certo. O sinal confiável é
   `gh api repos/<owner>/<repo>/deployments` + `gh api repos/.../commits/<sha>/status`.
4. **Testes do backend exigem o Postgres local no 5433.** 7 falhas em
   `gamification` com `Can't reach database server at localhost:5433` são
   ambiente, não regressão. `docker start projeto-cirurgiao-postgres
   projeto-cirurgiao-redis` (o `docker-compose up -d` pode esbarrar em conflito
   de nome no container do pgadmin). Com o banco de pé: 248/248 verdes.
5. **Antes de pedir cliques ao usuário, tentar a CLI.** `vercel whoami` /
   `vercel projects ls` / `wrangler whoami` respondem em segundos. (Feedback
   direto do Gustavo nesta sessão.)
6. **`.dockerignore` e `.gcloudignore` são dois arquivos com dois consumidores.**
   O primeiro controla o que entra na **imagem**; o segundo, o que sobe no
   **tarball do `gcloud builds submit`** pro bucket de staging
   (`gs://<project>_cloudbuild/source/`). Cobrir só um deixa o segredo em
   repouso no GCS mesmo com a imagem limpa. Até 2026-08-12 iam junto em todo
   deploy: `firebase-service-account.json` e — pior — o **dump completo do
   banco de produção** (`backend-api/db-backups/prod-full-*.sql`, 133 MB, PII
   de aluno). O `.gitignore` cobria os dois; o `.gcloudignore`, nenhum. Era o
   grosso dos 209,9 MiB do tarball. Corrigido em `b7e9985` e `07f83b6`.
   Terceira ocorrência da mesma classe de bug, depois do `.easignore` (04/08)
   e do `.gitignore` de `video-pipeline/`: **ao adicionar arquivo sensível,
   enumerar todos os ignore-files que o empacotam.**
   - Chave rotaciona; dump de banco **não**. Priorizar nessa ordem.
   - **Não usar `*.sql` no `.gcloudignore`/`.dockerignore`** — pega
     `prisma/migrations/*/migration.sql` e a imagem sobe sem migrations,
     quebrando o `migrate deploy` do Job e do cold start. Excluir `db-backups/`.
   - Validar sem gastar build: `gcloud meta list-files-for-upload` **rodado de
     dentro de `backend-api/`** lista exatamente o que o `builds submit` envia.
     Esperado hoje: 292 arquivos, 40 `migration.sql`, zero dump/chave.

---

## 7. Como continuar

```bash
# Estado do repo
git log --oneline -8            # a série desta rodada termina em b6d10f9
git status --short              # untracked esperados: .agent-bus/, app.json (M9), logos

# Web (o que já está em produção)
cd frontend-web && npm ci && npm run build

# Backend (precisa do Postgres local pros testes)
docker start projeto-cirurgiao-postgres projeto-cirurgiao-redis
cd backend-api && npm test      # esperado: 248/248

# Sondas de produção (read-only, seguras)
curl -o /dev/null -w "%{http_code}\n" https://app.projetocirurgiao.app/
curl -o /dev/null -w "%{http_code}\n" https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app/api/v1/health
```

**Regras que valeram nesta sessão e devem continuar valendo:**

- Commit sempre com `--author='xoiurp <102543650+xoiurp@users.noreply.github.com>'`;
  merge de PR com `gh pr merge --rebase` (squash sobrescreve autoria e mata o build da Vercel).
- Nenhum valor de segredo em documento, commit ou output — nomes e localizações apenas.
- Mudanças de infra/console: pedir autorização explícita antes, e **registrar aqui**
  (§4) depois — senão o próximo agente não tem como saber que aconteceram.

---

*Sessões anteriores: `docs/HANDOFF-2026-05-26-aluno-resumos-quiz-gamificacao.md`,
`docs/HANDOFF-2026-05-13-video-admin-catalogo.md`,
`docs/HANDOFF-2026-05-09-prod-stabilization.md`.
Incidente de empacotamento EAS: `docs/plans/2026-08-04-eas-packaging-leak.md`.*
