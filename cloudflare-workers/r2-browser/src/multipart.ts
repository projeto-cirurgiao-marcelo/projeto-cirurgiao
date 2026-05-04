import type { Env } from './types';

/**
 * Multipart upload endpoints backed by the R2 binding.
 * No S3 access keys are exposed to the browser; the Worker mediates auth
 * and proxies upload-part requests so each chunk goes straight to R2.
 *
 * Flow:
 *   1) POST /multipart/create   → uploadId
 *   2) PUT  /multipart/upload-part?key=...&uploadId=...&partNumber=N (body=chunk)
 *      response: { partNumber, etag }
 *   3) POST /multipart/complete (parts ordered)
 *   4) POST /multipart/abort
 */

const ALLOWED_PREFIX = 'inbox/';
const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.mkv'] as const;
const MIN_PART_BYTES = 5 * 1024 * 1024; // R2 minimum
const MAX_PART_BYTES = 5 * 1024 * 1024 * 1024; // R2 max per part (5GB)

interface CreateBody {
  key: string;
  contentType?: string;
  customMetadata?: Record<string, string>;
}

interface CompleteBody {
  key: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
}

interface AbortBody {
  key: string;
  uploadId: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function validateKey(key: string): string | null {
  if (!key) return 'key required';
  if (key.startsWith('/')) return 'key must not start with /';
  if (key.includes('..')) return 'key must not contain ..';
  if (!key.startsWith(ALLOWED_PREFIX)) {
    return `key must start with ${ALLOWED_PREFIX}`;
  }
  const lower = key.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return `key must end with one of: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  return null;
}

function detectContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  return 'application/octet-stream';
}

export async function handleMultipartCreate(
  req: Request,
  env: Env,
): Promise<Response> {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400);
  }
  const err = validateKey(body.key);
  if (err) return jsonResponse({ error: err }, 400);

  const contentType = body.contentType || detectContentType(body.key);

  const upload = await env.BUCKET.createMultipartUpload(body.key, {
    httpMetadata: { contentType },
    customMetadata: body.customMetadata,
  });

  return jsonResponse({
    key: upload.key,
    uploadId: upload.uploadId,
    contentType,
  });
}

export async function handleMultipartUploadPart(
  req: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const uploadId = url.searchParams.get('uploadId');
  const partNumberRaw = url.searchParams.get('partNumber');

  if (!key || !uploadId || !partNumberRaw) {
    return jsonResponse(
      { error: 'key, uploadId, partNumber required' },
      400,
    );
  }
  const err = validateKey(key);
  if (err) return jsonResponse({ error: err }, 400);

  const partNumber = parseInt(partNumberRaw, 10);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
    return jsonResponse({ error: 'partNumber must be 1..10000' }, 400);
  }

  const contentLength = parseInt(
    req.headers.get('content-length') ?? '0',
    10,
  );
  if (
    !Number.isFinite(contentLength) ||
    contentLength <= 0 ||
    contentLength > MAX_PART_BYTES
  ) {
    return jsonResponse({ error: 'invalid content-length' }, 400);
  }
  // R2 enforces min 5MB except for the LAST part — we cannot know which is last
  // here, so reject obvious junk but trust the client to send the tail short.
  if (contentLength < 1024) {
    return jsonResponse({ error: 'part too small' }, 400);
  }

  const upload = env.BUCKET.resumeMultipartUpload(key, uploadId);
  if (!req.body) return jsonResponse({ error: 'empty body' }, 400);

  const uploaded = await upload.uploadPart(partNumber, req.body);

  return jsonResponse({
    partNumber: uploaded.partNumber,
    etag: uploaded.etag,
  });
}

export async function handleMultipartComplete(
  req: Request,
  env: Env,
): Promise<Response> {
  let body: CompleteBody;
  try {
    body = (await req.json()) as CompleteBody;
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400);
  }
  if (!body.key || !body.uploadId || !Array.isArray(body.parts)) {
    return jsonResponse(
      { error: 'key, uploadId, parts required' },
      400,
    );
  }
  const err = validateKey(body.key);
  if (err) return jsonResponse({ error: err }, 400);
  if (body.parts.length === 0) {
    return jsonResponse({ error: 'parts must be non-empty' }, 400);
  }

  const upload = env.BUCKET.resumeMultipartUpload(body.key, body.uploadId);
  const result = await upload.complete(
    body.parts
      .slice()
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((p) => ({ partNumber: p.partNumber, etag: p.etag })),
  );

  return jsonResponse({
    key: result.key,
    etag: result.httpEtag,
    size: result.size,
    uploaded: result.uploaded.toISOString(),
  });
}

export async function handleMultipartAbort(
  req: Request,
  env: Env,
): Promise<Response> {
  let body: AbortBody;
  try {
    body = (await req.json()) as AbortBody;
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400);
  }
  if (!body.key || !body.uploadId) {
    return jsonResponse({ error: 'key, uploadId required' }, 400);
  }
  const err = validateKey(body.key);
  if (err) return jsonResponse({ error: err }, 400);

  const upload = env.BUCKET.resumeMultipartUpload(body.key, body.uploadId);
  await upload.abort();

  return jsonResponse({ ok: true });
}

export const MULTIPART_LIMITS = {
  minPartBytes: MIN_PART_BYTES,
  maxPartBytes: MAX_PART_BYTES,
  allowedPrefix: ALLOWED_PREFIX,
  allowedExtensions: ALLOWED_EXTENSIONS,
};
