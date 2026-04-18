/**
 * Secrets loader — hydrates process.env from Google Cloud Secret Manager
 * before Nest bootstraps. Runs once, at startup.
 *
 * Development / local: do nothing (env vars come from .env as before).
 * Production: for each registered mapping (env var name -> secret name),
 * fetch the latest secret version and assign it to process.env when the
 * variable is not already set. Existing env vars win so that Cloud Run
 * `--set-secrets` or manual overrides keep working.
 *
 * The fetch is done lazily via @google-cloud/secret-manager using ADC, so
 * the Cloud Run service account only needs `roles/secretmanager.secretAccessor`
 * on the target secrets.
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/**
 * Registry of env var names the backend expects to read from Secret Manager
 * when running in production. The secret name defaults to the env var name
 * (same string, lowercased with underscores -> dashes) unless overridden.
 *
 * Keep this list in sync with docs/DEPLOY.md.
 */
export interface SecretMapping {
  /** Environment variable name read by the app via ConfigService */
  envVar: string;
  /** Secret name in Google Cloud Secret Manager (defaults to envVar) */
  secretName?: string;
  /** If true, the app cannot boot without this secret. */
  required?: boolean;
}

export const DEFAULT_SECRET_MAPPINGS: SecretMapping[] = [
  // Database — still placeholder until app_cirurgiao password is rotated.
  { envVar: 'DATABASE_URL', required: true },

  // JWT — rotated independently.
  { envVar: 'JWT_SECRET', required: true },
  { envVar: 'JWT_REFRESH_SECRET', required: true },

  // Cloudflare (Stream + R2). Stream is being phased out in favour of R2 HLS,
  // but both credentials are needed while the migration is in flight.
  { envVar: 'CLOUDFLARE_API_TOKEN' },
  { envVar: 'CLOUDFLARE_ACCOUNT_ID' },
  { envVar: 'CLOUDFLARE_R2_ACCESS_KEY_ID' },
  { envVar: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY' },
  { envVar: 'CLOUDFLARE_STREAM_CUSTOMER_CODE' },

  // Vertex AI / Gemini — auth is via ADC (Cloud Run SA), so no API key in
  // Secret Manager by default. VERTEX_API_KEY is here only as an escape hatch
  // for environments that want explicit key auth; it is not required.
  { envVar: 'VERTEX_API_KEY' },

  // Firebase Admin — in production the service account is injected as a JSON
  // blob via this env var. FIREBASE_SERVICE_ACCOUNT_PATH stays on env for
  // local/dev fallback.
  { envVar: 'FIREBASE_SERVICE_ACCOUNT_KEY' },

  // BullMQ / Redis — optional (QUEUE_ENABLED=false is a valid prod
  // config until Cloud Memorystore is provisioned). When the queue is
  // enabled, REDIS_URL (rediss:// with AUTH) is the preferred shape for
  // GCP Memorystore; REDIS_PASSWORD is the fallback for the
  // host/port/password trio.
  { envVar: 'REDIS_URL' },
  { envVar: 'REDIS_PASSWORD' },
];

export interface LoadSecretsOptions {
  /** Force loading even when NODE_ENV !== 'production' (tests / manual runs). */
  forceLoad?: boolean;
  /** Override the default mappings (mostly for tests). */
  mappings?: SecretMapping[];
  /** Logger-like callback (defaults to console). */
  log?: (msg: string) => void;
  /** Error-logger callback (defaults to console.error). */
  logError?: (msg: string, err?: unknown) => void;
}

/**
 * Load secrets into process.env. Returns a summary for observability.
 * Swallows per-secret errors unless the mapping is `required: true`, in which
 * case it throws to abort startup.
 */
export async function loadSecretsIntoEnv(
  options: LoadSecretsOptions = {},
): Promise<{ loaded: string[]; skipped: string[]; errors: string[] }> {
  const log = options.log ?? ((msg) => console.log(`[secrets] ${msg}`));
  const logError =
    options.logError ?? ((msg, err) => console.error(`[secrets] ${msg}`, err));

  const isProd = process.env.NODE_ENV === 'production';
  const shouldLoad = options.forceLoad || isProd;

  if (!shouldLoad) {
    log('NODE_ENV != production — skipping Secret Manager hydration');
    return { loaded: [], skipped: [], errors: [] };
  }

  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    'projeto-cirurgiao-e8df7';

  const mappings = options.mappings ?? DEFAULT_SECRET_MAPPINGS;
  const client = new SecretManagerServiceClient();

  const loaded: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const mapping of mappings) {
    const { envVar } = mapping;
    if (process.env[envVar]) {
      skipped.push(`${envVar} (already set in env)`);
      continue;
    }

    const secretName = mapping.secretName ?? envVar;
    const resourcePath = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    try {
      const [version] = await client.accessSecretVersion({ name: resourcePath });
      const payload = version.payload?.data?.toString();
      if (!payload) {
        const msg = `secret ${secretName} returned empty payload`;
        errors.push(msg);
        if (mapping.required) {
          throw new Error(msg);
        }
        logError(msg);
        continue;
      }
      process.env[envVar] = payload;
      loaded.push(envVar);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${secretName}: ${message}`);
      if (mapping.required) {
        logError(`required secret ${secretName} failed to load`, err);
        throw err;
      }
      logError(`optional secret ${secretName} failed to load`, err);
    }
  }

  log(
    `Secret Manager hydration complete — loaded: ${loaded.length}, skipped: ${skipped.length}, errors: ${errors.length}`,
  );
  return { loaded, skipped, errors };
}
