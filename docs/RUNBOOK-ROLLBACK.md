# RUNBOOK — Rollback de deploy (release controlado)

Procedimento de reversão por componente para o go-live controlado (P1.12).

> **Regra de ouro:** rollback de **aplicação** (imagem/deploy) **não** reverte
> **banco de dados**. Migrations Prisma são *forward-only*. Se um deploy incluiu
> migration destrutiva (DROP/ALTER que perde dados), voltar a revision antiga
> **não** desfaz o schema/dados — ver §6.
>
> Os comandos abaixo são **modelos** para o operador rodar durante um incidente
> real (com autorização). Nada aqui deve ser executado por agente automatizado.
> Substitua `REVISION_NAME`/`<...>` pelos valores reais no momento.

Domínios/serviços canônicos:

| Componente | Alvo | Região/Plataforma |
|---|---|---|
| Backend API | Cloud Run `projeto-cirurgiao-api` | `southamerica-east1` (projeto `projeto-cirurgiao-e8df7`) |
| Video processor | Cloud Run `video-processor` | `europe-west1` |
| Web | **Vercel** (canônica) | Firebase Hosting = legado/redirect (§3) |
| Mobile | EAS (OTA + binário) | canais `development`/`preview`/`production` |
| Workers | Cloudflare `r2-browser`, `video-processor-trigger` | Cloudflare |
| Banco | Cloud SQL `cirurgiao-db` (Postgres) | `southamerica-east1` |

---

## 1. Backend — Cloud Run (`projeto-cirurgiao-api`)

Cloud Run mantém revisions imutáveis; rollback = mandar 100% do tráfego para a
revision anterior sã.

**1. Listar revisions (mais recente primeiro):**
```bash
gcloud run revisions list \
  --service=projeto-cirurgiao-api \
  --region=southamerica-east1 \
  --project=projeto-cirurgiao-e8df7
```

**2. Voltar 100% do tráfego para a revision anterior sã:**
```bash
gcloud run services update-traffic projeto-cirurgiao-api \
  --region=southamerica-east1 \
  --project=projeto-cirurgiao-e8df7 \
  --to-revisions REVISION_NAME=100
```
> Última revision-boa conhecida registrada no checklist: **`00092-7zn`**
> (confirmar que ainda é a desejada antes de usar).

**3. Confirmar health:**
```bash
curl -fsS https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app/api/v1/health
# Esperado: {"status":"ok","timestamp":"..."}
```

**Notas:**
- ⚠️ **Migrations são forward-only** (`prisma migrate deploy` no cold start +
  Job `cirurgiao-api-migrator`). Voltar a imagem **não** reverte schema. Se a
  revision nova aplicou migration incompatível com a revision antiga, o rollback
  de app pode falhar em runtime — ver §6.
- Secrets vêm do Secret Manager; rollback de tráfego não mexe em secret.

---

## 2. Video processor — Cloud Run (`video-processor`, `europe-west1`)

Mesmo padrão do §1, região diferente.

```bash
gcloud run revisions list \
  --service=video-processor \
  --region=europe-west1 \
  --project=projeto-cirurgiao-e8df7

gcloud run services update-traffic video-processor \
  --region=europe-west1 \
  --project=projeto-cirurgiao-e8df7 \
  --to-revisions REVISION_NAME=100
```
> Última revision-boa conhecida registrada no checklist: **`00015-v8d`**.

**Health / verificação:**
```bash
curl -fsS https://<video-processor-url>/  # ou o endpoint de health do serviço
```

**Notas:**
- ⚠️ **Jobs em andamento:** um encode pode estar rodando na hora do rollback.
  O pipeline é **idempotente por playlist** — reprocessar o mesmo source
  sobrescreve o output em R2 sem duplicar. Após o rollback, reenviar o evento
  (ou reprocessar via admin) é seguro.
- Disparo vem do Worker `video-processor-trigger` (§5); rollback do processor
  não muda o emissor.

---

## 3. Web — Vercel (canônica)

**Rollback preferencial (painel Vercel — Instant Rollback):**
1. Vercel → projeto do `frontend-web` → aba **Deployments**.
2. Localizar o último deploy **Ready** bom (anterior ao regressivo).
3. Menu `⋯` → **Instant Rollback** (ou **Promote to Production**).
4. Confirmar — a Vercel repromove aquele build imutável para produção em segundos.

**Verificação:**
```bash
curl -I https://app.projetocirurgiao.app   # ou a URL *.vercel.app de produção
# Conferir HTTP 200 + headers de segurança (CSP etc., ver frontend-web/docs/DEPLOY.md §2.1)
```

**Notas:**
- **Firebase Hosting NÃO é rota de rollback web.** Está desativado como host
  (só redirect 301 → domínio canônico; ver `frontend-web/docs/DEPLOY.md §0`).
  Nunca "voltar" o web reativando Firebase Hosting.
- Cada deploy Vercel é imutável → rollback é sempre repromover um build antigo,
  nunca rebuild.

---

## 4. Mobile — EAS

> **Ciclo atual (go-live controlado iOS-only, device interno):** como não há
> distribuição pública, o rollback mobile é simples — **reinstalar o build iOS
> preview anterior** no device ou **remover o app** do device interno. As opções
> de OTA/stores/TestFlight abaixo ficam **fora do escopo deste ciclo** e valem
> quando entrar distribuição pública.

Distinguir **OTA** de **binário** — são caminhos de rollback diferentes:

### 4a. EAS Update (OTA) — mudanças só de JS/assets
Se a regressão veio de um `eas update` (JS/assets, sem código nativo novo):
```bash
# Ver histórico de updates do canal
eas update:list --branch production

# Opção A: republicar o update anterior bom (roll back = novo update apontando pro estado antigo)
eas update:republish --group <UPDATE_GROUP_ID>
```
> OTA propaga no próximo cold start do app dos usuários (não instantâneo em todos).

### 4b. Build binário — mudanças nativas / config plugin
- **Não há rollback instantâneo** de binário já publicado.
- ⚠️ **Mudança nativa ou de config plugin** (ex.: Sentry RN, expo-video,
  permissões) **exige novo build** — OTA **não** cobre. Se a regressão é nativa,
  OTA não resolve.
- Reverter = promover/reenviar o **build anterior** no canal de distribuição:
  - iOS: TestFlight/App Store Connect → build anterior.
  - Android: Play Console → **internal track** (perfil `preview`/`production`)
    → promover release anterior.

---

## 5. Cloudflare Workers

Dois workers: `r2-browser` (admin de arquivos) e `video-processor-trigger`
(eventos R2 → Queue → dispara o §2).

```bash
# Listar deployments de um worker
npx wrangler deployments list --name <worker-name>

# Rollback para um deployment anterior (se suportado pela versão do wrangler)
npx wrangler rollback --name <worker-name> [DEPLOYMENT_ID]
```

**Fallback (sempre funciona):** redeploy do commit anterior bom:
```bash
git checkout <commit-bom> -- cloudflare-workers/<worker>/
cd cloudflare-workers/<worker> && npx wrangler deploy
```

**Notas:**
- ⚠️ **Débito conhecido:** o `video-processor-trigger` versionado vive em
  `cloudflare-workers/video-processor-trigger/`, mas o **deploy atual** sai de
  `video-pipeline/cloudflare-worker/` (gitignored). Confirmar de qual cópia o
  deploy vivo foi feito antes de redeployar (ver checklist P0.9).
- Secrets do worker (`WEBHOOK_SECRET`, `CDN_BASE_URL`) ficam via
  `wrangler secret put` — rollback de código não mexe nos secrets.

---

## 6. Banco / Prisma — **rollback de app ≠ rollback de banco**

Seção explícita porque é o erro mais perigoso num incidente.

- **Migrations Prisma são forward-only.** `prisma migrate deploy` aplica; não há
  "migrate down" automático em produção.
- **Voltar a revision antiga do backend NÃO reverte o schema.** Se o deploy ruim
  rodou uma migration **destrutiva** (DROP COLUMN/TABLE, ALTER que perde dados),
  o rollback de app deixa a app antiga rodando contra um schema já mutilado →
  pode falhar ou corromper.
- **Regra pro go-live controlado:** **evitar migrations destrutivas.** Preferir
  aditivas (nullable/novas colunas), com expand-then-contract em duas fases.
- **Se uma migration destrutiva for inevitável:**
  1. **Backup Cloud SQL ANTES** (export/snapshot de `cirurgiao-db` —
     ver `docs/` de backup / `project_db_backup_clone`).
  2. Plano de restore **manual** documentado e testado.
  3. Rollback = restore do backup + redeploy da revision compatível, **nunca**
     só o `update-traffic`.
- Reconciliar drift (sem re-aplicar SQL): `prisma migrate resolve --applied <name>`
  (ver `docs/DEPLOY.md §6`).

---

## 7. Ordem sugerida num incidente

1. **Identificar a camada** (web / backend / video / worker / banco).
2. Se **banco não mudou** neste release → rollback do componente é seguro e rápido
   (§1–§5).
3. Se **houve migration** → parar, avaliar §6 antes de qualquer `update-traffic`.
4. Rollback → **verificar health** (curl `/api/v1/health`, abrir o web, smoke de login/player).
5. Registrar o incidente e a revision/deploy restaurados.
