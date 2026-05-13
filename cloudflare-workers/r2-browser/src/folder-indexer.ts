import type {
  Env,
  FolderIndex,
  FolderNode,
  ReindexJobState,
  ReindexProgress,
} from './types';
import { INDEX_KEY, INDEX_TTL_SECONDS, JOB_KEY, JOB_TTL_SECONDS } from './types';

const PLAYLIST_FILENAME = 'playlist.m3u8';
const LIST_PAGE_LIMIT = 1000;
const DEFAULT_PREFIX = 'videos/';

// Pages processed per /reindex invocation.
// Calibrated so each call fits comfortably under Worker wall time (<30s)
// even when R2 list latency is high. Frontend loops until done=true.
// 24 paginas × 1000 keys = ate 24k objetos por chunk; em prod chunk dura
// ~10s. Bucket >300k keys precisa ~15 chunks para finalizar.
const PAGES_PER_CHUNK = 24;

function emptyJob(prefix: string): ReindexJobState {
  return {
    startedAt: new Date().toISOString(),
    prefix,
    cursor: undefined,
    scanned: 0,
    playlistsFound: 0,
    partial: [],
  };
}

function mergePlaylistObject(
  obj: R2Object,
  byPath: Map<string, FolderNode>,
): boolean {
  if (!obj.key.endsWith(`/${PLAYLIST_FILENAME}`)) return false;
  const parts = obj.key.split('/').slice(0, -1);
  if (parts.length === 0) return false;

  // R2Object.uploaded é Date; converte pra ISO string pra serialização no KV.
  // Captura no leaf (folder onde o playlist mora) — propaga somente quando
  // o folder é a aula em si, não nos ancestrais.
  const uploadedIso =
    obj.uploaded instanceof Date ? obj.uploaded.toISOString() : undefined;

  for (let i = 1; i <= parts.length; i++) {
    const fullPath = parts.slice(0, i).join('/');
    const isLeaf = i === parts.length;
    const existing = byPath.get(fullPath);
    if (!existing) {
      byPath.set(fullPath, {
        fullPath,
        parentName: parts[i - 1],
        ancestors: parts.slice(0, i - 1),
        depth: i,
        hasPlaylist: isLeaf,
        fileCount: isLeaf ? 1 : 0,
        lastUpdated: isLeaf ? uploadedIso : undefined,
      });
    } else if (isLeaf) {
      existing.hasPlaylist = true;
      existing.fileCount += 1;
      // Mantém o mais recente se já houver registro (rebuild incremental
      // pode ver o mesmo objeto várias vezes — pegamos o max).
      if (
        uploadedIso &&
        (!existing.lastUpdated || uploadedIso > existing.lastUpdated)
      ) {
        existing.lastUpdated = uploadedIso;
      }
    }
  }
  return true;
}

async function loadJob(env: Env): Promise<ReindexJobState | null> {
  const raw = await env.INDEX_KV.get(JOB_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReindexJobState;
  } catch {
    return null;
  }
}

async function saveJob(env: Env, job: ReindexJobState): Promise<void> {
  await env.INDEX_KV.put(JOB_KEY, JSON.stringify(job), {
    expirationTtl: JOB_TTL_SECONDS,
  });
}

async function clearJob(env: Env): Promise<void> {
  await env.INDEX_KV.delete(JOB_KEY);
}

async function finalizeIndex(
  env: Env,
  job: ReindexJobState,
): Promise<FolderIndex> {
  const index: FolderIndex = {
    builtAt: new Date().toISOString(),
    folderCount: job.partial.length,
    folders: job.partial.sort((a, b) => a.fullPath.localeCompare(b.fullPath)),
  };
  await env.INDEX_KV.put(INDEX_KEY, JSON.stringify(index), {
    expirationTtl: INDEX_TTL_SECONDS,
  });
  await clearJob(env);
  console.log(
    `[folder-indexer] finalized: scanned=${job.scanned} playlists=${job.playlistsFound} folders=${index.folderCount}`,
  );
  return index;
}

/**
 * Process one chunk of the rebuild job.
 * Returns progress; caller (HTTP handler or cron) decides whether to loop.
 */
export async function reindexChunk(
  env: Env,
  options: { reset?: boolean } = {},
): Promise<ReindexProgress> {
  const start = Date.now();
  const prefix = env.INDEX_PREFIX ?? DEFAULT_PREFIX;

  let job: ReindexJobState | null = options.reset ? null : await loadJob(env);
  if (!job || job.prefix !== prefix) {
    job = emptyJob(prefix);
  }

  const byPath = new Map<string, FolderNode>();
  for (const n of job.partial) byPath.set(n.fullPath, n);

  let pages = 0;
  let cursor = job.cursor;
  let truncated = true;

  while (pages < PAGES_PER_CHUNK && truncated) {
    const page = (await env.BUCKET.list({
      prefix,
      cursor,
      limit: LIST_PAGE_LIMIT,
    })) as R2Objects;

    for (const obj of page.objects) {
      job.scanned++;
      if (mergePlaylistObject(obj, byPath)) job.playlistsFound++;
    }

    pages++;
    truncated = page.truncated;
    cursor =
      page.truncated && 'cursor' in page ? (page.cursor as string) : undefined;
  }

  job.cursor = cursor;
  job.partial = Array.from(byPath.values());

  const done = !truncated;

  if (done) {
    const index = await finalizeIndex(env, job);
    return {
      done: true,
      scanned: job.scanned,
      playlistsFound: job.playlistsFound,
      folderCount: index.folderCount,
      builtAt: index.builtAt,
      durationMs: Date.now() - start,
    };
  }

  await saveJob(env, job);
  return {
    done: false,
    scanned: job.scanned,
    playlistsFound: job.playlistsFound,
    folderCount: job.partial.length,
    cursor: job.cursor,
    durationMs: Date.now() - start,
  };
}

/**
 * Reindex a single folder subtree. Single-shot: assumes the folder is small
 * enough to fit in one Worker invocation. Merges into the existing index,
 * replacing only nodes that match the given prefix.
 */
export async function reindexFolder(
  env: Env,
  rawPrefix: string,
): Promise<ReindexProgress> {
  const start = Date.now();
  const prefix = rawPrefix.replace(/^\/+/, '').replace(/\/?$/, '/');

  if (!prefix || prefix === '/') {
    throw new Error('reindexFolder requires a non-empty prefix');
  }

  const byPath = new Map<string, FolderNode>();
  let cursor: string | undefined;
  let scanned = 0;
  let playlistsFound = 0;

  do {
    const page = (await env.BUCKET.list({
      prefix,
      cursor,
      limit: LIST_PAGE_LIMIT,
    })) as R2Objects;

    for (const obj of page.objects) {
      scanned++;
      if (mergePlaylistObject(obj, byPath)) playlistsFound++;
    }
    cursor =
      page.truncated && 'cursor' in page ? (page.cursor as string) : undefined;
  } while (cursor);

  // Merge into existing index: drop nodes under this prefix, add new ones.
  const current = (await getIndex(env)) ?? {
    builtAt: new Date(0).toISOString(),
    folderCount: 0,
    folders: [],
  };

  const kept = current.folders.filter(
    (n) => !`${n.fullPath}/`.startsWith(prefix),
  );
  const merged = [...kept, ...byPath.values()].sort((a, b) =>
    a.fullPath.localeCompare(b.fullPath),
  );

  const next: FolderIndex = {
    builtAt: new Date().toISOString(),
    folderCount: merged.length,
    folders: merged,
  };
  await env.INDEX_KV.put(INDEX_KEY, JSON.stringify(next), {
    expirationTtl: INDEX_TTL_SECONDS,
  });

  console.log(
    `[folder-indexer] folder reindex prefix="${prefix}" scanned=${scanned} playlists=${playlistsFound} new-nodes=${byPath.size} total=${merged.length}`,
  );

  return {
    done: true,
    scanned,
    playlistsFound,
    folderCount: merged.length,
    builtAt: next.builtAt,
    durationMs: Date.now() - start,
  };
}

export async function getIndex(env: Env): Promise<FolderIndex | null> {
  const raw = await env.INDEX_KV.get(INDEX_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FolderIndex;
  } catch (err) {
    console.error('[folder-indexer] corrupt index, will rebuild', err);
    return null;
  }
}

export async function getOrBuildIndex(env: Env): Promise<FolderIndex> {
  const cached = await getIndex(env);
  if (cached) return cached;
  // No cached index — kick off a single chunk; full build needs follow-up calls.
  await reindexChunk(env, { reset: true });
  const after = await getIndex(env);
  if (after) return after;
  // Build still in progress — return an empty index placeholder.
  return {
    builtAt: new Date(0).toISOString(),
    folderCount: 0,
    folders: [],
  };
}
