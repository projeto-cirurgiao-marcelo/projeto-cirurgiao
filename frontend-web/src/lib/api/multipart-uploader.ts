/**
 * Multipart upload client for the r2-browser Worker.
 *
 * Each part is uploaded directly via PUT /multipart/upload-part on the Worker,
 * which proxies the chunk to R2 via its binding. No S3 access keys are sent
 * to the browser; the Worker validates the JWT/Firebase token on every part.
 */
import { useAuthStore } from '@/lib/stores/auth-store';
import { auth } from '@/lib/firebase/config';

const WORKER_BASE = (
  process.env.NEXT_PUBLIC_R2_BROWSER_WORKER_URL ||
  'http://localhost:8787'
).replace(/\/+$/, '');

const DEFAULT_PART_SIZE = 16 * 1024 * 1024; // 16MB
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_RETRIES = 3;

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  partsCompleted: number;
  partsTotal: number;
  partsInFlight: number;
}

export interface UploadResult {
  key: string;
  etag: string;
  size: number;
  uploaded: string;
}

export interface UploadHandle {
  promise: Promise<UploadResult>;
  abort: () => Promise<void>;
}

export interface StartUploadOptions {
  key: string;
  file: File | Blob;
  contentType?: string;
  customMetadata?: Record<string, string>;
  partSize?: number;
  concurrency?: number;
  retries?: number;
  onProgress?: (p: UploadProgress) => void;
}

interface PartPlan {
  partNumber: number;
  start: number;
  end: number; // exclusive
}

interface CreateResponse {
  key: string;
  uploadId: string;
  contentType: string;
}

interface PartResponse {
  partNumber: number;
  etag: string;
}

class UploadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'UploadError';
  }
}

// Filas longas de upload estouram a validade de 1h do Firebase ID token; o
// token estático do zustand vence no meio da fila e o Worker devolve 401.
// getIdToken() devolve o cached se válido e renova sozinho quando expira;
// forceRefresh cobre o retry pós-401.
async function authHeaders(forceRefresh = false): Promise<Headers> {
  const headers = new Headers();
  let token: string | null = null;
  try {
    token = auth.currentUser
      ? await auth.currentUser.getIdToken(forceRefresh)
      : null;
  } catch {
    // cai pro token persistido abaixo
  }
  if (!token) token = useAuthStore.getState().firebaseToken;
  if (token) headers.set('authorization', `Bearer ${token}`);
  return headers;
}

async function workerJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const doFetch = async (forceRefresh: boolean) => {
    const headers = await authHeaders(forceRefresh);
    headers.set('content-type', 'application/json');
    return fetch(`${WORKER_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  };
  let res = await doFetch(false);
  if (res.status === 401) {
    res = await doFetch(true);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new UploadError(
      `Worker ${path} failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return (await res.json()) as T;
}

async function uploadPart(
  key: string,
  uploadId: string,
  part: PartPlan,
  blob: Blob,
  signal: AbortSignal,
  onChunk: (bytes: number) => void,
  retries: number,
): Promise<PartResponse> {
  const url =
    `${WORKER_BASE}/multipart/upload-part?key=${encodeURIComponent(key)}` +
    `&uploadId=${encodeURIComponent(uploadId)}` +
    `&partNumber=${part.partNumber}`;

  let lastErr: unknown = null;
  let lastWas401 = false;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal.aborted) throw new UploadError('aborted');
    try {
      const headers = await authHeaders(lastWas401);
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: blob,
        signal,
      });
      lastWas401 = res.status === 401;
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new UploadError(
          `part ${part.partNumber} failed (${res.status}): ${text || res.statusText}`,
        );
      }
      const data = (await res.json()) as PartResponse;
      onChunk(blob.size);
      return data;
    } catch (err) {
      lastErr = err;
      if (signal.aborted) throw err;
      if (attempt === retries) break;
      const backoff = 500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr instanceof UploadError
    ? lastErr
    : new UploadError(`part ${part.partNumber} exhausted retries`, lastErr);
}

function planParts(totalBytes: number, partSize: number): PartPlan[] {
  const plans: PartPlan[] = [];
  if (totalBytes <= 0) return plans;
  let start = 0;
  let partNumber = 1;
  while (start < totalBytes) {
    const end = Math.min(start + partSize, totalBytes);
    plans.push({ partNumber, start, end });
    start = end;
    partNumber++;
  }
  return plans;
}

export function startMultipartUpload(opts: StartUploadOptions): UploadHandle {
  const partSize = opts.partSize ?? DEFAULT_PART_SIZE;
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const totalBytes = opts.file.size;

  const controller = new AbortController();
  const { signal } = controller;

  let uploadId: string | null = null;
  let aborted = false;

  const promise = (async (): Promise<UploadResult> => {
    if (totalBytes === 0) {
      throw new UploadError('empty file');
    }

    // 1) create
    const created = await workerJson<CreateResponse>(
      '/multipart/create',
      {
        key: opts.key,
        contentType: opts.contentType,
        customMetadata: opts.customMetadata,
      },
      signal,
    );
    uploadId = created.uploadId;

    // 2) plan + upload parts with bounded concurrency
    const parts = planParts(totalBytes, partSize);
    const partsTotal = parts.length;

    let uploadedBytes = 0;
    let partsCompleted = 0;
    let partsInFlight = 0;

    const tickProgress = () => {
      opts.onProgress?.({
        uploadedBytes,
        totalBytes,
        percent: totalBytes === 0 ? 0 : (uploadedBytes / totalBytes) * 100,
        partsCompleted,
        partsTotal,
        partsInFlight,
      });
    };

    const completed: PartResponse[] = [];
    let nextIdx = 0;

    async function worker(): Promise<void> {
      while (true) {
        if (signal.aborted) throw new UploadError('aborted');
        const idx = nextIdx++;
        if (idx >= parts.length) return;
        const plan = parts[idx];
        const blob = opts.file.slice(plan.start, plan.end);
        partsInFlight++;
        tickProgress();
        try {
          const part = await uploadPart(
            created.key,
            created.uploadId,
            plan,
            blob,
            signal,
            (bytes) => {
              uploadedBytes += bytes;
            },
            retries,
          );
          completed.push(part);
          partsCompleted++;
        } finally {
          partsInFlight--;
          tickProgress();
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, parts.length) }, () =>
      worker(),
    );
    await Promise.all(workers);

    // 3) complete (sorted by partNumber inside the worker)
    const result = await workerJson<UploadResult>(
      '/multipart/complete',
      {
        key: created.key,
        uploadId: created.uploadId,
        parts: completed.map((p) => ({
          partNumber: p.partNumber,
          etag: p.etag,
        })),
      },
      signal,
    );
    return result;
  })().catch(async (err) => {
    if (uploadId && !aborted) {
      try {
        await workerJson(
          '/multipart/abort',
          { key: opts.key, uploadId },
        );
      } catch {
        // ignore abort failure; client moved on
      }
    }
    throw err instanceof UploadError ? err : new UploadError('upload failed', err);
  });

  return {
    promise,
    abort: async () => {
      aborted = true;
      controller.abort();
      if (uploadId) {
        try {
          await workerJson('/multipart/abort', { key: opts.key, uploadId });
        } catch {
          // ignore
        }
      }
    },
  };
}

export { UploadError };
