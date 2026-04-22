# Merge Plan — Sprint v1.0 → `release/v1.0`

**Ordem aprovada:** `track/backend-video` → `track/front-mobile` → `track/front-web` (C → B → A).
**Estratégia:** `--no-ff` pra preservar histórico de feature branches.
**Destino final:** branch `release/v1.0` (criada a partir de `main`), depois `main` após smoke test conjunto.

---

## ⚠️ Zona de conflito identificada — LEIA PRIMEIRO

Durante a coleta pro pacote, detectei que **A e B criaram os mesmos arquivos em `docs/`** na raiz do repo (não nos subdiretórios das suas apps). Isso gera conflito de merge garantido se tentarmos fazer straight-merge.

**Arquivos conflitantes:**

| Arquivo | A (`track/front-web`) | B (`track/front-mobile`) | Solução proposta |
|---|---|---|---|
| `docs/DEPLOY.md` | 2672 bytes, web-specific | 7638 bytes, mobile-specific | Renomear por track antes do merge |
| `docs/TECH-DEBT.md` | 4119 bytes, web CVEs + video.js | 10186 bytes, mobile CVEs + orientation + etc. | Renomear por track antes do merge |
| `docs/proposals/` | `t7-loading-audit.md`, `429-ux-spec.md` | `playback-unified.md` | Provavelmente compatível (paths diferentes), verificar |

**C está limpo** — escreveu tudo em `backend-api/docs/` (subdir da app). Sem conflito.

**Resolução** (executar ANTES do merge em cada branch afetada):

```bash
# Em track/front-web
cd /d/dashboard/cirurgiao-web
git mv docs/DEPLOY.md frontend-web/docs/DEPLOY.md
git mv docs/TECH-DEBT.md frontend-web/docs/TECH-DEBT.md
git mv docs/proposals frontend-web/docs/proposals
git commit -m "chore(web): move docs under frontend-web/ to avoid cross-track collision"
git push origin track/front-web

# Em track/front-mobile
cd /d/dashboard/cirurgiao-mobile
git mv docs/DEPLOY.md mobile-app/docs/DEPLOY.md
git mv docs/TECH-DEBT.md mobile-app/docs/TECH-DEBT.md
git mv docs/STORE-RELEASE.md mobile-app/docs/STORE-RELEASE.md
git mv docs/proposals mobile-app/docs/proposals
git commit -m "chore(mobile): move docs under mobile-app/ to avoid cross-track collision"
git push origin track/front-mobile
```

**Verificar depois:** `git diff track/front-web track/front-mobile -- docs/` deve retornar vazio (nenhum arquivo compartilhado entre as tracks em `docs/`).

Alternativamente, se você preferir **manter `docs/` compartilhado** na raiz: fazer um merge manual no final consolidando os DEPLOY/TECH-DEBT em sections por track (`## Web`, `## Mobile`). Mais verbose no doc, menos git-moves. Sua escolha.

**Recomendação forte:** renomear. Docs co-localizados com o código documentado é padrão de mercado e reduz fricção no futuro. O pacote `sprint-v1.0/` atual (que você está lendo) fica em `docs/sprint-v1.0/` porque é **cross-track** (escrito pelo líder, cobre os 3 tracks).

---

## Pré-merge — validação

Execute antes de qualquer merge. **HEADs verificados pelo líder em 2026-04-18**; se alguma track recebeu commits novos depois, atualizar expectativas abaixo antes de rodar o resto do plano.

```bash
# Verifica que as 3 tracks estão no commit final esperado
git -C /d/dashboard/cirurgiao-backend log --oneline -1
# Esperado em 2026-04-18: d79f030 docs(api): add 429 client contract + runtime caveats consolidation

git -C /d/dashboard/cirurgiao-web log --oneline -1
# Esperado em 2026-04-18: cb04568 docs(deploy): consolidate go-live dependency upgrade checklist (web + mobile)

git -C /d/dashboard/cirurgiao-mobile log --oneline -1
# Esperado em 2026-04-18: e06dfd3 test(mobile): add auth + catalog + VideoPlayer + gamification smoke tests

# Verifica que main ainda está em e00c319
git -C /d/dashboard/next-shadcn-admin-dashboard-main rev-parse main
# Esperado: e00c319...
```

Se qualquer HEAD divergir do esperado:
- **Se for commit novo** (ex: B mexeu em cleanup adicional): atualizar a expectativa aqui e re-validar cobertura — nenhum dado novo foi adicionado aos PR descriptions e esses commits não foram documentados no pacote `sprint-v1.0/`. Decidir se entra nesse release ou vira `v1.0.1`.
- **Se for commit divergente** (alguém rebaseou ou cherry-pick intrusivo): **pausar** e reconciliar antes de prosseguir.

Também:

```bash
# Nenhum working tree pode ter mudança não-commitada ou untracked "lixo"
git -C /d/dashboard/cirurgiao-backend status
git -C /d/dashboard/cirurgiao-web status
git -C /d/dashboard/cirurgiao-mobile status
# Esperado: "working tree clean" (o arquivo CIRURGIAO_AUDIT.md untracked na raiz de cada worktree
# é artefato de warmup do líder — ignorar).
```

---

## Fase 1 — Criar `release/v1.0` e renomear docs

```bash
# 1.1 No repo principal, cria a branch de release a partir de main
cd /d/dashboard/next-shadcn-admin-dashboard-main
git fetch --all
git checkout main
git pull origin main
git checkout -b release/v1.0

# 1.2 Rename docs em track/front-web (remove conflito com mobile)
cd /d/dashboard/cirurgiao-web
git status  # deve estar clean
mkdir -p frontend-web/docs
git mv docs/DEPLOY.md frontend-web/docs/DEPLOY.md
git mv docs/TECH-DEBT.md frontend-web/docs/TECH-DEBT.md
git mv docs/proposals frontend-web/docs/proposals
git commit -m "chore(web): move docs under frontend-web/ (pre-merge dedup)"

# 1.3 Rename docs em track/front-mobile
cd /d/dashboard/cirurgiao-mobile
git status
mkdir -p mobile-app/docs
git mv docs/DEPLOY.md mobile-app/docs/DEPLOY.md
git mv docs/TECH-DEBT.md mobile-app/docs/TECH-DEBT.md
git mv docs/STORE-RELEASE.md mobile-app/docs/STORE-RELEASE.md
git mv docs/proposals mobile-app/docs/proposals
git commit -m "chore(mobile): move docs under mobile-app/ (pre-merge dedup)"

# 1.4 Sanity — branches já visíveis (worktrees compartilham .git)
cd /d/dashboard/next-shadcn-admin-dashboard-main
git branch --list 'track/*'
# Output esperado:
#   track/backend-video
#   track/front-web
#   track/front-mobile

# Sanity de conflitos em docs/ — todos devem retornar vazio
git diff --name-only track/front-web track/front-mobile -- docs/
git diff --name-only track/backend-video track/front-web -- docs/
git diff --name-only track/backend-video track/front-mobile -- docs/
```

**Nota técnica**: worktrees criados via `git worktree add` compartilham o `.git` do repo principal. Commits nos worktrees aparecem imediatamente como branches locais no repo principal — nenhum `git fetch` ou `git push origin` intermediário é necessário pra mergear local.

---

## Fase 2 — Merge C (backend) em `release/v1.0`

**Ordem:** backend primeiro porque é base. Web e mobile dependem de tipos em `backend-api/src/types/shared.ts` e de contratos em `backend-api/docs/API-CHANGES-SPRINT.md`.

```bash
# 2.1 Merge com --no-ff
cd /d/dashboard/next-shadcn-admin-dashboard-main
git checkout release/v1.0
git merge --no-ff track/backend-video \
  -m "merge: sprint v1.0 backend track (C)

Secret Manager, rate limit per-user, Vertex embeddings reais, pgvector,
soft delete + audit, strictNullChecks, BullMQ queue infra, playback
contract unified, seed-staging, 45 Jest tests com thresholds per-file."

# 2.2 Validação pós-merge
cd /d/dashboard/next-shadcn-admin-dashboard-main/backend-api
npm ci
npx prisma generate
npx tsc --noEmit  # deve passar clean (strictNullChecks ligado)
npx jest --silent  # 45+ tests
```

**Se 2.2 falhar:** rollback imediato (ver Rollback plan abaixo). Investigar se é problema de ambiente local ou regressão real.

---

## Fase 3 — Merge B (mobile) em `release/v1.0`

**Por que B antes de A:** B tocou menos arquivos no repo compartilhado (só `mobile-app/` após a renomeação dos docs). A toca `frontend-web/` e shared types. Fazer B primeiro deixa o diff do A mais claro.

```bash
# 3.1 Merge
cd /d/dashboard/next-shadcn-admin-dashboard-main
git checkout release/v1.0
git merge --no-ff track/front-mobile \
  -m "merge: sprint v1.0 mobile track (B)

Logger dedicado, orientation portrait, seletor legendas, useNetworkStatus,
rate limit toast, eas.json 3 profiles, STORE-RELEASE, playback migration,
30 smoke tests, TECH-DEBT consolidado."

# 3.2 Validação pós-merge (sem rodar EAS build ainda — isso é Gustav)
cd /d/dashboard/next-shadcn-admin-dashboard-main/mobile-app
npm ci
npx tsc --noEmit
npx jest --silent  # 30 tests, 9 suites
```

**Esperado**: zero conflito se a Fase 1.3 rodou corretamente. Mobile só toca `mobile-app/` e `mobile-app/docs/`, `backend-api/` e `frontend-web/` ficam intactos.

```bash
# 3.3 Sanity check shared types mobile (espelhado da Fase 4)
cd /d/dashboard/next-shadcn-admin-dashboard-main
diff backend-api/src/types/shared.ts mobile-app/src/types/api-shared.ts
# Esperado: zero diff substantivo — no máximo header de comentário.

# Se divergir (C atualizou shared.ts após B copiar):
cp backend-api/src/types/shared.ts mobile-app/src/types/api-shared.ts
git add mobile-app/src/types/api-shared.ts
git commit -m "chore(mobile): resync api-shared.ts with backend (post-merge)"
```

**Por que aqui e não depois**: melhor pegar divergência ANTES de mergear A. Se algum tipo foi renomeado/removido no backend, mobile + web precisam ajustar juntos; descobrir isso depois do merge do A dobra o custo de reconciliação.

---

## Fase 4 — Merge A (web) em `release/v1.0`

```bash
# 4.1 Merge
cd /d/dashboard/next-shadcn-admin-dashboard-main
git checkout release/v1.0
git merge --no-ff track/front-web \
  -m "merge: sprint v1.0 web track (A)

Logger dedicado, dead code cleanup, PII masking, 429 toast, fallback SDK,
onboarding, skeletons, from-r2-hls admin modal, playback.kind simplification,
waitForJob utility + 13 unit tests, Playwright 3 e2e journeys."

# 4.2 Validação pós-merge
cd /d/dashboard/next-shadcn-admin-dashboard-main/frontend-web
npm ci
npx tsc --noEmit
npm run build  # 32 rotas, clean
npm test       # 13 unit tests (waitForJob)
# Playwright exige backend + seed ativos — rodar em smoke-test conjunto, não aqui
```

**Zona de conflito possível em A:** `shared.ts` copiada de C pra `src/types/api-shared.ts`. C é dono do arquivo em `backend-api/src/types/shared.ts`. A tem **cópia** em `frontend-web/src/types/api-shared.ts`. Se divergir do arquivo canônico, atualizar a cópia do A.

```bash
# Sanity check do shared types
diff /d/dashboard/next-shadcn-admin-dashboard-main/backend-api/src/types/shared.ts \
     /d/dashboard/next-shadcn-admin-dashboard-main/frontend-web/src/types/api-shared.ts
# Esperado: talvez diff no header comentário; conteúdo idêntico
```

Se divergir substantivamente, copiar de novo e commitar:

```bash
cp backend-api/src/types/shared.ts frontend-web/src/types/api-shared.ts
git add frontend-web/src/types/api-shared.ts
git commit -m "chore(web): resync api-shared.ts with backend shared.ts (post-merge)"
```

Sanity check mobile já foi executado em **Fase 3.3** antes desse merge; se houve `chore(mobile): resync api-shared.ts` naquele passo, o arquivo já está consistente. Se não rodou, rodar agora:

```bash
diff backend-api/src/types/shared.ts mobile-app/src/types/api-shared.ts
```

---

## Fase 5 — Smoke test conjunto

Detalhes completos em `03-smoke-test-playbook.md`. Essencial antes de mergear `release/v1.0` em `main`:

1. Backend local up (`docker-compose up -d` + `npm run start:dev` no backend-api).
2. Seed aplicado (`npx ts-node prisma/seed-staging.ts`).
3. Web rodando (`cd frontend-web && npm run dev`).
4. Mobile no simulador/device (`cd mobile-app && npm start`).
5. Executar playbook do `03-smoke-test-playbook.md`.

Tempo estimado: 45-60 min.

---

## Fase 6 — Merge `release/v1.0` → `main` via Pull Request no GitHub

**Contexto importante**: `main` tem branch protection configurado pelo Gustav no GitHub:
- Require pull request before merging (0 approvals — solo dev).
- Require linear history.
- Do not allow bypassing the above settings.

**`git push origin main` direto vai ser REJEITADO.** Fase 6 é via UI.

```bash
# 6.1 Validar estado local final
cd /d/dashboard/next-shadcn-admin-dashboard-main
git checkout release/v1.0
git log --oneline -10    # confirma os 3 merges de C, B, A na ordem
git status               # working tree clean
```

- [ ] Últimas linhas de `git log` mostram:
  - merge commit `release: ... web track (A)`
  - merge commit `release: ... mobile track (B)`
  - merge commit `release: ... backend track (C)`
- [ ] Working tree clean.

```bash
# 6.2 Push release/v1.0 pro origin (branch nova, sem conflito com main)
git push origin release/v1.0
```

- [ ] Push OK (branch criada em `origin/release/v1.0`).

### 6.3 Abrir Pull Request no GitHub UI

Acessar:
```
https://github.com/projeto-cirurgiao-marcelo/projeto-cirurgiao/pull/new/release/v1.0
```

Configurar:
- **Base**: `main`
- **Compare**: `release/v1.0`
- **Title**: `release: sprint v1.0 (backend + web + mobile)`
- **Description**: apontar pro pacote `docs/sprint-v1.0/` e colar um changelog resumido, por exemplo:

```markdown
Sprint v1.0 integrated — 73 commits across 3 tracks.

See `docs/sprint-v1.0/` for the full package:
- `01-executive-summary.md` — what each track delivered, metrics, risks.
- `02-merge-plan.md` — this merge plan.
- `03-smoke-test-playbook.md` — smoke test executed (link results below).
- `04/05/06-pr-*.md` — detailed descriptions per track.
- `07-go-live-checklist.md` — go-live runbook (pre-release CVE bump + rotations + filter-repo).

## Smoke test summary
- [paste resumo do smoke test do playbook 03, ex: "A+B+C+D all OK"]
- [mencionar caso tenha alguma caixa não-crítica pendente]

## Breaking changes (contratos)
- Endpoints de IA retornam 202 + jobId (QUEUE_ENABLED=false default).
- Rate limit per-user 30 rpm em endpoints de IA (429 + Retry-After).
- Video payload inclui `playback: { kind, playbackUrl, ... }`.
- Soft delete em Course/Module/Video/User.
- Detalhes nos PRs dos tracks em `docs/sprint-v1.0/0{4,5,6}-pr-*.md`.
```

### 6.4 Review do próprio PR (solo dev)

Mesmo sendo solo dev, abra o PR e revise como se fosse outro. Goal: confirmar que o diff agregado bate com o que foi planejado.

- [ ] Aba "Files changed": scroll pelo diff. Tamanho aproximado esperado: ~200-300 arquivos tocados.
- [ ] Conferir que `backend-api/`, `frontend-web/`, `mobile-app/` todos têm mudanças.
- [ ] Conferir que `docs/sprint-v1.0/` está presente (o pacote deste review).
- [ ] Nenhum arquivo inesperado (ex: `.env` commitado acidentalmente, build artifacts, `node_modules`, lockfile inflado sem motivo).
- [ ] Busca de segredos genéricos no diff: **"password"**, **"token"**, **"secret"**, **"BEGIN PRIVATE KEY"**.
- [ ] **Busca de segredos específicos já conhecidos** (aceitos em `.env.example` e `.env.proxy.example`, com rotação agendada no go-live — mas se aparecerem em QUALQUER OUTRO arquivo é novo vazamento):
  - [ ] Prefixo do token Cloudflare: **`ff0RmWo`**. Esperado só em `.env.example:35`. Qualquer outra ocorrência = incidente de segurança novo introduzido no sprint. Pausar e investigar.
  - [ ] Prefixo do account_id Cloudflare: **`ad41f4e2`**. Esperado só em `.env.example:34`. Mesma regra.
  - [ ] Prefixo da senha `app_cirurgiao`: **`JuGZqDm`**. Esperado só em `backend-api/.env.proxy.example`. Mesma regra.
- [ ] Se qualquer uma das buscas específicas retornar match fora dos arquivos esperados: **pausar o merge**, investigar a origem, reverter o commit que introduziu, re-reviewar o PR.
- [ ] Se algo estranho no diff geral, **pausar** e investigar antes de aprovar.

### 6.5 Escolha do método de merge

Três opções em ordem de preferência. **Rebase and merge** preserva SHAs dos commits individuais mas **não preserva os merge commits** que delimitam cada track — e nosso `02-merge-plan.md` + `04/05/06-pr-*.md` referenciam SHAs que A/B/C já têm em docs locais. Preferimos conservar a estrutura.

**Opção A (recomendada) — Desabilitar linear history temporariamente + "Create a merge commit"**

Processo:
1. GitHub → Settings → Branches → Edit regra de `main`.
2. Desmarca "Require linear history".
3. Save changes.
4. Volta ao PR, seleciona **"Create a merge commit"** no dropdown do botão.
5. Confirma merge.
6. **IMPORTANTE — pós-merge**: GitHub → Settings → Branches → Edit regra de `main` → **REMARCA** "Require linear history" → Save changes.

Vantagens:
- Preserva SHAs originais (73 commits não renomeados).
- Preserva os 3 merge commits delimitando `track/backend-video`, `track/front-mobile`, `track/front-web` — visualização clara em `git log --oneline --graph`.
- Zero retrabalho em docs que referenciam SHAs (TECH-DEBT, API-CHANGES, PR descriptions).
- Zero ambiguidade pra futuros bisects.

Risco: esquecer de remarcar a regra no passo 6. Mitigação: colocar alarme/todo imediatamente após o merge.

**Opção B — Manter linear history + "Rebase and merge"**

Use se política interna proíbe mexer em branch protection mesmo temporariamente.

Consequências aceitas:
- 73 commits replayados em `main` sem os 3 marcadores de merge commit.
- **Todos os 73 commits recebem SHAs novos** — o commit `d79f030` (backend) vira outro SHA, etc.
- Referências cruzadas em docs (TECH-DEBT, API-CHANGES, PR descriptions) ficam com SHAs "históricos" que só existem nas branches de origem. Não quebra nada, mas documentação perde precisão.
- `git bisect` fica um pouco mais difícil (sem boundary clara entre tracks).

**Opção C — "Squash and merge" — EVITAR**

Transforma 73 commits em 1 commit gigante. Perde totalmente:
- Rastreabilidade de qual commit introduziu qual mudança.
- Mensagens de commit individuais (vira um blob na mensagem do squash).
- Capacidade de `git bisect` funcional em cima desse release.
- Semântica de feature flags e refactors graduais.

**Só usar Opção C se Gustav explicitamente aceitar perder histórico** — o que contraria a decisão de preservar os 73 commits.

#### Execução do merge

- [ ] Opção escolhida (A, B, ou C) documentada em comentário no PR antes do merge.
- [ ] Se Opção A: branch protection modificada (linear history OFF).
- [ ] Botão de merge clicado com método correto.
- [ ] GitHub mostra "Pull request successfully merged".
- [ ] Se Opção A: branch protection **remarcada** (linear history ON novamente). **Não esquecer.**

### 6.6 Pull do main atualizado localmente

```bash
cd /d/dashboard/next-shadcn-admin-dashboard-main
git checkout main
git pull origin main
git log --oneline -5  # confirma que os commits do release estão em main
```

- [ ] `main` local sincronizado com remote.

### 6.7 Tag semântica

```bash
git tag -a v1.0.0-rc1 -m "Release candidate 1 — sprint v1.0 integrated"
git push origin v1.0.0-rc1
```

- [ ] Tag push OK (visível em GitHub → Releases).

**Por que `-rc1`**: antes de considerar `v1.0.0` final, deixar staging/prod rodar 24h de monitoramento. Se estiver OK, criar `v1.0.0` em seguida. Se houver hotfix, vira `v1.0.0-rc2`.

---

## Rollback plan

### Antes do push

Se qualquer fase falhar localmente, desfaz com `git reset`:

```bash
# Volta release/v1.0 pro commit antes do último merge
git checkout release/v1.0
git reset --hard HEAD~1  # remove o último merge commit
# verifica
git log --oneline -5
```

Se precisar descartar a branch inteira:

```bash
git checkout main
git branch -D release/v1.0
```

### Depois do merge no GitHub (precisa `git revert` via PR)

**Branch protection de main não aceita force-push nem push direto**. Rollback também vai via PR. Dois caminhos:

#### Caminho A — Via UI do GitHub (mais rápido)

1. Abrir o merge commit do release na aba "Commits" de `main` no GitHub.
2. Botão **"Revert"** no topo do commit.
3. GitHub cria branch `revert-NN-release-v1.0` e abre PR automático contra `main`.
4. Title do PR: `Revert "release: sprint v1.0 (backend + web + mobile)"` — editar se quiser contexto ("reason: <motivo>").
5. Merge o PR de revert via UI usando o mesmo método que usou pro original (Rebase and merge ou Create merge commit).
6. `git pull origin main` local.

- [ ] Revert PR criado.
- [ ] Revert PR merged.
- [ ] Main local sincronizado.

#### Caminho B — Via CLI + PR manual

```bash
cd /d/dashboard/next-shadcn-admin-dashboard-main
git checkout main
git pull origin main
git log --oneline --merges -5     # identifica o merge commit do release em main
git checkout -b revert-release-v1.0
git revert -m 1 <SHA-do-merge>     # -m 1 porque é merge commit
git push origin revert-release-v1.0

# Abrir PR no GitHub:
# https://github.com/projeto-cirurgiao-marcelo/projeto-cirurgiao/pull/new/revert-release-v1.0
# Base: main, Compare: revert-release-v1.0
# Title: "revert: release v1.0 (reason: <motivo>)"
# Merge via UI.
```

- [ ] Revert PR aberto.
- [ ] Revert PR merged.
- [ ] Main local sincronizado com `git pull origin main`.

#### Reverter track individual (pós-merge agregado)

Se só 1 dos 3 tracks causou problema e você quer manter os outros 2:

```bash
git checkout main
git pull origin main
git log --oneline --merges -10
# Identifica o merge commit do track específico DENTRO do release/v1.0
# Ex: "merge: sprint v1.0 web track (A)"

git checkout -b revert-web-track
git revert -m 1 <SHA-do-merge-do-A>
git push origin revert-web-track
# Abrir PR + merge via UI
```

Isso preserva backend (C) e mobile (B), desfaz só web (A). Aviso: se A tiver dependência cruzada com alguma feature de C ou B (ex: nova config em `shared.ts`), pode dar regressão. Testar bem.

### Se dados em prod foram afetados (pgvector, migrations)

**Migrations 17 e 18 já estão aplicadas em prod** (Gustav rodou). Rollback DB não é opção trivial — revert dos commits não desfaz schema changes. Se precisar reverter schema:

1. `npx prisma migrate resolve --rolled-back <migration_name>` contra prod.
2. SQL manual pra reverter ALTER TABLE (`ALTER COLUMN embedding TYPE jsonb USING embedding::text::jsonb`, DROP INDEX, etc.).
3. Confirmar que nenhum chunk foi populado antes de reverter (perda de dados).

**Recomendação**: evitar. Se merge falhar, reverter só código — schema em prod pode conviver com código antigo porque os novos campos são aditivos.

---

## Checklist final pré-merge em `main`

- [ ] Fase 1 — docs renomeados nos 2 tracks que tinham conflito (A e B).
- [ ] Fase 2 — C merged, typecheck clean, jest 45 passing.
- [ ] Fase 3 — B merged, typecheck clean, jest 30 passing.
- [ ] Fase 4 — A merged, typecheck + build + unit tests clean, shared.ts sincronizado.
- [ ] Fase 5 — smoke test conjunto OK (ver `03-smoke-test-playbook.md`).
- [ ] Artefatos `04-pr-*.md` prontos pra virar PR descriptions no GitHub se quiser abrir PRs ao invés de merge direto.
- [ ] `07-go-live-checklist.md` revisado — confirmar que bloco de upgrade de deps é pra ser executado DEPOIS do merge, não antes.
- [ ] `git push origin release/v1.0` OK + PR aberto no GitHub apontando `release/v1.0 → main`.
- [ ] Review do PR executado (§6.4). Nenhum arquivo inesperado.
- [ ] Gustav aprova merge via UI com método correto (Rebase and merge ou Create merge commit, dependendo da regra linear history).
- [ ] Tag `v1.0.0-rc1` criada e pushed.
