/**
 * Cliente do admin de vitrines. Endpoints sob /admin/showcases —
 * todos exigem ADMIN no backend.
 */
import { apiClient } from './client';
import type {
  CourseTreeItem,
  OrphanVideo,
  Showcase,
  ShowcaseDetail,
  ShowcaseInput,
  VideoSearchResult,
} from '@/lib/types/showcase.types';

export const showcasesService = {
  async list(includeArchived = false): Promise<Showcase[]> {
    const res = await apiClient.get<Showcase[]>('/admin/showcases', {
      params: includeArchived ? { includeArchived: 'true' } : undefined,
    });
    return res.data;
  },

  async get(id: string): Promise<ShowcaseDetail> {
    const res = await apiClient.get<ShowcaseDetail>(`/admin/showcases/${id}`);
    return res.data;
  },

  async create(input: ShowcaseInput): Promise<Showcase> {
    const res = await apiClient.post<Showcase>('/admin/showcases', input);
    return res.data;
  },

  async update(id: string, input: ShowcaseInput): Promise<Showcase> {
    const res = await apiClient.patch<Showcase>(`/admin/showcases/${id}`, input);
    return res.data;
  },

  async archive(id: string): Promise<{ id: string; archived: boolean }> {
    const res = await apiClient.delete(`/admin/showcases/${id}`);
    return res.data;
  },

  async restore(id: string): Promise<Showcase> {
    const res = await apiClient.post<Showcase>(`/admin/showcases/${id}/restore`);
    return res.data;
  },

  async addVideos(
    id: string,
    videoIds: string[],
  ): Promise<{ added: number; requested: number }> {
    const res = await apiClient.post(`/admin/showcases/${id}/videos`, { videoIds });
    return res.data;
  },

  /** Materializa uma linha por aula do módulo agora — não é vínculo dinâmico. */
  async addModuleVideos(
    id: string,
    moduleId: string,
    options?: { includeSubmodules?: boolean; includeUnpublished?: boolean },
  ): Promise<{ added: number; requested: number; moduleTitle: string }> {
    const res = await apiClient.post(`/admin/showcases/${id}/videos/from-module`, {
      moduleId,
      ...options,
    });
    return res.data;
  },

  async removeVideo(id: string, videoId: string): Promise<{ removed: boolean }> {
    const res = await apiClient.delete(`/admin/showcases/${id}/videos/${videoId}`);
    return res.data;
  },

  async searchVideos(q: string, showcaseId?: string): Promise<VideoSearchResult[]> {
    const res = await apiClient.get<VideoSearchResult[]>(
      '/admin/showcases/videos/search',
      { params: { q, ...(showcaseId ? { showcaseId } : {}) } },
    );
    return res.data;
  },

  async listOrphanVideos(courseId?: string): Promise<OrphanVideo[]> {
    const res = await apiClient.get<OrphanVideo[]>('/admin/showcases/orphan-videos', {
      params: courseId ? { courseId } : undefined,
    });
    return res.data;
  },

  async courseTree(): Promise<CourseTreeItem[]> {
    const res = await apiClient.get<CourseTreeItem[]>('/admin/showcases/course-tree');
    return res.data;
  },
};

export default showcasesService;
