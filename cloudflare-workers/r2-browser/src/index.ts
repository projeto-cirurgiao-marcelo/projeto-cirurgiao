import type { Env, ListResponse, ObjectMeta, SearchResponse } from './types';
import { unauthorized, verifyAdmin } from './auth';
import { getOrBuildIndex, reindexChunk, reindexFolder } from './folder-indexer';
import { searchIndex } from './search';
import {
  handleMultipartAbort,
  handleMultipartComplete,
  handleMultipartCreate,
  handleMultipartUploadPart,
  MULTIPART_LIMITS,
} from './multipart';

const SIGNED_URL_DEFAULT_TTL = 3600;
const SIGNED_URL_MAX_TTL = 86400;
const LIST_DEFAULT_LIMIT = 1000;
const LIST_MAX_LIMIT = 1000;
const MANIFEST_PROBES = ['playlist.m3u8', 'subtitles.m3u8', 'subtitles_pt.vtt'] as const;

function corsHeaders(env: Env, requestOrigin: string | null): HeadersInit {
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowOrigin =
    requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0] || '';
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-amz-content-sha256',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

async function handleHealth(env: Env): Promise<Response> {
  const index = await getOrBuildIndex(env).catch((err) => {
    console.error('[health] failed to read index', err);
    return null;
  });
  return json({
    ok: true,
    indexBuiltAt: index?.builtAt ?? null,
    folderCount: index?.folderCount ?? 0,
  });
}

function objToMeta(obj: R2Object): ObjectMeta {
  return {
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded.toISOString(),
    etag: obj.etag,
    contentType: obj.httpMetadata?.contentType,
  };
}

/**
 * Probe the canonical HLS manifests directly so they're always surfaced even
 * when the folder has thousands of .ts segments that push manifests beyond the
 * first list page (R2 list returns lex-sorted, manifests end up last).
 */
async function probeManifests(prefix: string, env: Env): Promise<ObjectMeta[]> {
  if (!prefix) return [];
  const probes = MANIFEST_PROBES.map(async (name) => {
    const key = `${prefix}${name}`;
    const obj = await env.BUCKET.head(key);
    return obj ? objToMeta(obj) : null;
  });
  const settled = await Promise.all(probes);
  return settled.filter((x): x is ObjectMeta => x !== null);
}

async function handleList(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const prefix = url.searchParams.get('prefix') ?? '';
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.min(
    Math.max(parseInt(limitRaw ?? `${LIST_DEFAULT_LIMIT}`, 10) || LIST_DEFAULT_LIMIT, 1),
    LIST_MAX_LIMIT,
  );

  // List + manifest probe run in parallel.
  const [result, manifestExtras] = await Promise.all([
    env.BUCKET.list({
      prefix,
      delimiter: '/',
      cursor,
      limit,
    }) as Promise<R2Objects>,
    cursor ? Promise.resolve([]) : probeManifests(prefix, env),
  ]);

  const folders: string[] = ((result as unknown as { delimitedPrefixes?: string[] })
    .delimitedPrefixes ?? []) as string[];

  const seen = new Set<string>();
  const objects: ObjectMeta[] = [];

  // Manifests first so the UI can show them even if the page is huge.
  for (const m of manifestExtras) {
    if (seen.has(m.key)) continue;
    seen.add(m.key);
    objects.push(m);
  }
  for (const o of result.objects) {
    if (o.key === prefix || seen.has(o.key)) continue;
    seen.add(o.key);
    objects.push(objToMeta(o));
  }

  const nextCursor =
    result.truncated && 'cursor' in result ? (result.cursor as string) : undefined;

  const payload: ListResponse = {
    prefix,
    folders,
    objects,
    cursor: nextCursor,
    truncated: result.truncated,
  };
  return json(payload);
}

/**
 * Dump completo do KV folder index, opcionalmente filtrado por hasPlaylist.
 * Consumido pelo backend /admin/media/sync-status para diff entre R2 e DB.
 * Nao retorna ancestrais (depth>1 sem playlist) por padrao — overhead pra
 * quem so quer leaf folders prontas pra cadastrar.
 */
async function handleIndex(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const onlyPlaylist = url.searchParams.get('hasPlaylist') !== 'false';

  const index = await getOrBuildIndex(env);
  const folders = onlyPlaylist
    ? index.folders.filter((f) => f.hasPlaylist)
    : index.folders;

  return json({
    builtAt: index.builtAt,
    totalCount: index.folderCount,
    returned: folders.length,
    folders: folders.map((f) => ({
      fullPath: f.fullPath,
      parentName: f.parentName,
      hasPlaylist: f.hasPlaylist,
      fileCount: f.fileCount,
      depth: f.depth,
    })),
  });
}

async function handleSearch(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100);

  if (!q.trim()) return json({ query: q, matches: [], indexBuiltAt: null });

  const index = await getOrBuildIndex(env);
  const matches = searchIndex(index, q, limit);
  const payload: SearchResponse = {
    query: q,
    matches,
    indexBuiltAt: index.builtAt,
  };
  return json(payload);
}

async function handleSignedUrl(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return json({ error: 'missing key' }, 400);

  const ttlRaw = parseInt(url.searchParams.get('ttl') ?? `${SIGNED_URL_DEFAULT_TTL}`, 10);
  const ttl = Math.min(Math.max(ttlRaw || SIGNED_URL_DEFAULT_TTL, 60), SIGNED_URL_MAX_TTL);

  // Strategy: serve via public CDN (custom domain on bucket)
  // Worker does NOT generate signed URLs because the bucket is fronted by
  // the public CDN at CDN_BASE_URL. If you need true presigned URLs later,
  // swap to AWS SigV4 for R2 (requires access keys, not the binding).
  const cdn = env.CDN_BASE_URL.replace(/\/+$/, '');
  const cdnUrl = `${cdn}/${encodeURI(key)}`;

  return json({
    key,
    url: cdnUrl,
    expiresAt: Date.now() + ttl * 1000,
    public: true,
  });
}

async function handleObjectProxy(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return json({ error: 'missing key' }, 400);

  const obj = await env.BUCKET.get(key);
  if (!obj) return json({ error: 'not found' }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'private, max-age=300');
  return new Response(obj.body, { headers });
}

async function handleReindex(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const folderPrefix = url.searchParams.get('prefix');
  if (folderPrefix && folderPrefix.trim()) {
    const progress = await reindexFolder(env, folderPrefix.trim());
    return json({ ok: true, scope: 'folder', ...progress });
  }
  const reset = url.searchParams.get('reset') === '1';
  const progress = await reindexChunk(env, { reset });
  return json({ ok: true, scope: 'full', ...progress });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    let response: Response;
    try {
      if (path === '/' || path === '/health') {
        response = await handleHealth(env);
      } else {
        const auth = await verifyAdmin(request, env);
        if (!auth) {
          response = unauthorized();
        } else if (path === '/list' && request.method === 'GET') {
          response = await handleList(request, env);
        } else if (path === '/search' && request.method === 'GET') {
          response = await handleSearch(request, env);
        } else if (path === '/index' && request.method === 'GET') {
          response = await handleIndex(request, env);
        } else if (path === '/signed-url' && request.method === 'GET') {
          response = await handleSignedUrl(request, env);
        } else if (path === '/object' && request.method === 'GET') {
          response = await handleObjectProxy(request, env);
        } else if (path === '/reindex' && request.method === 'POST') {
          response = await handleReindex(request, env);
        } else if (path === '/multipart/limits' && request.method === 'GET') {
          response = json(MULTIPART_LIMITS);
        } else if (path === '/multipart/create' && request.method === 'POST') {
          response = await handleMultipartCreate(request, env);
        } else if (path === '/multipart/upload-part' && request.method === 'PUT') {
          response = await handleMultipartUploadPart(request, env);
        } else if (path === '/multipart/complete' && request.method === 'POST') {
          response = await handleMultipartComplete(request, env);
        } else if (path === '/multipart/abort' && request.method === 'POST') {
          response = await handleMultipartAbort(request, env);
        } else {
          response = json({ error: 'not found', path }, 404);
        }
      }
    } catch (err) {
      console.error('[fetch] handler error', err);
      response = json(
        { error: 'internal', message: err instanceof Error ? err.message : 'unknown' },
        500,
      );
    }

    const merged = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) merged.set(k, v as string);
    return new Response(response.body, {
      status: response.status,
      headers: merged,
    });
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    // Cron iterates chunks until done or wall time runs out.
    // Worst case: leftover state in KV picks up on next tick.
    ctx.waitUntil(
      (async () => {
        try {
          let progress = await reindexChunk(env, { reset: true });
          // Bucket de prod >300k keys; cada chunk Worker scan ~5-15k.
          // Cap maior pra garantir done=true e finalizeIndex rodar.
          let safety = 500;
          while (!progress.done && safety-- > 0) {
            progress = await reindexChunk(env);
          }
          console.log(
            `[cron] reindex tick: done=${progress.done} folders=${progress.folderCount} scanned=${progress.scanned}`,
          );
        } catch (err) {
          console.error('[cron] reindex failed', err);
        }
      })(),
    );
  },
};
