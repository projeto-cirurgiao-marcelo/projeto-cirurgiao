import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

/**
 * Central place that converts env vars into the shape @nestjs/bullmq
 * expects. Also owns the `QUEUE_ENABLED` feature flag so callers can
 * short-circuit enqueue logic when the queue is off.
 *
 * Configuration priority:
 *   1. `REDIS_URL`  → parse directly; supports rediss:// (TLS) which
 *      Cloud Memorystore with AUTH requires.
 *   2. Discrete vars — REDIS_HOST / REDIS_PORT / REDIS_PASSWORD /
 *      REDIS_TLS_ENABLED. Useful for environments that do not want a
 *      combined URL.
 *   3. Docker-compose dev defaults: localhost:6379, no auth, no TLS.
 */
export interface ResolvedRedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls?: Record<string, never>;
}

export function isQueueEnabled(configService: ConfigService): boolean {
  const raw = configService.get<string>('QUEUE_ENABLED') ?? 'false';
  return raw.toLowerCase() === 'true';
}

export function resolveRedisConfig(
  configService: ConfigService,
): ResolvedRedisConfig {
  const url = configService.get<string>('REDIS_URL');
  if (url) {
    const parsed = new URL(url);
    const tlsEnabled = parsed.protocol === 'rediss:';
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.replace(/^\//, ''), 10) || 0 : 0,
      tls: tlsEnabled ? {} : undefined,
    };
  }

  const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
  const port = parseInt(configService.get<string>('REDIS_PORT') ?? '6379', 10);
  const password = configService.get<string>('REDIS_PASSWORD') || undefined;
  const db = parseInt(configService.get<string>('REDIS_DB') ?? '0', 10);
  const tlsEnabled =
    (configService.get<string>('REDIS_TLS_ENABLED') ?? 'false').toLowerCase() ===
    'true';

  return {
    host,
    port,
    password,
    db,
    tls: tlsEnabled ? {} : undefined,
  };
}

export function buildBullRootOptions(
  configService: ConfigService,
): BullRootModuleOptions {
  const redis = resolveRedisConfig(configService);
  return {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  };
}

/**
 * Concurrency for each processor, configurable via env. Default to 2
 * so dev Redis does not get slammed.
 */
export function getProcessorConcurrency(configService: ConfigService): number {
  const raw = configService.get<string>('BULLMQ_CONCURRENCY') ?? '2';
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}
