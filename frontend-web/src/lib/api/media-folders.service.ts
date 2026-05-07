/**
 * Cliente do backend Media Library admin.
 * Endpoints sob /admin/media — todos exigem ADMIN no backend.
 */
import { apiClient } from './client';
import type {
  BulkMoveInput,
  CreateFolderInput,
  MediaFolderNode,
  SyncStatusResponse,
  UnassignedVideo,
  UpdateFolderInput,
} from '@/lib/types/media-folder.types';

export const mediaFoldersService = {
  async listFolders(): Promise<MediaFolderNode[]> {
    const res = await apiClient.get<MediaFolderNode[]>('/admin/media/folders');
    return res.data;
  },

  async createFolder(input: CreateFolderInput): Promise<MediaFolderNode> {
    const res = await apiClient.post<MediaFolderNode>(
      '/admin/media/folders',
      input,
    );
    return res.data;
  },

  async updateFolder(
    id: string,
    input: UpdateFolderInput,
  ): Promise<MediaFolderNode> {
    const res = await apiClient.patch<MediaFolderNode>(
      `/admin/media/folders/${id}`,
      input,
    );
    return res.data;
  },

  async deleteFolder(id: string): Promise<{ ok: boolean }> {
    const res = await apiClient.delete<{ ok: boolean }>(
      `/admin/media/folders/${id}`,
    );
    return res.data;
  },

  async moveVideo(
    videoId: string,
    folderId: string | null,
  ): Promise<{ id: string; folderId: string | null }> {
    const res = await apiClient.patch(`/admin/media/videos/${videoId}/folder`, {
      folderId,
    });
    return res.data;
  },

  async bulkMove(input: BulkMoveInput): Promise<{ moved: number }> {
    const res = await apiClient.post<{ moved: number }>(
      '/admin/media/videos/bulk-move',
      input,
    );
    return res.data;
  },

  async listUnassigned(): Promise<UnassignedVideo[]> {
    const res = await apiClient.get<UnassignedVideo[]>(
      '/admin/media/unassigned',
    );
    return res.data;
  },

  async listVideosInFolder(folderId: string): Promise<UnassignedVideo[]> {
    const res = await apiClient.get<UnassignedVideo[]>(
      `/admin/media/folders/${folderId}/videos`,
    );
    return res.data;
  },

  async getSyncStatus(): Promise<SyncStatusResponse> {
    const res = await apiClient.get<SyncStatusResponse>(
      '/admin/media/sync-status',
    );
    return res.data;
  },
};

export default mediaFoldersService;
