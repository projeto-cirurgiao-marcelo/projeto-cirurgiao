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

## 6. Local development

Local dev keeps using `.env` (gitignored). No Secret Manager calls are
made. If you want to exercise the loader locally against real secrets,
set `NODE_ENV=production` and run the service — ADC will be used, so
`gcloud auth application-default login` first.
