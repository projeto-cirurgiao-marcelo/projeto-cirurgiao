import { apiClient } from './client';
import type {
  EnqueuedJobResponse,
  JobStatusResponse,
} from '@/types/api-shared';

/**
 * Opcoes do polling. Todas opcionais, defaults conservadores.
 */
export interface WaitForJobOptions {
  /** Intervalo inicial entre polls (ms). Default 1500. */
  pollIntervalMs?: number;
  /** Teto do intervalo apos backoff (ms). Default 5000. */
  maxPollIntervalMs?: number;
  /** Timeout total do polling (ms). Default 120_000 (2 min). */
  timeoutMs?: number;
  /** Callback a cada poll bem-sucedido com o progress atual (0..100). */
  onProgress?: (progress: number | undefined) => void;
  /** AbortSignal para cancelar o polling externamente. */
  signal?: AbortSignal;
}

/**
 * Resultado final do job: o `resultRef` fornecido pelo backend. Callers
 * tipam o retorno como preferirem (ex: `waitForJob<string>(resp)` quando
 * sabem que vem um UUID, ou `waitForJob<Summary>(resp)` se o backend
 * mudar pra inlinar o objeto no futuro).
 */
export type JobResult<T = string> = T;

/**
 * Error classe para separar timeout de abort e de falha remota.
 * Testes podem diferenciar com `instanceof`.
 */
export class JobTimeoutError extends Error {
  constructor(jobId: string, timeoutMs: number) {
    super(`Job ${jobId} timed out after ${timeoutMs}ms`);
    this.name = 'JobTimeoutError';
  }
}

export class JobFailedError extends Error {
  constructor(
    jobId: string,
    public readonly remoteError?: string,
  ) {
    super(remoteError ?? `Job ${jobId} failed`);
    this.name = 'JobFailedError';
  }
}

/**
 * Espera um job `EnqueuedJobResponse` completar e retorna o `resultRef`
 * final (UUID do artifact: summary id, quiz id, etc).
 *
 * Comportamento por modo:
 * - **Sincrono** (backend com `QUEUE_ENABLED=false`): a resposta inicial
 *   ja vem com `status: 'completed'` e `resultRef` preenchido.
 *   `waitForJob` retorna imediatamente sem fazer polls (zero requests
 *   extras).
 * - **Assincrono** (`QUEUE_ENABLED=true`): resposta inicial vem com
 *   `status: 'queued'`. `waitForJob` faz polling em `GET /jobs/:id`
 *   com backoff gentil (x1.3) ate completar, falhar ou estourar o
 *   timeout.
 *
 * Backoff: comeca em `pollIntervalMs` e multiplica por 1.3 a cada tick
 * ate bater `maxPollIntervalMs`. Amortiza carga em jobs longos sem ser
 * tao agressivo quanto dobrar (2x).
 *
 * Errors:
 * - `JobTimeoutError` — polling ultrapassou `timeoutMs`.
 * - `JobFailedError` — job reportou `status: 'failed'`.
 * - `DOMException('AbortError')` — caller disparou `signal.abort()`.
 * - Erros de rede / 429 do interceptor sao propagados (toast global
 *   ja mostra o 429 — aqui so reject pra cima pro caller decidir se
 *   retenta).
 */
export async function waitForJob<T = string>(
  enqueue: EnqueuedJobResponse,
  options: WaitForJobOptions = {},
): Promise<JobResult<T>> {
  // Caso 1: backend respondeu 'completed' no enqueue.
  if (enqueue.status === 'completed') {
    if (!enqueue.resultRef) {
      throw new JobFailedError(
        enqueue.jobId,
        'Job reportado como completed mas sem resultRef',
      );
    }
    return enqueue.resultRef as T;
  }

  // Defaults com desestruturacao (permite override via opts).
  const {
    pollIntervalMs = 1500,
    maxPollIntervalMs = 5000,
    timeoutMs = 120_000,
    onProgress,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new DOMException('Polling aborted before start', 'AbortError');
  }

  const { jobId } = enqueue;
  const start = Date.now();
  let interval = pollIntervalMs;

  // Loop ate completar / falhar / timeout / abort.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Polling aborted', 'AbortError');
    }
    if (Date.now() - start >= timeoutMs) {
      throw new JobTimeoutError(jobId, timeoutMs);
    }

    // Espera o intervalo atual antes do proximo GET.
    await sleep(interval, signal);

    const { data: status } = await apiClient.get<JobStatusResponse>(
      `/jobs/${jobId}`,
    );

    if (onProgress) {
      onProgress(status.progress);
    }

    if (status.status === 'completed') {
      if (!status.resultRef) {
        throw new JobFailedError(
          jobId,
          'Job status=completed mas sem resultRef',
        );
      }
      return status.resultRef as T;
    }

    if (status.status === 'failed') {
      throw new JobFailedError(jobId, status.error);
    }

    // queued | active | unknown -> continua com backoff gentil.
    interval = Math.min(interval * 1.3, maxPollIntervalMs);
  }
}

/**
 * Sleep cancelavel via AbortSignal — rejeita com AbortError se o signal
 * disparar durante o intervalo. Util pra parar polling mid-wait sem
 * precisar esperar o proximo tick.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Sleep aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Sleep aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
