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
