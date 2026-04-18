# API Changes — Sprint final (track backend-video)

Running log of backend contract changes that frontends (web, mobile) must
adopt. Each entry should include: the endpoints affected, the exact new
behaviour, HTTP-level details (status codes, headers, response shape
deltas), and migration notes.

This file is owned by Teammate C (backend). When you change a public
contract, add a section here **and** ping the team channel.

---

## Rate limit por usuário — 429 em endpoints de IA

**Effective:** starting with commits on branch `track/backend-video`
(release TBD).

**Motivation:** the app-wide ThrottlerGuard already enforces IP-based
caps (20 rps "short", 100 rpm "medium"). Without a per-user limit, a
single authenticated user with multiple devices/sessions can still burn
Vertex AI budget. This change adds a **complementary** per-user throttle
on the endpoints that trigger Vertex AI calls.

**Default limit:** 30 requests per minute per authenticated user.
Configurable via the `AI_USER_THROTTLE_RPM` environment variable on the
backend; frontends do not need to read this value.

**Endpoints covered:**

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/v1/videos/:videoId/summaries/generate` | `ai-summaries.controller` |
| `POST` | `/api/v1/chat/conversations/:id/messages` | `ai-chat.controller` (video RAG chat) |
| `POST` | `/api/v1/library/chat/conversations/:id/messages` | `ai-library.controller` (books RAG chat) |
| `POST` | `/api/v1/library/admin/documents/ingest` | `ai-library.controller` (admin ingest) |
| `POST` | `/api/v1/videos/:videoId/quizzes/generate` | `quizzes.controller` |

**Response on breach:**

- Status: `429 Too Many Requests`
- Headers (set by `@nestjs/throttler`):
  - `X-RateLimit-Limit` — the cap (e.g. `30`)
  - `X-RateLimit-Remaining` — `0` when throttled
  - `X-RateLimit-Reset` — seconds until the window rolls over
  - `Retry-After` — seconds the client should wait before retrying
- Body: standard NestJS `ThrottlerException` — `{"statusCode":429,"message":"ThrottlerException: Too Many Requests"}`

The IP-based throttler can still fire (same shape, same headers) — treat
both the same way client-side.

**Tracker keying:** the guard reads `req.user.sub` (JWT) or `req.user.id`
(Firebase guard) to key each user, falling back to the remote IP for
the rare anonymous path. That means you cannot dodge the cap by opening
multiple browser tabs — the count is shared across sessions for the same
user.

**Client guidance:**

1. On `429`, honour `Retry-After` and surface a friendly message
   ("Muitas requisições ao assistente — tente de novo em N s").
2. Do not retry automatically more than once; if the second attempt
   also `429`s, back off to the next UI action.
3. The IP-based cap is the last line of defence against unauth abuse —
   if you see `429` from an endpoint that has no user context, it's
   likely that one.

---

## Video payload com playback URLs

**Effective:** same branch / release TBD.

Every endpoint that returns a `Video` row now attaches a `playback`
object derived from `videoSource`, so the player does not need to
branch on the source field. The base Video shape is unchanged; the
new field is additive.

**Affected endpoints:**

- `GET /api/v1/videos/:id` — returns `Video & { playback }`
- `GET /api/v1/modules/:moduleId/videos` — returns `Array<Video & { playback }>`
- `POST /api/v1/modules/:moduleId/videos/from-r2-hls` — returns `Video & { playback }`

**Shape of `playback`:**

```ts
interface VideoPlaybackUrls {
  /** Where the player loads the stream. Null if the Video is not yet ready. */
  playbackUrl: string | null;
  /** Separate captions endpoint, when captions are NOT embedded in the stream. */
  captionsUrl?: string;
  /** Thumbnail override; same as video.thumbnailUrl when set. */
  poster?: string;
}
```

**Per-source rules:**

| `videoSource` | `playbackUrl` | `captionsUrl` | Notes |
| --- | --- | --- | --- |
| `cloudflare` | `video.cloudflareUrl` | `/api/v1/captions/:videoId/pt-BR` (only when `cloudflareId` is set) | Backend proxies the VTT to keep auth server-side. |
| `youtube` | `video.externalUrl` | omitted | Player renders an iframe; YouTube serves its own captions inside. |
| `vimeo` | `video.externalUrl` | omitted | Same as YouTube. |
| `external` | `video.externalUrl` | omitted | Generic iframe. |
| `r2_hls` | `video.hlsUrl` | omitted | Legendas vêm no SUBTITLES group do master playlist — player consome direto. |

**Client guidance:**

- Stop reading `cloudflareUrl` / `hlsUrl` / `externalUrl` directly; use
  `playback.playbackUrl` and switch rendering based on `videoSource`
  (iframe for youtube/vimeo/external, HLS for cloudflare/r2_hls).
- Treat `playback.captionsUrl === undefined` as "no separate captions
  resource" — for `r2_hls` the player should still surface track
  switching from the manifest's SUBTITLES group. Not a bug.

---

## POST /modules/:moduleId/videos/from-r2-hls

**Effective:** same branch / release TBD.

New endpoint to register videos that come out of the external
FFmpeg+Whisper pipeline. The backend does **not** process anything —
it just records the finished master playlist.

- **Auth:** `FirebaseAuthGuard` + `RolesGuard` — allowed roles:
  `INSTRUCTOR`, `ADMIN` (instructor must own the course that contains
  the module).
- **Status:** `201 Created`.
- **Returns:** `Video & { playback }` (same shape as `GET /videos/:id`).

**Request body (`CreateVideoFromR2HlsDto`):**

```jsonc
{
  "hlsUrl": "https://cdn.example.com/videos/<path>/<basename>/playlist.m3u8",
  "duration": 900,            // seconds, required, > 0
  "captionsEmbedded": true,    // default true — legendas no SUBTITLES group
  "title": "Colectomia em felinos",
  "description": "...",        // optional
  "order": 3,                  // optional; auto-assigned to next free slot when omitted
  "thumbnailUrl": "https://cdn.example.com/videos/.../thumb.jpg"  // optional
}
```

**Validation errors (`400 Bad Request`):**

- `hlsUrl` must be a valid URL ending in `.m3u8` (with or without query string).
- `duration` must be a positive integer.
- `title` is required and non-empty.
- Any extra unknown field trips `ValidationPipe({ forbidNonWhitelisted: true })`.

**Persistence side effects:**

- `videoSource = 'r2_hls'`
- `uploadStatus = 'READY'`, `uploadProgress = 100`
- `isPublished = false` (toggle separately with `PATCH /videos/:id/toggle-publish`)
- `cloudflareId`, `cloudflareUrl`, `externalUrl` stay null.

**When `order` is omitted**, the service calls `getNextOrder(moduleId)`
and uses that. If the caller passes an `order` that already exists in
the module, responds `400 { "statusCode": 400, "message": "Já existe um vídeo com esta ordem neste módulo" }`.

---

## AI endpoints → 202 Accepted + GET /jobs/:id (async queue)

**Effective:** same branch / release TBD. **Breaking** for the 4 AI
endpoints listed below — the response **status code changed** and the
body shape changed.

### Why

Summary/quiz/library-ingest/captions generation can each take tens of
seconds on Vertex. Blocking the HTTP request during that work triggers
Cloud Run 60s idle timeouts and forces the client to hold a connection
forever. The endpoints now enqueue the work on a BullMQ queue (backed
by Cloud Memorystore) and return a jobId that the client polls.

### Feature flag

Queue uptake is gated by `QUEUE_ENABLED` on the backend:

- `QUEUE_ENABLED=true` → real BullMQ. Endpoints return
  `202 { jobId: <BullMQ id>, status: "queued" }`.
- `QUEUE_ENABLED=false` (default) → backend executes the work inline
  **synchronously** and returns
  `202 { jobId: "inline-<uuid>", status: "completed", resultRef: <artifact id> }`.

Either way the HTTP status is **202** and the body shape is identical,
so the frontend does **not** have to branch on the flag. Poll only when
`status === "queued"`.

### Endpoints moved to 202

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/v1/videos/:videoId/summaries/generate` | was 201; now 202 |
| `POST` | `/api/v1/videos/:videoId/quizzes/generate` | was 201; now 202 |
| `POST` | `/api/v1/library/admin/documents/ingest` | was 200; now 202. Body additionally includes the `document` DTO that `AiLibraryService.ingestDocument` returned before (doc id + status), so admins get something tangible back immediately. |
| `POST` | `/api/v1/videos/:videoId/captions/generate` | was 200; now 202 |

### `EnqueuedJobResponse`

```ts
interface EnqueuedJobResponse {
  jobId: string;                     // BullMQ id, OR "inline-<uuid>" when QUEUE_ENABLED=false
  status: 'queued' | 'completed';    // "queued" => poll; "completed" => done inline
  resultRef?: string;                // present when status === 'completed'
}
```

Example (queue on):

```json
{ "jobId": "11", "status": "queued" }
```

Example (queue off / inline):

```json
{
  "jobId": "inline-3f6c3f60-1c51-4e47-8a3b-dcb9b4b3f85a",
  "status": "completed",
  "resultRef": "summary_abc123"
}
```

### GET /api/v1/jobs/:id

Poll this after receiving a 202 with `status: 'queued'`.

- **Auth:** `FirebaseAuthGuard`. Any authenticated user can look up any
  jobId — jobs are opaque uuids, so this is safe-by-obscurity for the
  sprint. If we tighten later, the header will include an ownership
  check and respond `403` for foreign jobs.
- **Status codes:**
  - `200` → job found, body = `JobStatusResponse` below.
  - `404` → jobId not known on any queue and not an `inline-*` id.

**Response body (`JobStatusResponse`):**

```ts
interface JobStatusResponse {
  id: string;                     // echoes :id
  type:
    | 'ai-summary'
    | 'ai-quiz'
    | 'library-pdf-ingest'
    | 'cloudflare-captions';
  status: 'queued' | 'active' | 'completed' | 'failed' | 'unknown';
  progress: number;               // 0-100 when processor publishes; 0 otherwise
  resultRef?: string;             // artifact id (summary id, quiz id, documentId, caption label)
  error?: string;                 // human-readable reason when status === 'failed'
  createdAt: string;              // ISO 8601 UTC
  updatedAt: string;              // ISO 8601 UTC
}
```

Example (active):

```json
{
  "id": "11",
  "type": "ai-summary",
  "status": "active",
  "progress": 42,
  "createdAt": "2026-04-17T23:55:00.000Z",
  "updatedAt": "2026-04-17T23:55:07.411Z"
}
```

Example (completed):

```json
{
  "id": "11",
  "type": "ai-summary",
  "status": "completed",
  "progress": 100,
  "resultRef": "summary_abc123",
  "createdAt": "2026-04-17T23:55:00.000Z",
  "updatedAt": "2026-04-17T23:55:19.772Z"
}
```

Example (failed):

```json
{
  "id": "11",
  "type": "ai-quiz",
  "status": "failed",
  "progress": 0,
  "error": "Vertex AI returned 429: resource exhausted",
  "createdAt": "2026-04-17T23:55:00.000Z",
  "updatedAt": "2026-04-17T23:55:13.104Z"
}
```

### State transitions

```
queued ──► active ──► completed
               └───► failed
```

- `queued` (BullMQ `waiting`/`delayed`/`prioritized`/`waiting-children`):
  accepted into the queue, not yet picked up by a worker.
- `active`: a worker is running the processor.
- `completed`: processor returned successfully; `resultRef` is populated.
- `failed`: processor threw. BullMQ retries up to
  `defaultJobOptions.attempts` (currently 3, exponential backoff
  starting at 2000ms). The `failed` state only sticks after every retry
  is exhausted. `error` carries the last thrown message.
- `unknown`: BullMQ reported a state we do not map (safety net; should
  not appear in practice). Treat as terminal.

### Retention / TTL

Jobs remain retrievable via `GET /jobs/:id` under BullMQ's
`defaultJobOptions.removeOnComplete` / `removeOnFail` settings:

- **Completed jobs**: kept for 24 hours **or** the most recent 1000 —
  whichever boundary is hit first. After that the job is evicted from
  Redis and `GET /jobs/:id` responds `404`.
- **Failed jobs**: kept for 7 days (longer so devs have time to
  debug), with no count cap.

Both durations are configurable — read from `defaultJobOptions` in
`backend-api/src/shared/queue/queue.config.ts`. When Gustav provisions
Memorystore, swap the values via env-driven overrides if 24h/7d do not
fit the prod budget.

### Cancellation

**Not supported in this sprint.** BullMQ has job.remove() but the AI
processors are not cooperative (they do not check a cancellation flag
between Vertex calls), so a mid-flight cancel could still let a job
complete and persist side effects. If a client wants to abandon a job,
just stop polling.

### Admin-only counts endpoint

`GET /api/v1/jobs/counts` — admin-only smoke test. Returns the
`getJobCounts()` shape for each of the 4 queues so Gustav can sanity-
check the queue in prod. Not meant for frontends.

---

## Shared types file — `backend-api/src/types/shared.ts`

Teammates A and B consuming these DTOs literally should copy
`backend-api/src/types/shared.ts` into their own worktree rather than
hand-rolling the shapes. It contains:

- `VideoSource` string literal union
- `VideoPlaybackUrls` / `VideoPayload`
- `CreateVideoFromR2HlsRequest`
- `EnqueuedJobResponse` / `JobStatusResponse` / `JobStatus`

**Copy protocol:** literal file copy (no symlink, no git merge across
worktrees). When the file changes, the backend will bump the section at
the top of this doc and you re-copy. Keep the copy paths consistent
(`frontend-web/src/types/api-shared.ts`, `mobile-app/src/types/api-shared.ts`)
so grep-for-divergence later is cheap.
