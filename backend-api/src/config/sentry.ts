/**
 * Sentry error tracking — no-op quando SENTRY_DSN não está definido.
 *
 * Objetivo (P1.2 + P1.16): observabilidade mínima de erros para go-live, sem
 * exigir DSN real nem deploy agora, e sem vazar PII/segredos nos eventos.
 *
 * Nada aqui altera o contrato de erro da API: o filtro estende BaseExceptionFilter
 * e apenas reporta ao Sentry antes de delegar a resposta padrão do Nest.
 */
import * as Sentry from '@sentry/node';
import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { ErrorEvent, EventHint } from '@sentry/node';

// Headers redigidos por completo antes de sair da aplicação.
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-webhook-secret'];

// Campos redigidos em qualquer objeto de contexto/extra (case-insensitive).
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'refreshtoken',
  'firebasetoken',
  'jwt',
  'secret',
];

const REDACTED = '[Redacted]';

export function isSentryEnabled(): boolean {
  return !!process.env.SENTRY_DSN;
}

/**
 * Inicializa o Sentry se houver DSN. Retorna true se ativou.
 * Deve rodar DEPOIS de hidratar env (Secret Manager) e antes de subir o app.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Sem tracing/perf por ora — só captura de erro.
    tracesSampleRate: 0,
    // Nunca anexar PII automaticamente (IP, cookies, etc.).
    sendDefaultPii: false,
    beforeSend: scrubEvent,
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

/** Redige recursivamente campos sensíveis por nome de chave. */
function scrubDeep(value: unknown, depth = 0): unknown {
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

/**
 * Sanitiza o evento antes do envio: redige headers sensíveis, descarta cookies
 * e o body da request (difícil sanitizar com segurança), e varre extra/contexts.
 * Exportado para teste.
 */
export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  if (event.request) {
    event.request.headers = redactHeaders(event.request.headers) as Record<string, string>;
    delete event.request.cookies;
    delete event.request.data; // não capturar body completo
  }
  if (event.extra) event.extra = scrubDeep(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubDeep(event.contexts) as typeof event.contexts;
  return event;
}

/**
 * Filtro global: reporta ao Sentry erros inesperados (não-HttpException ou 5xx)
 * e delega a montagem da resposta ao comportamento padrão do Nest.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;
    // Só ruído de servidor vai pro Sentry — 4xx esperados (validação, auth) não.
    if (!isHttp || status >= 500) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
