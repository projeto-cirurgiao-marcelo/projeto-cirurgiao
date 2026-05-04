export interface Env {
  BUCKET: R2Bucket;
  INDEX_KV: KVNamespace;
  CDN_BASE_URL: string;
  BACKEND_API_URL: string;
  ALLOWED_ORIGINS: string;
  INDEX_PREFIX?: string;
}

export interface FolderNode {
  fullPath: string;
  parentName: string;
  ancestors: string[];
  depth: number;
  hasPlaylist: boolean;
  fileCount: number;
}

export interface FolderIndex {
  builtAt: string;
  folderCount: number;
  folders: FolderNode[];
}

export interface ObjectMeta {
  key: string;
  size: number;
  uploaded: string;
  etag: string;
  contentType?: string;
}

export interface ListResponse {
  prefix: string;
  folders: string[];
  objects: ObjectMeta[];
  cursor?: string;
  truncated: boolean;
}

export interface SearchHit {
  fullPath: string;
  parentName: string;
  score: number;
  hasPlaylist: boolean;
  fileCount: number;
}

export interface SearchResponse {
  query: string;
  matches: SearchHit[];
  indexBuiltAt: string;
}

export const INDEX_KEY = 'folder-index:v1';
export const INDEX_TTL_SECONDS = 86400 * 7; // 7 day safety net; cron overwrites hourly
export const JOB_KEY = 'reindex-job:active';
export const JOB_TTL_SECONDS = 3600; // job state expires in 1h if abandoned

export interface ReindexJobState {
  startedAt: string;
  prefix: string;
  cursor?: string;
  scanned: number;
  playlistsFound: number;
  partial: FolderNode[]; // accumulated nodes (deduped by fullPath)
}

export interface ReindexProgress {
  done: boolean;
  scanned: number;
  playlistsFound: number;
  folderCount: number;
  cursor?: string;
  builtAt?: string;
  durationMs: number;
}
