# Deploy guide — backend-api

This document covers the production deployment path for `backend-api` on
Cloud Run, and in particular the use of **Google Cloud Secret Manager** for
all credentials. Every secret the app needs should be in Secret Manager; no
credential should live in `cloud-run-env.yaml`, the repo, or a service
account JSON on disk.

## 1. Secrets inventory

| Env var | Secret name (GCP) | Rotated by | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | `DATABASE_URL` | Gustav | **PLACEHOLDER** — current value embeds the `app_cirurgiao` password that leaked into `backend-api/.env.proxy.example`. The secret must be created now so Cloud Run wiring is in place; the **value** has to be updated via `gcloud secrets versions add DATABASE_URL` once the password is rotated. See §4. |
| `JWT_SECRET` | `JWT_SECRET` | Gustav | Sign access tokens. Rotate on suspected breach. |
| `JWT_REFRESH_SECRET` | `JWT_REFRESH_SECRET` | Gustav | Sign refresh tokens. Rotate independently from `JWT_SECRET`. |
| `CLOUDFLARE_API_TOKEN` | `CLOUDFLARE_API_TOKEN` | Gustav | Cloudflare Stream + R2 management. |
| `CLOUDFLARE_ACCOUNT_ID` | `CLOUDFLARE_ACCOUNT_ID` | Gustav | Not strictly a secret, but kept here for consistency. |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | `CLOUDFLARE_R2_ACCESS_KEY_ID` | Gustav | R2 S3-compat API. |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Gustav | R2 S3-compat API. |
| `CLOUDFLARE_STREAM_CUSTOMER_CODE` | `CLOUDFLARE_STREAM_CUSTOMER_CODE` | Gustav | Stream customer code. Not secret per-se but opaque. |
| `VERTEX_API_KEY` | `VERTEX_API_KEY` | Gustav (optional) | **Empty in production.** Vertex AI auth in prod uses ADC via the Cloud Run service account. Only populate this secret if an environment needs explicit API-key auth. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `FIREBASE_SERVICE_ACCOUNT_KEY` | Gustav | Full service-account JSON (single line). Used by `firebase-admin.service.ts` when no key file is mounted. |

Anything else the backend reads (`GOOGLE_CLOUD_PROJECT_ID`,
`GOOGLE_CLOUD_LOCATION`, `VERTEX_EMBEDDING_MODEL`, CORS origins, port, etc.)
is **not** a secret and stays as plain env vars in the Cloud Run config.

## 2. How the app consumes secrets at runtime

`backend-api/src/main.ts` calls `loadSecretsIntoEnv()` (in
`src/config/secrets/secrets-loader.ts`) **before** the Nest app is
instantiated. That function:

1. Does nothing unless `NODE_ENV === 'production'` (or
   `LoadSecretsOptions.forceLoad` is set).
2. For each mapping in `DEFAULT_SECRET_MAPPINGS`, calls
   `secretmanager.v1.accessSecretVersion({ name: '…/secrets/<name>/versions/latest' })`
   and writes the payload into `process.env[envVar]` — but **only** when
   the env var is not already set. This means Cloud Run's `--set-secrets`
   and local `.env` files always win.
3. `required: true` mappings abort boot if they fail.

Downstream code keeps using `ConfigService.get('JWT_SECRET')` etc., so no
service-level changes are needed.

## 3. Creating / updating secrets in GCP

```bash
# One-time bootstrap: create a secret with automatic replication
gcloud secrets create JWT_SECRET \
  --project=projeto-cirurgiao-e8df7 \
  --replication-policy=automatic

# Upload (or rotate) the value
printf '%s' "<NEW_VALUE>" | gcloud secrets versions add JWT_SECRET \
  --project=projeto-cirurgiao-e8df7 \
  --data-file=-

# Grant the Cloud Run runtime SA access (do this once per secret)
gcloud secrets add-iam-policy-binding JWT_SECRET \
  --project=projeto-cirurgiao-e8df7 \
  --member=serviceAccount:<CLOUD_RUN_SA>@projeto-cirurgiao-e8df7.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

Repeat for every row in §1.

### Placeholder: `DATABASE_URL`

```bash
# Create the secret container now so Cloud Run wiring exists.
gcloud secrets create DATABASE_URL \
  --project=projeto-cirurgiao-e8df7 \
  --replication-policy=automatic

# Store a deliberately non-working placeholder until Gustav rotates the password.
printf 'postgresql://app_cirurgiao:ROTATE_ME@/projeto_cirurgiao?host=/cloudsql/projeto-cirurgiao-e8df7:southamerica-east1:cirurgiao-db' \
  | gcloud secrets versions add DATABASE_URL \
    --project=projeto-cirurgiao-e8df7 \
    --data-file=-

# After rotation:
printf 'postgresql://app_cirurgiao:<NEW_PASSWORD>@/projeto_cirurgiao?host=/cloudsql/projeto-cirurgiao-e8df7:southamerica-east1:cirurgiao-db' \
  | gcloud secrets versions add DATABASE_URL \
    --project=projeto-cirurgiao-e8df7 \
    --data-file=-
```

Until that rotation happens, production keeps reading `DATABASE_URL` from
the Cloud Run env var (as today), because the loader skips env vars that
are already set. **Do not** switch Cloud Run to the Secret Manager wiring
until the secret contains the rotated password, otherwise the app will try
to use `ROTATE_ME` and fail to connect.

## 4. Wiring the secrets into Cloud Run

Option A — let the loader pull at boot (recommended). This is what
`main.ts` does by default. All you need is IAM access on each secret (see
§3) and `NODE_ENV=production` on the service.

Option B — let Cloud Run inject the env var directly. This bypasses the
loader entirely for a specific secret. Either form is supported.

```bash
gcloud run services update projeto-cirurgiao-backend \
  --region=southamerica-east1 \
  --set-secrets=JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,CLOUDFLARE_API_TOKEN=CLOUDFLARE_API_TOKEN:latest,CLOUDFLARE_ACCOUNT_ID=CLOUDFLARE_ACCOUNT_ID:latest,CLOUDFLARE_R2_ACCESS_KEY_ID=CLOUDFLARE_R2_ACCESS_KEY_ID:latest,CLOUDFLARE_R2_SECRET_ACCESS_KEY=CLOUDFLARE_R2_SECRET_ACCESS_KEY:latest,CLOUDFLARE_STREAM_CUSTOMER_CODE=CLOUDFLARE_STREAM_CUSTOMER_CODE:latest,FIREBASE_SERVICE_ACCOUNT_KEY=FIREBASE_SERVICE_ACCOUNT_KEY:latest
```

Leave `DATABASE_URL` on `--set-env-vars` until the placeholder rotation is
done; then migrate it to `--set-secrets=DATABASE_URL=DATABASE_URL:latest`
and remove the plaintext env var.

## 5. Leaked credentials tracker

These files currently hold credentials in plaintext **inside the repo**
and must be removed / rewritten once the placeholder-rotation cycle
completes:

- `backend-api/.env.proxy.example` — contains the live
  `app_cirurgiao` password. **Keep ignored-from-delete during the sprint**
  but plan a git-history cleanup (or at minimum a password rotation) before
  the repo is made public.
- `cloud-run-env.yaml` — gitignored today; do not reintroduce.

Anyone opening a PR must ensure no new plaintext secret is added. The
`deploy-artifact-registry.ps1` script in `backend-api/` is the main place
to audit.

### Post-rotation cleanup (HISTORY REWRITE)

Once the new `app_cirurgiao` password is active in Cloud Run and verified:

1. `git rm backend-api/.env.proxy.example` (or replace with a template
   stripped of credentials).
2. With explicit Gustav authorization, run `git filter-repo` to remove
   the file from history:
   ```bash
   git filter-repo --path backend-api/.env.proxy.example --invert-paths
   ```
3. Coordinate a force-push with every dev holding a local clone — they
   need to re-clone after the rewrite.
4. Notify any downstream integration (CI/CD, mirrors).

Rationale: even with the password rotated, the compromised value in
history reveals naming/format patterns and can inform future attacks.
Cleaning is hygiene.

## 6. Database migration policy

- `prisma db push` is FORBIDDEN against any environment outside local dev.
  It causes drift between the real schema and `_prisma_migrations` (see
  the `hlsUrl` incident on 2026-04-08 and the broader orphan-tables
  reconciliation documented in the commit that introduced
  `20260409_retroactive_orphan_tables`).
- The only authorized path to apply schema in staging/prod is
  `prisma migrate deploy`, run from the deploy pipeline (Cloud Build or a
  manual `prisma migrate deploy` invocation by someone with DB-owner
  privileges).
- Migrations generated locally MUST be committed before the deploy.
  Never generate a migration on top of a pending deploy.
- If drift is detected: `prisma migrate resolve --applied <name>` to
  reconcile without re-applying the SQL.
- The default app user (`app_cirurgiao`) does NOT have DDL privileges on
  every table in prod; running `prisma migrate deploy` as that user will
  fail with `ERROR: must be owner of table ...`. Use the postgres
  superuser (or the original table owner) for migrations. Current plan:
  rotate migration duties via the Cloud SQL superuser credentials that
  Gustav controls.
- **Table ownership rule**: every table in `projeto_cirurgiao` must be
  owned by `postgres`, never by `app_cirurgiao`. `db push` executed as
  the app user creates tables owned by `app_cirurgiao`, which later
  blocks `migrate deploy` — the superuser cannot `ALTER` ownership of
  tables owned by another role without first granting that role to
  itself. Surfaced during the pgvector deploy: `knowledge_chunks` was
  stuck on `app_cirurgiao` because of an old `db push`. Fix recipe
  when a table ends up with the wrong owner:
  ```sql
  GRANT "app_cirurgiao" TO postgres;
  ALTER TABLE <table_name> OWNER TO postgres;
  ```
  After the fix, revoke the grant (`REVOKE "app_cirurgiao" FROM postgres`)
  if the superuser should not carry the app role permanently.
- Local dev: pgvector extension must exist. `scripts/init-db.sql` runs
  `CREATE EXTENSION IF NOT EXISTS vector` on first boot of the compose
  container. Prisma's shadow DB also needs pgvector — `SHADOW_DATABASE_URL`
  in the project-root `.env` points at `prisma_shadow` on the same
  container; create it once with `CREATE DATABASE prisma_shadow; \c prisma_shadow; CREATE EXTENSION vector;`.
- When the compose `postgres` service switches images (e.g. `postgres:15-alpine`
  → `pgvector/pgvector:pg15`), developers need to
  `docker-compose down && docker-compose pull && docker-compose up -d`
  and, if the volume was reset, re-run `npx prisma migrate deploy` and
  any seed scripts.

## 7. Local development

Local dev keeps using `.env` (gitignored). No Secret Manager calls are
made. If you want to exercise the loader locally against real secrets,
set `NODE_ENV=production` and run the service — ADC will be used, so
`gcloud auth application-default login` first.
