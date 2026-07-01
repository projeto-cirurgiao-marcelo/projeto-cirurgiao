/**
 * Sentry error tracking (mobile) — no-op quando EXPO_PUBLIC_SENTRY_DSN ausente.
 *
 * P1.2 + P1.16: observabilidade mínima de crashes sem exigir DSN real nem build
 * agora, e sem vazar PII/segredos (Authorization, tokens, emails) nos eventos.
 */
import * as Sentry from '@sentry/react-native';

const SENSITIVE_HEADERS = ['authorization', 'cookie'];

const SENSITIVE_FIELDS = [
  'authorization',
  'password',
  'token',
  'refreshtoken',
  'firebasetoken',
  'jwt',
  'secret',
  'email',
];

const REDACTED = '[Redacted]';

export function isSentryEnabled(): boolean {
  return !!process.env.EXPO_PUBLIC_SENTRY_DSN;
}

/** Inicializa o Sentry se houver DSN público. Retorna true se ativou. */
export function initSentry(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
  return true;
}

function redactHeaders(headers: unknown): unknown {
  if (!headers || typeof headers !== 'object') return headers;
  const out: Record<string, unknown> = { ...(headers as Record<string, unknown>) };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) out[key] = REDACTED;
  }
  return out;
}

/** Redige recursivamente campos sensíveis por nome de chave. Exportado p/ teste. */
export function scrubDeep(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_FIELDS.includes(k.toLowerCase())
        ? REDACTED
        : scrubDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Sanitiza o evento: headers, body e contextos. Exportado p/ teste. */
export function scrubEvent(event: any, _hint?: unknown): any {
  if (!event) return event;
  if (event.request) {
    event.request.headers = redactHeaders(event.request.headers);
    delete event.request.cookies;
    delete event.request.data;
  }
  if (event.extra) event.extra = scrubDeep(event.extra);
  if (event.contexts) event.contexts = scrubDeep(event.contexts);
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b: any) =>
      b && b.data ? { ...b, data: scrubDeep(b.data) } : b,
    );
  }
  return event;
}

/** Sanitiza breadcrumbs individuais (fetch/xhr podem carregar headers/urls). */
export function scrubBreadcrumb(breadcrumb: any, _hint?: unknown): any {
  if (breadcrumb && breadcrumb.data) {
    breadcrumb.data = scrubDeep(breadcrumb.data);
  }
  return breadcrumb;
}
