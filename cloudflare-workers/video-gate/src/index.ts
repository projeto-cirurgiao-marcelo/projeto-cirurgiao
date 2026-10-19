/**
 * video-gate — porteiro do CDN de vídeo (anti-compartilhamento, 19/10/2026).
 *
 * Rota: cdn.projetocirurgiao.app/videos/*  (o resto do host continua indo
 * direto ao bucket pelo custom domain). Só serve com `?t=` assinado pelo
 * backend (VIDEO_TOKEN_SECRET compartilhado). Playlists saem com o mesmo
 * token anexado em cada URI, então segmentos e legendas chegam assinados.
 *
 * ENFORCE="0" = modo observação: sem token válido ainda serve, mas loga.
 * Fica assim até os apps das lojas estarem mandando token; depois "1".
 */
import { signPlaylist, verifyToken } from './token';

export interface Env {
  BUCKET: R2Bucket;
  VIDEO_TOKEN_SECRET: string;
  ALLOWED_ORIGINS: string;
  ENFORCE: string;
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Vary'] = 'Origin';
  }
  return h;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request.headers.get('Origin'));
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('method not allowed', { status: 405, headers: cors });
    }

    const token = url.searchParams.get('t');
    const result = await verifyToken(env.VIDEO_TOKEN_SECRET, token, url.pathname);
    if (!result.ok) {
      const enforce = env.ENFORCE === '1';
      console.warn(JSON.stringify({ msg: 'token rejeitado', reason: result.reason, path: url.pathname, enforce }));
      if (enforce) return new Response('forbidden', { status: 403, headers: cors });
    }

    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const isPlaylist = /\.m3u8$/i.test(key);

    // Segmentos e variantes: cache por URL sem o token (o token muda por aluno).
    const cacheKey = new Request(`${url.origin}${url.pathname}`, { method: 'GET' });
    const cache = caches.default;
    if (!isPlaylist) {
      const hit = await cache.match(cacheKey);
      if (hit) return withHeaders(hit, cors);
    }

    const range = request.headers.get('Range');
    const obj = await env.BUCKET.get(key, range ? { range: parseRange(range) } : undefined);
    if (!obj) return new Response('not found', { status: 404, headers: cors });

    const headers = new Headers(cors);
    obj.writeHttpMetadata(headers);
    headers.set('ETag', obj.httpEtag);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=3600');

    if (isPlaylist) {
      headers.set('Content-Type', 'application/vnd.apple.mpegurl');
      headers.set('Cache-Control', 'no-store');
      const body = token ? signPlaylist(await obj.text(), token) : await obj.text();
      return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
    }

    if (range && obj.range && 'offset' in obj.range) {
      const start = obj.range.offset ?? 0;
      const length = obj.range.length ?? obj.size - start;
      headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${obj.size}`);
      headers.set('Content-Length', String(length));
      return new Response(request.method === 'HEAD' ? null : obj.body, { status: 206, headers });
    }

    headers.set('Content-Length', String(obj.size));
    const response = new Response(request.method === 'HEAD' ? null : obj.body, { status: 200, headers });
    if (request.method === 'GET') ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

function withHeaders(res: Response, extra: Record<string, string>): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

/** "bytes=a-b" | "bytes=a-" | "bytes=-n" → R2Range */
function parseRange(header: string): R2Range {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return { offset: 0 };
  const [, a, b] = m;
  if (a && b) return { offset: Number(a), length: Number(b) - Number(a) + 1 };
  if (a) return { offset: Number(a) };
  return { suffix: Number(b) };
}
