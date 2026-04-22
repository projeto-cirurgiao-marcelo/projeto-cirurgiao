/**
 * Logger dedicado para o mobile-app.
 *
 * Regras (alinhadas com o logger do frontend-web):
 * - `logger.log` / `logger.debug` / `logger.info` imprimem APENAS quando `__DEV__ === true`.
 *   Em production builds (EAS production), viram no-ops silenciosos.
 * - `logger.warn` e `logger.error` imprimem SEMPRE, pra preservar rastreabilidade de
 *   error-handling legitimo. Em um proximo sprint, esses dois passam a alimentar Sentry
 *   ou equivalente (hook ja antecipado via `logger.error`).
 *
 * Convencao de tag: `logger.error('[modulo] mensagem', erro)`. A tag no inicio da
 * mensagem facilita filtrar logs no Metro/Flipper/Xcode por modulo. Nao usamos
 * um prefixo automatico porque as tags ja estao espalhadas pelo codebase antigo
 * (`[VideoPlayer]`, `[summariesService]`, etc.) e preserva-las reduz diff.
 */

type LogArgs = unknown[];

function devOnly(fn: (...args: LogArgs) => void) {
  return (...args: LogArgs) => {
    if (__DEV__) {
      fn(...args);
    }
  };
}

export const logger = {
  /** Debug verbose. Silencioso em production. */
  log: devOnly((...args: LogArgs) => console.log(...args)),
  /** Debug explicito. Silencioso em production. */
  debug: devOnly((...args: LogArgs) => console.debug(...args)),
  /** Info level. Silencioso em production. */
  info: devOnly((...args: LogArgs) => console.info(...args)),
  /** Warning. Imprime sempre. Hook futuro pra telemetria. */
  warn: (...args: LogArgs) => {
    console.warn(...args);
  },
  /** Error. Imprime sempre. Hook futuro pra Sentry/crashlytics. */
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};

export default logger;
