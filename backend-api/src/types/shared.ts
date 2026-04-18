/**
 * Public API contract shapes — copied by teammates A (frontend-web) and
 * B (mobile-app) into their own worktrees when they need typed access to
 * these payloads. **Do not** symlink or merge this file across tracks;
 * teammates copy the literal contents and re-export from their own
 * module graph.
 *
 * Only place types here when they are part of the HTTP contract (request
 * bodies, response shapes, shared enums). Internal backend types stay
 * where they live today.
 */

// ============================================
// Videos
// ============================================

/**
 * Supported `videos.videoSource` values. Matches the DB column and the
 * VideoSource enum in backend-api/src/modules/videos/dto/create-video.dto.ts.
 */
export type VideoSource =
  | 'cloudflare'
  | 'youtube'
  | 'vimeo'
  | 'external'
  | 'r2_hls';

/**
 * Rendering kind the player should use — decoupled from `videoSource`.
 *
 *   - `hls`    → load `playbackUrl` in an HLS player (hls.js, expo-video,
 *                AVPlayer). Inspect `captionsEmbedded` to decide whether
 *                a separate `captionsUrl` fetch is needed.
 *   - `iframe` → render `playbackUrl` in an <iframe>. Provider owns the
 *                UI (YouTube/Vimeo/generic embed).
 *   - `none`   → nothing playable yet (`playbackUrl` is null). Show a
 *                placeholder or 'Processando…' state.
 */
export type VideoPlaybackKind = 'hls' | 'iframe' | 'none';

/**
 * Returned by every endpoint that ships a Video to the frontend.
 * See docs/API-CHANGES-SPRINT.md §"Video payload com playback URLs".
 *
 * Invariants:
 *   - `kind: 'hls'`    → `playbackUrl` non-null, `captionsEmbedded` boolean.
 *   - `kind: 'iframe'` → `playbackUrl` non-null, `captionsEmbedded` undefined.
 *   - `kind: 'none'`   → `playbackUrl` null, `captionsEmbedded` undefined.
 *
 * `captionsUrl` (cloudflare flow) is **web-only today**. Mobile clients
 * should ignore it even when present — see API-CHANGES-SPRINT.md for
 * rationale.
 */
export interface VideoPlaybackUrls {
  kind: VideoPlaybackKind;
  /** Where the player loads the stream. null when kind === 'none'. */
  playbackUrl: string | null;
  /**
   * True when captions are carried inside the HLS manifest (SUBTITLES
   * group or CC track) and the player can switch tracks without a
   * separate URL. Only meaningful when `kind === 'hls'`; undefined
   * otherwise.
   */
  captionsEmbedded?: boolean;
  /** Separate captions URL (VTT). Web-only for the cloudflare flow. */
  captionsUrl?: string;
  /** Thumbnail override. */
  poster?: string;
}

export interface VideoPayload {
  id: string;
  title: string;
  description: string | null;
  moduleId: string;
  order: number;
  duration: number;
  isPublished: boolean;
  uploadStatus: string;
  uploadProgress: number;
  uploadError: string | null;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  cloudflareId: string | null;
  cloudflareUrl: string | null;
  externalUrl: string | null;
  videoSource: VideoSource;
  createdAt: string;
  updatedAt: string;
  playback: VideoPlaybackUrls;
}

/**
 * Request body for POST /api/v1/modules/:moduleId/videos/from-r2-hls.
 */
export interface CreateVideoFromR2HlsRequest {
  /** Master playlist URL, must end in `.m3u8`. */
  hlsUrl: string;
  /** Seconds, must be > 0. */
  duration: number;
  /** Defaults to true. Legendas vêm no SUBTITLES group. */
  captionsEmbedded?: boolean;
  title: string;
  description?: string;
  /** Auto-assigned to next free slot when omitted. */
  order?: number;
  thumbnailUrl?: string;
}

// ============================================
// Async jobs (BullMQ)
// ============================================

/**
 * Lifecycle states for a job surfaced via GET /api/v1/jobs/:id.
 * Transitions:
 *   queued → active → completed | failed
 *   active → failed (processor throws)
 */
export type JobStatus =
  | 'queued'
  | 'active'
  | 'completed'
  | 'failed'
  | 'unknown';

/**
 * Response body of POST endpoints that moved to async mode (summaries,
 * quizzes, captions, library ingest). Always HTTP 202.
 *
 * - `status='queued'` + real BullMQ id → poll GET /jobs/:id.
 * - `status='completed'` + `inline-<uuid>` id → processed synchronously
 *   because QUEUE_ENABLED=false on the backend. The `resultRef` is the
 *   final artifact id (summary id, quiz id, etc).
 */
export interface EnqueuedJobResponse {
  jobId: string;
  status: 'queued' | 'completed';
  resultRef?: string;
}

/**
 * Response body of GET /api/v1/jobs/:id.
 */
export interface JobStatusResponse {
  id: string;
  /** Which queue the job lives on. 'ai-summary' for inline jobs (static). */
  type:
    | 'ai-summary'
    | 'ai-quiz'
    | 'library-pdf-ingest'
    | 'cloudflare-captions';
  status: JobStatus;
  /** 0–100 when the processor publishes progress; 0 otherwise. */
  progress: number;
  /** Artifact id when the job produced one (typically on status='completed'). */
  resultRef?: string;
  /** Human-readable failure message; populated when status='failed'. */
  error?: string;
  /** ISO 8601 UTC timestamps. */
  createdAt: string;
  updatedAt: string;
}
