/**
 * Token de playback: `base64url(json).base64url(hmac-sha256(json-b64))`,
 * payload `{ u: userId, p: diretório, e: expiração unix }`. Mesmo formato
 * do backend (`backend-api/src/modules/showcases/video-token.service.ts`) e
 * do r2-browser (`cloudflare-workers/r2-browser/src/video-token.ts`).
 */
export interface TokenPayload {
  u: string;
  p: string;
  e: number;
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return atob(b64);
}

async function hmacKey(secret: string, usages: ('sign' | 'verify')[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

export async function signToken(secret: string, payload: TokenPayload): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: 'missing' | 'malformed' | 'bad-signature' | 'expired' | 'wrong-path' };

/** Valida assinatura, validade e que `path` (pathname da requisição) está dentro de `p`. */
export async function verifyToken(
  secret: string,
  token: string | null,
  path: string,
  now = Math.floor(Date.now() / 1000),
): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: 'missing' };
  const dot = token.indexOf('.');
  if (dot <= 0) return { ok: false, reason: 'malformed' };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let sigBytes: Uint8Array;
  try {
    sigBytes = Uint8Array.from(fromB64url(sig), (c) => c.charCodeAt(0));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), sigBytes, enc.encode(body));
  if (!valid) return { ok: false, reason: 'bad-signature' };
  let payload: TokenPayload;
  try {
    payload = JSON.parse(fromB64url(body));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload.e !== 'number' || payload.e <= now) return { ok: false, reason: 'expired' };
  if (typeof payload.p !== 'string' || !path.startsWith(payload.p)) return { ok: false, reason: 'wrong-path' };
  return { ok: true, payload };
}

/**
 * Anexa `?t=` a toda URI relativa de uma playlist HLS (variantes, segmentos,
 * legendas em `URI="..."`), pra que o player peça tudo assinado. URIs
 * absolutas (outro host) ficam como estão.
 */
export function signPlaylist(text: string, token: string): string {
  const add = (uri: string) => {
    if (/^[a-z]+:\/\//i.test(uri) || uri.startsWith('data:')) return uri;
    return uri + (uri.includes('?') ? '&' : '?') + 't=' + encodeURIComponent(token);
  };
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${add(uri)}"`);
      }
      return add(trimmed);
    })
    .join('\n');
}
