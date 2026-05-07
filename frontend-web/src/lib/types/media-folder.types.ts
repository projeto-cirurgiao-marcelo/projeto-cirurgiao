/**
 * Tipos da Media Library admin (modelo hibrido: storage R2 imutavel,
 * organizacao em DB via MediaFolder + Video.folderId).
 */

export interface MediaFolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  courseId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    videos: number;
    children: number;
  };
}

export interface UnassignedVideo {
  id: string;
  title: string;
  hlsUrl: string | null;
  r2Basename: string | null;
  thumbnailUrl: string | null;
  duration: number;
  createdAt: string;
  folderId: string | null;
}

export interface SyncStatusPending {
  r2Basename: string;
  fullPath: string;
  hlsUrl: string;
  fileCount: number;
}

export interface SyncStatusResponse {
  indexBuiltAt: string | null;
  totalInR2: number;
  totalInDb: number;
  pendingCount: number;
  pending: SyncStatusPending[];
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  courseId?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  position?: number;
  courseId?: string | null;
}

export interface BulkMoveInput {
  videoIds: string[];
  folderId: string | null;
}
