# Go-Live Checklist — Release v1.0 público

Checklist consolidado pro momento de virar o app pra usuários reais. Extrai e expande o conteúdo disperso em:

- `backend-api/docs/DEPLOY.md` §1-§9
- `backend-api/docs/TECH-DEBT.md` SECURITY-CRITICAL
- `frontend-web/docs/DEPLOY.md` §6
- `frontend-web/docs/TECH-DEBT.md` SECURITY-CRITICAL
- `mobile-app/docs/DEPLOY.md`
- `mobile-app/docs/TECH-DEBT.md`
- `mobile-app/docs/STORE-RELEASE.md`

**Tempo total estimado**: ~8h de trabalho focado (pode rodar em 2-3 sessões).

**Pré-requisito crítico**: `release/v1.0` mergeada em `main` + smoke test do `03-smoke-test-playbook.md` passando.

---

## Decisões fechadas pelo Gustav pra esta release

- **Memorystore Redis: PROVISIONAR ANTES do go-live** (Fase 1.3 abaixo). Infra pronta mesmo com `QUEUE_ENABLED` desligado.
- **`QUEUE_ENABLED=true`: NÃO flipa no go-live**. Fica `false`. Flip em janela operacional separada 1-2 semanas pós go-live (Fase 2.7-alt).
- **`supportsTablet: false` em v1.0**: usuários iPad vão ver o app em modo compatibility (portrait fixo, sem layout 2-colunas). Layout responsivo iPad entra em **v1.1 (próximo sprint)**. Decisão consciente pra não atrasar release.
- **CVEs em dependencies**: fix pré-release obrigatório em branch dedicada (Fases 1.1 web + 1.2 mobile). Next 15.3.8 especificamente, não 15.3.7.
- **Credenciais comprometidas (senha `app_cirurgiao` + token Cloudflare)**: rotação + `git filter-repo` no release day (Fase 2.2-2.5), não antes.
- **Cobertura de testes**: per-file nas camadas críticas aceita como meta. Extensão pro global é stretch pro próximo sprint.

---

## Fase 1 — Pre-release (executar 1-2 dias antes do go-live)

Bloco "a frio" de preparação. Nada disso afeta prod — tudo acontece em branch dedicada e staging.

### 1.1 — CVE remediation (web) — 45 min

**Estrutura em 5 passos com 2 checkpoints** — NÃO concatenar `install` com `audit fix` numa linha só. Queremos isolar efeitos.

```bash
cd frontend-web
git checkout -b chore/prerelease-cve-bump
```

**Passo 1 — Install dos targets diretos**:

```bash
npm install next@15.3.8 react@19.2.1 react-dom@19.2.1 axios@1.16.0
```

- [ ] Install completa sem erros de peer-dependency.
- [ ] `package.json` atualizado (confira via `grep -E '"next"|"react"|"axios"' package.json`).

**Passo 2 — Checkpoint 1: build + test após install direto**:

```bash
npm run build   # deve passar clean — 32+ rotas
npm test        # unit tests (waitForJob + outros — 13+)
```

- [ ] Build clean, warnings só os pré-existentes (framer-motion peer dep, video.js runtime).
- [ ] Unit tests 100% verdes.
- [ ] Se QUALQUER erro NOVO aparecer, **parar** — pode ser incompatibilidade de minor entre Next/React/Axios. Investigar antes de seguir.

**Passo 3 — Audit fix das transitivas**:

```bash
npm audit fix --omit=dev  # resolve protobufjs, follow-redirects, @xmldom/xmldom
npm audit --omit=dev       # confirma residual
```

- [ ] Após fix, `npm audit --omit=dev` reporta zero HIGH/CRITICAL. MODERATE residual é aceitável se justificado.

**Passo 4 — Checkpoint 2: rebuild + retest após audit fix**:

```bash
npm run build   # novamente — garante que transitivas não quebraram nada
npm test        # garante que lockfile updates não regrediram
npx playwright test  # 5 e2e smoke (requer backend + seed)
```

- [ ] Build clean.
- [ ] Unit tests 100% verdes.
- [ ] Playwright 5/5 passing.

**Passo 5 — Commit e PR**:

```bash
git add package.json package-lock.json
git commit -m "chore(web): CVE remediation bump (Next 15.3.8, React 19.2.1, axios 1.16.0, transitive audit fix)"
git push origin chore/prerelease-cve-bump
```

- [ ] Commit pushed.
- [ ] PR aberto contra `main`.
- [ ] Preview Vercel carrega sem regressão visual (smoke manual: login, watch, quiz).
- [ ] Mergear PR só após aprovação humana.

### 1.2 — CVE remediation (mobile) — 60 min (inclui EAS build)

**Estrutura em 5 passos com 2 checkpoints** — mesmo padrão do web. Atenção especial aqui: mobile está em `axios@1.7.9` exact, bump maior pra `1.16.0` — smoke de runtime essencial.

```bash
cd mobile-app
git checkout -b chore/prerelease-cve-bump
```

**Passo 1 — Install do target direto**:

```bash
npm install axios@1.16.0
```

- [ ] Install OK.
- [ ] `package.json` atualizado (confira `grep '"axios"' package.json` — deve ser `"1.16.0"` ou `"^1.16.0"`).

**Passo 2 — Checkpoint 1: typecheck + test após install**:

```bash
npx tsc --noEmit   # clean (sem strictNullChecks do backend; mobile é menos estrito)
npm test            # 30 tests, 9 suites
```

- [ ] Typecheck clean.
- [ ] Testes 30/30 verdes.
- [ ] **Atenção**: o axios passou de 1.7.9 → 1.16.0 (~9 versões menores). Pode haver mudança sutil em comportamento de timeout, retry, interceptors. Suite atual em `__tests__/services/client-429.test.ts` exercita o interceptor principal. Se algum teste quebrar, investigar antes de seguir.

**Passo 3 — Audit fix das transitivas**:

```bash
npm audit fix --omit=dev  # resolve protobufjs, follow-redirects
npm audit --omit=dev       # confirma residual
```

- [ ] Zero HIGH/CRITICAL residual.

**Passo 4 — Checkpoint 2: typecheck + retest após audit fix**:

```bash
npx tsc --noEmit
npm test
```

- [ ] Typecheck clean.
- [ ] Testes 30/30 verdes.

**Passo 5 — EAS build preview + smoke em device real**:

```bash
git add package.json package-lock.json
git commit -m "chore(mobile): CVE remediation (axios 1.16.0 + transitive audit fix)"
git push origin chore/prerelease-cve-bump

eas build --profile preview --platform android
eas build --profile preview --platform ios   # requer Apple Developer ativa
```

- [ ] Build EAS completa (pode levar 15-25 min por plataforma).
- [ ] Instalar APK no Android emulator + IPA no iPhone do Gustav.
- [ ] Smoke manual em AMBAS as plataformas:
  - [ ] Login com `test@cirurgiao.app`.
  - [ ] Abrir curso do seed.
  - [ ] Dar play no vídeo (aceitar que não toca com hlsUrl placeholder — o que importa é que a UI não crasha).
  - [ ] Enviar mensagem no chat Mentor IA (se chegar 429, ver toast).
  - [ ] Navegar pra gamification, profile, tabs.
- [ ] Nada regrediu em comparação com a última EAS preview sem o CVE bump.
- [ ] Mergear PR.

### 1.3 — Provisionamento Memorystore (DECISÃO GUSTAV: fazer ANTES do go-live) — 30 min

**Política fechada**: provisionar infra Redis **antes** do go-live, mas manter `QUEUE_ENABLED=false` no deploy público. Flip da flag fica pra janela operacional separada 1-2 semanas pós go-live (ver §2.7).

Motivo: isolar variáveis. Se algo quebrar no go-live, não é culpa da fila (ela nem está ligada). Quando flipar, smoke test em staging antes de afetar prod.

```bash
# Provisiona Memorystore Basic
gcloud redis instances create projeto-cirurgiao-queue \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --tier=basic \
  --size=1 \
  --redis-version=redis_7_0 \
  --transit-encryption-mode=SERVER_AUTHENTICATION \
  --auth-enabled \
  --network=default

# Pega a senha AUTH
gcloud redis instances get-auth-string projeto-cirurgiao-queue \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1

# Pega o host IP
gcloud redis instances describe projeto-cirurgiao-queue \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --format='value(host)'
```

- [ ] Memorystore criado.
- [ ] Guarda a senha AUTH e o host IP.
- [ ] Cria secret no GCP:
  ```bash
  printf 'rediss://:<PASSWORD>@<HOST>:6378/0' | \
    gcloud secrets versions add REDIS_URL --data-file=- \
    --project=projeto-cirurgiao-e8df7
  ```
- [ ] Grant de acesso pra Cloud Run SA:
  ```bash
  gcloud secrets add-iam-policy-binding REDIS_URL \
    --member=serviceAccount:<CLOUD_RUN_SA>@projeto-cirurgiao-e8df7.iam.gserviceaccount.com \
    --role=roles/secretmanager.secretAccessor
  ```
- [ ] Conecta Cloud Run na VPC do Memorystore:
  Cloud Console → Cloud Run → projeto-cirurgiao-backend → Edit → Networking → Serverless VPC Access connector.
- [ ] **Não flipa `QUEUE_ENABLED=true` no go-live** — infra fica pronta, flag continua `false`. Flip sai em §2.7-alt (janela operacional 1-2 semanas pós go-live).

**Decisão do Gustav**: infra pronta antes do release público isola variáveis — se o go-live tiver regressão, fila não pode ser suspeita porque está desligada. Quando flipar, smoke em staging primeiro, depois prod em janela dedicada.

### 1.4 — Conferir CORS backend — 15 min

```bash
# Confirma que o domínio de prod está no CORS allowlist
gcloud run services describe projeto-cirurgiao-backend \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --format='value(spec.template.spec.containers[0].env)'
```

- [ ] `CORS_ALLOW_ORIGINS` inclui `projetocirurgiao.app` (ou domínio final).
- [ ] Se não, atualizar:
  ```bash
  gcloud run services update projeto-cirurgiao-backend \
    --update-env-vars CORS_ALLOW_ORIGINS='https://projetocirurgiao.app,https://<staging>' \
    --region=southamerica-east1
  ```

### 1.5 — Assets da loja (B já documentou em STORE-RELEASE.md) — 3h

Checklist resumido (detalhes em `mobile-app/docs/STORE-RELEASE.md`):

- [ ] Screenshots iPhone 6.5" (1284x2778) — 3-5 imagens.
- [ ] Screenshots iPhone 6.9" (1320x2868) — 3-5 imagens.
- [ ] Screenshots Android phone (1080x1920+) — 3-8 imagens.
- [ ] Feature graphic Android (1024x500).
- [ ] Ícone 1024x1024.
- [ ] Descrição curta pt-BR (Google: 80 chars max).
- [ ] Descrição longa pt-BR (Google: 4000 chars; Apple: 4000 chars).
- [ ] Keywords/tags pra ASO.
- [ ] Política de privacidade publicada em URL pública (ex: `projetocirurgiao.app/privacy`).
- [ ] Classificação etária: Apple questionário + Google IARC.
- [ ] Release notes v1.0.0 escrita em pt-BR.

### 1.6 — Validar staging seed aplicado — 15 min

```bash
cd backend-api
DATABASE_URL="<staging>" npx prisma migrate status
# "Database schema is up to date!"

DATABASE_URL="<staging>" npx ts-node prisma/seed-staging.ts
# Log com ids criados + senhas mascaradas
```

- [ ] Migrations status clean em staging.
- [ ] Seed aplicado sem erro.
- [ ] `SELECT email FROM users WHERE email LIKE '%cirurgiao.app'` retorna os 2 users (test + admin).

---

## Fase 2 — Release day (janela de 2-3h)

### 2.1 — Backup Cloud SQL — 10 min

```bash
gcloud sql backups create \
  --instance=cirurgiao-db \
  --project=projeto-cirurgiao-e8df7 \
  --description="pre-v1.0-release"
```

- [ ] Backup criado (confirma via `gcloud sql backups list --instance=cirurgiao-db`).

### 2.2 — Rotação senha `app_cirurgiao` + update Secret Manager — 20 min

```bash
# Gerar nova senha (pode usar gcloud)
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
echo "Save this password: $NEW_PASSWORD"

# Rotaciona no Cloud SQL
gcloud sql users set-password app_cirurgiao \
  --instance=cirurgiao-db \
  --project=projeto-cirurgiao-e8df7 \
  --password="$NEW_PASSWORD"

# Update do Secret Manager DATABASE_URL
printf "postgresql://app_cirurgiao:%s@/projeto_cirurgiao?host=/cloudsql/projeto-cirurgiao-e8df7:southamerica-east1:cirurgiao-db" "$NEW_PASSWORD" | \
  gcloud secrets versions add DATABASE_URL \
  --project=projeto-cirurgiao-e8df7 \
  --data-file=-

# Redeploy Cloud Run pra pegar nova senha
gcloud run services update projeto-cirurgiao-backend \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest
```

- [ ] Nova senha salva em local seguro (password manager).
- [ ] Cloud SQL atualizado.
- [ ] Secret Manager atualizado.
- [ ] Cloud Run redeployado (confirmar via `gcloud run revisions list --service=projeto-cirurgiao-backend`).
- [ ] Smoke: `curl https://<CLOUD_RUN_URL>/health` retorna 200.

### 2.3 — Rotação token Cloudflare + update Secret Manager — 30 min

1. `dash.cloudflare.com` → My Profile → API Tokens.
2. **Revogar** o token atual (o que está em `.env.example`).
3. **Criar novo** token com escopo mínimo:
   - Permissions: `Stream` → `Read/Edit`.
   - Permissions: `R2 Object` → `Read/Write` no bucket `s3-projeto-cirurgiao`.
   - **Nada mais.**
4. Copiar o token gerado (mostra só uma vez).

```bash
NEW_CF_TOKEN="<paste-aqui>"

# Update Secret Manager
printf "%s" "$NEW_CF_TOKEN" | \
  gcloud secrets versions add CLOUDFLARE_API_TOKEN \
  --project=projeto-cirurgiao-e8df7 \
  --data-file=-

# Redeploy Cloud Run
gcloud run services update projeto-cirurgiao-backend \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --set-secrets=CLOUDFLARE_API_TOKEN=CLOUDFLARE_API_TOKEN:latest
```

- [ ] Token antigo revogado.
- [ ] Novo token gerado com escopo mínimo.
- [ ] Secret Manager atualizado.
- [ ] Cloud Run redeployado.
- [ ] Smoke: Upload um vídeo teste via Stream API direto no dashboard OU via backend — deve funcionar com token novo.

### 2.4 — Limpar arquivos com credenciais do repo — 20 min

Após confirmar que 2.2 e 2.3 estão funcionais em prod:

```bash
cd /d/dashboard/next-shadcn-admin-dashboard-main  # repo principal
git checkout main
git pull origin main

# 1. Substitui valores por placeholders
cat > backend-api/.env.proxy.example <<'EOF'
# Template para conectar em cirurgiao-db via Cloud SQL Auth Proxy.
# NÃO committar valor real aqui. Preencher localmente com:
# gcloud secrets versions access latest --secret=DATABASE_URL
POSTGRES_CONNECTION_STRING="postgresql://app_cirurgiao:<ROTATE_ME>@127.0.0.1:5432/projeto_cirurgiao"
EOF

# 2. Placeholder no .env.example
# Edit manual — substituir linhas 34-35:
# CLOUDFLARE_ACCOUNT_ID="<your_cloudflare_account_id>"
# CLOUDFLARE_API_TOKEN="<your_cloudflare_api_token>"

git add backend-api/.env.proxy.example .env.example
git commit -m "security: sanitize .env.example and .env.proxy.example with placeholders (post-rotation)"
git push origin main
```

- [ ] Arquivos saneados.
- [ ] Commit pushed.

### 2.5 — git filter-repo pra remover credenciais do histórico — 30 min

**Atenção**: reescreve histórico. Requer coordenação com todos os devs que tenham clone local.

```bash
# Backup do repo antes de reescrever
cp -r /d/dashboard/next-shadcn-admin-dashboard-main /d/dashboard/next-shadcn-admin-dashboard-main.bkp

cd /d/dashboard/next-shadcn-admin-dashboard-main
git filter-repo \
  --path backend-api/.env.proxy.example \
  --path .env.example \
  --invert-paths

# Re-adicionar remote (filter-repo remove)
git remote add origin https://github.com/projeto-cirurgiao-marcelo/projeto-cirurgiao.git

# Re-adicionar arquivos sanitizados (eles foram removidos do histórico)
git pull origin main --allow-unrelated-histories  # ou reinsere os arquivos sanitizados manualmente e commita
```

- [ ] Histórico reescrito confirmado (`git log -p -- backend-api/.env.proxy.example` não mostra valores antigos).
- [ ] **Force-push coordenado**:
  ```bash
  # ATENÇÃO: com autorização explícita
  git push origin main --force
  git push origin --all --force
  git push origin --tags --force
  ```
- [ ] Notificar todos os devs no Slack/Discord: "Repo teve filter-repo. Reclone necessário: `git clone` fresh ou `git fetch --all && git reset --hard origin/main`".
- [ ] Se tiver CI/mirrors, atualizar URLs/credenciais deles.

### 2.6 — Deploy novo código (release/v1.0) — 20 min

Assume que `release/v1.0` já foi mergeada em `main` ANTES do filter-repo. Se não, fazer o merge primeiro.

```bash
# Trigger Cloud Build (se configurado) ou manual:
cd backend-api
gcloud run deploy projeto-cirurgiao-backend \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --source .

# Run migrations pending (soft delete + audit)
gcloud run jobs execute run-migrations \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1
```

- [ ] Deploy backend OK (`gcloud run revisions list` mostra a nova revision).
- [ ] `prisma migrate deploy` em prod OK (migrations soft delete aplicadas).
- [ ] Web deploy via Vercel (push em main dispara auto-deploy).
- [ ] Mobile EAS production build (1.3 já fez preview; agora:
  ```bash
  eas build --profile production --platform android
  eas build --profile production --platform ios
  ```
  )

### 2.7 — QUEUE_ENABLED continua `false` no go-live — 1 min (só conferir)

**Decisão do Gustav**: flag desligada no go-live público, mesmo com Memorystore já provisionado em §1.3.

```bash
# Conferir que está desligada
gcloud run services describe projeto-cirurgiao-backend \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --format='value(spec.template.spec.containers[0].env)' | grep -i queue
# Esperado: QUEUE_ENABLED=false (ou env var ausente = default false)
```

- [ ] Confirmado que `QUEUE_ENABLED=false` (ou não setado).
- [ ] Backend em modo síncrono inline (resposta `202` com `status: 'completed'` imediato).

**Flip da flag fica pra §2.7-alt abaixo**, 1-2 semanas pós go-live.

### 2.7-alt — Flip QUEUE_ENABLED=true (janela operacional, 1-2 SEMANAS PÓS go-live) — 30 min

**Não executar no go-live day.** Esta seção é um marcador — executar depois do sistema estar estabilizado em prod, em janela operacional separada.

Pré-requisitos antes de flipar:
- [ ] Go-live concluído e estável por pelo menos 1 semana (zero regressão crítica).
- [ ] Memorystore provisionado (§1.3 já feito).
- [ ] Staging configurado igual prod (Memorystore test + `QUEUE_ENABLED=true` em staging).
- [ ] Smoke contra staging com flag `true` — gerar summary, quiz, ingest PDF, caption; validar que todos chegam em `completed` via polling no `GET /api/v1/jobs/:id`.
- [ ] Equipe disponível pra rollback caso algo dê errado.

Execução:

```bash
# 1. Atualizar env var em Cloud Run
gcloud run services update projeto-cirurgiao-backend \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1 \
  --update-env-vars QUEUE_ENABLED=true

# 2. Aguardar Cloud Run subir nova revision (~30s)
# 3. Smoke imediato:
curl -s -X POST https://<PROD_URL>/api/v1/videos/<id>/summaries/generate \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" -d '{}' | jq
# Esperado: { jobId: "<uuid>", status: "queued" }  (não mais "completed" inline)

# 4. Polling pra confirmar que fila está processando:
curl -s https://<PROD_URL>/api/v1/jobs/<jobId> \
  -H "Authorization: Bearer <admin_token>" | jq
# Transições esperadas: queued → active → completed (~segundos a minutos)
```

- [ ] `QUEUE_ENABLED=true` aplicado em prod.
- [ ] Smoke de 1 job end-to-end OK.
- [ ] Admin endpoint `GET /api/v1/jobs/counts` mostra `{ waiting: 0, active: 0-N, completed: crescendo }` nas primeiras horas.
- [ ] Nenhum erro 5xx nos logs Cloud Run após flip.
- [ ] Frontend (web + mobile) continua funcionando — `waitForJob` detecta shape `queued` e pollar transparentemente.

**Rollback se algo falhar**: 1 comando, sem redeploy:

```bash
gcloud run services update projeto-cirurgiao-backend \
  --update-env-vars QUEUE_ENABLED=false \
  --region=southamerica-east1
```

Volta pro modo inline síncrono. Memorystore continua provisionado pra próxima tentativa.

### 2.8 — Publicar nas lojas — 30 min

- [ ] Upload `.ipa` production no App Store Connect.
- [ ] Upload `.apk`/`.aab` production no Google Play Console.
- [ ] Submeter pra review (TestFlight Internal ou Play Internal testing track).
- [ ] Preencher metadata (1.5).
- [ ] Submeter em modo privado ou público (sua escolha).

---

## Fase 3 — Post-release (primeiras 24h)

### 3.1 — Monitoramento ativo — contínuo

- [ ] Cloud Run logs: `gcloud logging read "resource.type=cloud_run_revision" --limit=50` — verificar zero erros 5xx em picos.
- [ ] Cloud SQL: query time P95 abaixo de 200ms.
- [ ] Se `QUEUE_ENABLED=true`: `GET /api/v1/jobs/counts` (admin only) — jobs não estão empilhando.
- [ ] Web Vercel Analytics: visitas, web vitals (LCP, CLS, FID).
- [ ] Mobile: watchar crash reports (se Sentry estiver ativo — atualmente não está).

### 3.2 — Smoke diário em staging + prod — 30 min

- [ ] Rodar `03-smoke-test-playbook.md` Blocos A + B + C em modo "happy path" (não exaustivo).
- [ ] Registrar tempos de resposta.
- [ ] Qualquer regressão: decidir revert (ver `02-merge-plan.md` Rollback plan) vs hotfix em branch dedicada.

### 3.3 — Validação de segurança — 15 min

```bash
# Verificar que filter-repo foi efetivo
cd /d/dashboard/next-shadcn-admin-dashboard-main
git log --all -S "JuGZqDmPOnYnp5zi1mBNBNTMBgJDL23O" -- :/ | head -5
# Esperado: zero output (senha não aparece mais no histórico)

git log --all -S "ff0RmWoqFUvYU9Mshsydos5kO7FgBHUhbKF52v2p" -- :/ | head -5
# Esperado: zero output
```

- [ ] Filter-repo efetivo (zero match pra senhas/tokens antigos).
- [ ] `.env.example` e `.env.proxy.example` com placeholders.
- [ ] Tokens novos funcionando em prod (smoke 2.2/2.3).

### 3.4 — Comunicar release — 30 min

- [ ] Notificar stakeholders (Marcelo, equipe veterinária, beta testers).
- [ ] Abrir canal de feedback (link pro Slack/Discord/form).
- [ ] Popular release notes nas 3 lojas (Apple, Google) + blog/site se aplicável.

### 3.5 — Tag final

Se smoke das primeiras 24h passou sem regressão:

```bash
cd /d/dashboard/next-shadcn-admin-dashboard-main
git tag -a v1.0.0 -m "Release v1.0 — Projeto Cirurgião"
git push origin v1.0.0
```

- [ ] Tag `v1.0.0` criada e pushed.

---

## Resumo de tempo por fase

| Fase | Duração | Pode paralelizar? |
|---|---|---|
| 1.1 CVE web (5 passos, 2 checkpoints) | 50 min | Sim (com 1.2) |
| 1.2 CVE mobile + EAS preview (5 passos) | 70 min | Sim (com 1.1) |
| 1.3 Memorystore (OBRIGATÓRIO) | 30 min | Não |
| 1.4 CORS | 15 min | Sim |
| 1.5 Assets loja | 3h | Sim (pode ser antes mesmo) |
| 1.6 Seed staging | 15 min | Sim |
| **Fase 1 total** | ~5h30min | — |
| 2.1 Backup | 10 min | Não |
| 2.2 Senha banco | 20 min | Não |
| 2.3 Token Cloudflare | 30 min | Não |
| 2.4 Sanitizar arquivos | 20 min | Não |
| 2.5 filter-repo | 30 min | Não |
| 2.6 Deploy código | 20 min | Não |
| 2.7 Conferir QUEUE_ENABLED=false | 1 min | Não |
| 2.8 Publicar lojas | 30 min | Não |
| **Fase 2 total** | ~2h45min | — |
| 3.1-3.5 Monitoramento + validação + comunicação | ~1h30min (+ monitoramento contínuo) | — |
| **2.7-alt QUEUE_ENABLED flip (1-2 sem pós go-live)** | 30 min | Janela dedicada |

**Total go-live day**: 4-5 horas de trabalho focado. Reservar tarde inteira.

**Janela pós-release (1-2 semanas depois)**: 30 min pra flip da fila, agendar separadamente.

---

## Pontos de não-retorno

Ações que **não dá pra reverter** facilmente uma vez executadas. Tomar pausa mental antes:

- **2.2 Rotação senha `app_cirurgiao`** → nova senha em Secret Manager. Se perder a senha salva em 2.2, recuperação é via `gcloud sql users set-password` de novo.
- **2.3 Revogar token Cloudflare antigo** → se novo token tiver scope errado, re-criar com scope correto é OK, mas **não recriar o token antigo** (ele foi revogado).
- **2.5 filter-repo + force-push** → histórico reescrito. Todos os devs com clone precisam reclonar. Não dá pra "desfazer" facilmente (só restaurando do backup).
- **2.8 Submit na App Store** → uma vez submetido, review do Apple pode levar 1-7 dias. Rejection implica novo build/submit.

Se qualquer desses falhar, ver `02-merge-plan.md` Rollback plan + considerar adiar o go-live 24h.

---

## Contatos de emergência (pra Gustav popular)

- **GCP Support**: [link do console]
- **Cloudflare Support**: [link]
- **Apple Developer Support**: [link]
- **Google Play Console Support**: [link]
- **Dev on-call**: [quem estiver de plantão]
