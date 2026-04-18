/**
 * Logger condicional — gate combinado:
 *   - `log` / `debug` imprimem se rodando em dev OU se
 *     `NEXT_PUBLIC_DEBUG === 'true'` (permite ligar debug em
 *     staging/prod via env var no host, sem rebuild).
 *   - `warn` / `error` imprimem sempre — preservam informação de
 *     diagnóstico em produção (crash reports, APM, observabilidade).
 *
 * Uso:
 *   import { logger } from '@/lib/logger';
 *   logger.log('[AutoSave] salvou', payload);    // gated
 *   logger.warn('[Player] SDK demorou', ms);     // sempre
 *   logger.error('[Progress] falhou', err);      // sempre
 */
const isDev = process.env.NODE_ENV === 'development';
const debugFlag = process.env.NEXT_PUBLIC_DEBUG === 'true';
const shouldLog = isDev || debugFlag;

export const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog) console.log(...args);
  },
  debug: (...args: unknown[]) => {
    if (shouldLog) console.debug(...args);
  },
  warn: (...args: unknown[]) => {
    // Sempre imprime — preservamos warnings em prod (config, fallbacks).
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Sempre imprime — crash info precisa sobreviver em prod.
    console.error(...args);
  },
};
