/**
 * R2 Browser service — talks to the Cloudflare Worker that fronts
 * the s3-projeto-cirurgiao bucket with a folder-name search index.
 *
 * Worker source: cloudflare-workers/r2-browser/
 * Plan: knowledge/R2-BROWSER-PLAN.md
 */
import { useAuthStore } from '@/lib/stores/auth-store';

const WORKER_BASE = (
  process.env.NEXT_PUBLIC_R2_BROWSER_WORKER_URL ||
  'http://localhost:8787'
).replace(/\/+$/, '');

const CDN_BASE = (
  process.env.NEXT_PUBLIC_R2_CDN_BASE ||
  'https://cdn.projetocirurgiao.app'
).replace(/\/+$/, '');

export interface ObjectMeta {
  key: string;
  size: number;
  uploaded: string;
  etag: string;
  contentType?: string;
}

export interface ListResponse {
  prefix: string;
  folders: string[];
  objects: ObjectMeta[];
  cursor?: string;
  truncated: boolean;
}

export interface SearchHit {
  fullPath: string;
  parentName: string;
  score: number;
  hasPlaylist: boolean;
  fileCount: number;
}

export interface SearchResponse {
  query: string;
  matches: SearchHit[];
  indexBuiltAt: string | null;
}

export interface SignedUrlResponse {
  key: string;
  url: string;
  expiresAt: number;
  public: boolean;
}

export interface HealthResponse {
  ok: boolean;
  indexBuiltAt: string | null;
  folderCount: number;
}

export interface ReindexResponse {
  ok: boolean;
  done: boolean;
  scanned: number;
  playlistsFound: number;
  folderCount: number;
  cursor?: string;
  builtAt?: string;
  durationMs: number;
}

class R2BrowserError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'R2BrowserError';
  }
}

function authHeaders(): Headers {
  const headers = new Headers({ 'content-type': 'application/json' });
  const token = useAuthStore.getState().firebaseToken;
  if (token) headers.set('authorization', `Bearer ${token}`);
  return headers;
}

async function workerFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${WORKER_BASE}${path}`, {
    ...init,
    headers: {
      ...Object.fromEntries(authHeaders().entries()),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = (body as { message?: string; error?: string }).message
        ?? (body as { error?: string }).error
        ?? '';
    } catch {
      // ignore parse error
    }
    throw new R2BrowserError(
      detail || `Worker request failed (${res.status})`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export async function listPrefix(
  prefix: string,
  cursor?: string,
  limit = 200,
): Promise<ListResponse> {
  const params = new URLSearchParams({ prefix, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return workerFetch<ListResponse>(`/list?${params.toString()}`);
}

export async function searchFolders(
  query: string,
  limit = 20,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return workerFetch<SearchResponse>(`/search?${params.toString()}`);
}

export async function getSignedUrl(
  key: string,
  ttl = 3600,
): Promise<SignedUrlResponse> {
  const params = new URLSearchParams({ key, ttl: String(ttl) });
  return workerFetch<SignedUrlResponse>(`/signed-url?${params.toString()}`);
}

export async function getHealth(): Promise<HealthResponse> {
  return workerFetch<HealthResponse>(`/health`);
}

export async function reindex(reset = false): Promise<ReindexResponse> {
  const qs = reset ? '?reset=1' : '';
  return workerFetch<ReindexResponse>(`/reindex${qs}`, { method: 'POST' });
}

/**
 * Reindex a single folder subtree (single-shot, no chunking).
 * Merges into the existing index without touching unrelated folders.
 */
export async function reindexCurrentFolder(
  prefix: string,
): Promise<ReindexResponse> {
  const qs = `?prefix=${encodeURIComponent(prefix)}`;
  return workerFetch<ReindexResponse>(`/reindex${qs}`, { method: 'POST' });
}

/**
 * Drive reindex to completion by looping chunked invocations.
 * `onProgress` is called after each chunk so the UI can show progress.
 *
 * `maxChunks` precisa ser alto: bucket de prod tem >300k keys e cada chunk
 * Worker scan ~5-15k. Cap baixo (50) atingia antes de done=true e o KV
 * index NUNCA finalizava (finalizeIndex so roda quando truncated=false).
 */
export async function reindexFull(
  onProgress?: (p: ReindexResponse) => void,
  maxChunks = 500,
): Promise<ReindexResponse> {
  let progress = await reindex(true);
  onProgress?.(progress);
  let i = 0;
  while (!progress.done && i++ < maxChunks) {
    progress = await reindex(false);
    onProgress?.(progress);
  }
  return progress;
}

/**
 * Build the public CDN URL for an R2 key.
 * Used to copy a stable link for course creation.
 */
export function cdnUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  return `${CDN_BASE}/${cleanKey}`;
}

/**
 * Convenience: detect if a folder contains an HLS master playlist.
 * Folder paths from the Worker do NOT have a trailing slash.
 */
export function playlistKeyFor(folderPath: string): string {
  return `${folderPath.replace(/\/+$/, '')}/playlist.m3u8`;
}

export { R2BrowserError };
