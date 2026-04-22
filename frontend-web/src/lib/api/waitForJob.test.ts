import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EnqueuedJobResponse,
  JobStatusResponse,
} from '@/types/api-shared';

// Mock do apiClient — o modulo `./client` importa de `@/lib/stores/
// auth-store` que depende de zustand + firebase + browser globals.
// Mockamos antes de importar o waitForJob pra manter o test em
// `environment: 'node'` sem puxar nada disso.
//
// Usamos vi.hoisted pra poder referenciar `mockGet` dentro da factory
// do vi.mock (que o Vitest levanta pro topo do arquivo).
const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));
vi.mock('./client', () => ({
  apiClient: {
    get: mockGet,
  },
}));

// Import depois do mock.
import {
  JobFailedError,
  JobTimeoutError,
  isEnqueuedJob,
  waitForJob,
} from './waitForJob';

function enqueued(overrides: Partial<EnqueuedJobResponse> = {}): EnqueuedJobResponse {
  return {
    jobId: 'job-abc',
    status: 'queued',
    ...overrides,
  };
}

function jobStatus(overrides: Partial<JobStatusResponse> = {}): JobStatusResponse {
  return {
    id: 'job-abc',
    type: 'ai-summary',
    status: 'queued',
    progress: 0,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('isEnqueuedJob', () => {
  it('reconhece shape novo (jobId + status=queued)', () => {
    expect(isEnqueuedJob({ jobId: 'abc', status: 'queued' })).toBe(true);
  });
  it('reconhece shape sincrono inline (jobId + status=completed + resultRef)', () => {
    expect(
      isEnqueuedJob({
        jobId: 'inline-xyz',
        status: 'completed',
        resultRef: 'summary-1',
      }),
    ).toBe(true);
  });
  it('rejeita shape legacy (objeto VideoSummary direto)', () => {
    const legacySummary = { id: 'summary-1', videoId: 'v1', content: 'xxx' };
    expect(isEnqueuedJob(legacySummary)).toBe(false);
  });
  it('rejeita null/undefined/primitivos', () => {
    expect(isEnqueuedJob(null)).toBe(false);
    expect(isEnqueuedJob(undefined)).toBe(false);
    expect(isEnqueuedJob('string')).toBe(false);
    expect(isEnqueuedJob(42)).toBe(false);
  });
});

describe('waitForJob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('modo sincrono: resolve imediato quando enqueue.status=completed, zero polls', async () => {
    const enqueue = enqueued({
      jobId: 'inline-xyz',
      status: 'completed',
      resultRef: 'summary-123',
    });

    const result = await waitForJob<string>(enqueue);

    expect(result).toBe('summary-123');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('modo sincrono: rejeita com JobFailedError se completed sem resultRef', async () => {
    const enqueue = enqueued({ status: 'completed' }); // sem resultRef

    await expect(waitForJob(enqueue)).rejects.toBeInstanceOf(JobFailedError);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('modo assincrono: queued -> active -> completed resolve com resultRef', async () => {
    mockGet
      .mockResolvedValueOnce({ data: jobStatus({ status: 'queued', progress: 10 }) })
      .mockResolvedValueOnce({ data: jobStatus({ status: 'active', progress: 45 }) })
      .mockResolvedValueOnce({
        data: jobStatus({
          status: 'completed',
          progress: 100,
          resultRef: 'summary-final',
        }),
      });

    const onProgress = vi.fn();
    const promise = waitForJob<string>(enqueued(), {
      pollIntervalMs: 100,
      onProgress,
    });

    // Avanca os timers ate resolver — runAllTimersAsync cobre os 3 ticks.
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('summary-final');
    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockGet).toHaveBeenCalledWith('/jobs/job-abc');
    // onProgress chamado nas 3 iteracoes
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 10);
    expect(onProgress).toHaveBeenNthCalledWith(2, 45);
    expect(onProgress).toHaveBeenNthCalledWith(3, 100);
  });

  it('timeout: rejeita com JobTimeoutError se job continuar active alem do timeoutMs', async () => {
    // Job sempre retorna 'active' — nunca completa.
    mockGet.mockResolvedValue({ data: jobStatus({ status: 'active' }) });

    const promise = waitForJob(enqueued(), {
      pollIntervalMs: 500,
      timeoutMs: 1200,
    });
    // Captura a rejeicao em paralelo com o advanceTimers pra nao deixar
    // a promise unhandled enquanto os timers rodam.
    const expectation = expect(promise).rejects.toBeInstanceOf(JobTimeoutError);

    await vi.advanceTimersByTimeAsync(2000);
    await expectation;
  });

  it('falha: rejeita com JobFailedError e propaga a mensagem do status', async () => {
    mockGet.mockResolvedValueOnce({
      data: jobStatus({ status: 'failed', error: 'Vertex AI quota exceeded' }),
    });

    const promise = waitForJob(enqueued(), { pollIntervalMs: 50 });
    const expectation = promise.catch((e) => e);

    await vi.runAllTimersAsync();
    const err = await expectation;

    expect(err).toBeInstanceOf(JobFailedError);
    expect((err as JobFailedError).message).toBe('Vertex AI quota exceeded');
  });

  it('abort via signal: rejeita com AbortError se signal disparar mid-polling', async () => {
    mockGet.mockResolvedValue({ data: jobStatus({ status: 'active' }) });

    const controller = new AbortController();
    const promise = waitForJob(enqueued(), {
      pollIntervalMs: 500,
      signal: controller.signal,
    });
    const expectation = promise.catch((e) => e);

    // Aborta antes do primeiro tick completar.
    controller.abort();
    await vi.advanceTimersByTimeAsync(100);

    const err = await expectation;
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe('AbortError');
  });

  it('abort imediato: signal ja disparado antes do start rejeita sem fazer requests', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      waitForJob(enqueued(), { signal: controller.signal }),
    ).rejects.toThrow(/Aborted/i);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('429 no poll: propaga o erro (interceptor global ja mostra o toast)', async () => {
    const rateLimitError = new Error('429 Too Many Requests');
    mockGet.mockRejectedValueOnce(rateLimitError);

    const promise = waitForJob(enqueued(), { pollIntervalMs: 50 });
    const expectation = promise.catch((e) => e);

    await vi.runAllTimersAsync();
    const err = await expectation;

    expect(err).toBe(rateLimitError);
  });

  it('backoff: intervalos crescem ~1.3x ate maxPollIntervalMs', async () => {
    // Job sempre active — queremos medir so os setTimeout calls.
    mockGet.mockResolvedValue({ data: jobStatus({ status: 'active' }) });

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const promise = waitForJob(enqueued(), {
      pollIntervalMs: 1000,
      maxPollIntervalMs: 2000,
      timeoutMs: 10_000,
    });
    const rejected = promise.catch(() => undefined);

    // Roda alguns ticks e checa os intervals passados pro setTimeout.
    await vi.advanceTimersByTimeAsync(7000);

    // Os 4 primeiros intervals esperados: 1000, 1300, 1690, 2000 (capped).
    // setTimeout pode ser chamado pra outras coisas; filtramos por ms.
    const delays = setTimeoutSpy.mock.calls
      .map((call) => call[1])
      .filter((d): d is number => typeof d === 'number' && d >= 900);

    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(1300);
    expect(delays[2]).toBeCloseTo(1690, 0);
    // Quarto em diante bate no teto 2000.
    if (delays.length > 3) {
      expect(delays[3]).toBe(2000);
    }

    // Acelera ate o timeout estourar pra nao deixar timers suspensos
    // afetando outros tests.
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
    setTimeoutSpy.mockRestore();
  });
});
