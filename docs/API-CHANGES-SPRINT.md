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
