import type { Env } from './types';

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'STUDENT' | 'INSTRUCTOR';
}

const CACHE_TTL_SECONDS = 300;
const CACHE_PREFIX = 'auth:';

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAdmin(
  request: Request,
  env: Env,
): Promise<AuthUser | null> {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const cacheKey = `${CACHE_PREFIX}${tokenHash}`;

  // Hit?
  const cached = await env.INDEX_KV.get(cacheKey);
  if (cached) {
    try {
      const user = JSON.parse(cached) as AuthUser;
      return user.role === 'ADMIN' ? user : null;
    } catch {
      // fall through to refetch
    }
  }

  // Miss — ask backend to verify the Firebase ID token + return profile.
  const backend = env.BACKEND_API_URL.replace(/\/+$/, '');
  let me: Response;
  try {
    me = await fetch(`${backend}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error('[auth] backend unreachable', err);
    return null;
  }

  if (!me.ok) return null;

  let body: { id?: string; email?: string; role?: string };
  try {
    body = (await me.json()) as typeof body;
  } catch {
    return null;
  }

  if (!body.id || !body.email || body.role !== 'ADMIN') {
    return null;
  }

  const user: AuthUser = {
    id: body.id,
    email: body.email,
    role: 'ADMIN',
  };

  await env.INDEX_KV.put(cacheKey, JSON.stringify(user), {
    expirationTtl: CACHE_TTL_SECONDS,
  });

  return user;
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}
