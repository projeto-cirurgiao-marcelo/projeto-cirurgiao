/**
 * Contador de vidas salvas. Tudo exige usuário logado (decisão de 10/09);
 * rotas /admin/lives-saved exigem ADMIN no backend.
 */
import { apiClient } from './client';
import type {
  AdminReportDetail,
  AdminReportRow,
  AdminStats,
  DisplayToken,
  LifeSavedStatus,
  LifeSavedSummary,
  MediaKind,
  ReportInput,
  Story,
  StoryCard,
  WallDot,
} from '@/lib/types/lives-saved.types';

/** Tetos espelhados do backend (MEDIA_LIMITS). HEIC fica fora na web: browser não renderiza. */
export const MEDIA_ACCEPT: Record<MediaKind, { mimes: string[]; maxBytes: number; maxFiles: number }> = {
  PHOTO: { mimes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 15 * 1024 * 1024, maxFiles: 10 },
  VIDEO: { mimes: ['video/mp4', 'video/quicktime'], maxBytes: 500 * 1024 * 1024, maxFiles: 3 },
};

export const livesSavedService = {
  // ---- leitura ----
  async summary(): Promise<LifeSavedSummary> {
    return (await apiClient.get<LifeSavedSummary>('/lives-saved/summary')).data;
  },
  async wall(): Promise<{ total: number; dots: WallDot[] }> {
    return (await apiClient.get('/lives-saved/wall')).data;
  },
  async stories(cursor?: string, limit = 12): Promise<{ items: StoryCard[]; nextCursor: string | null }> {
    return (await apiClient.get('/lives-saved/stories', { params: { cursor, limit } })).data;
  },
  async story(id: string): Promise<Story> {
    return (await apiClient.get<Story>(`/lives-saved/stories/${id}`)).data;
  },

  // ---- autor ----
  async mine(): Promise<Story[]> {
    return (await apiClient.get<Story[]>('/lives-saved/mine')).data;
  },
  async createDraft(): Promise<Story> {
    return (await apiClient.post<Story>('/lives-saved')).data;
  },
  async update(id: string, input: ReportInput): Promise<Story> {
    return (await apiClient.patch<Story>(`/lives-saved/${id}`, input)).data;
  },
  async submit(id: string): Promise<Story> {
    return (await apiClient.post<Story>(`/lives-saved/${id}/submit`)).data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/lives-saved/${id}`);
  },
  async removeMedia(id: string, mediaId: string): Promise<void> {
    await apiClient.delete(`/lives-saved/${id}/media/${mediaId}`);
  },

  /**
   * Upload direto no R2: pede a URL assinada, faz PUT com progresso, confirma.
   * Exige CORS de PUT no bucket (fase 0 do plano).
   */
  async uploadMedia(
    reportId: string,
    file: File,
    kind: MediaKind,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    const { data } = await apiClient.post<{ mediaId: string; url: string }>(
      `/lives-saved/${reportId}/media/upload-url`,
      { kind, mimeType: file.type, sizeBytes: file.size },
    );
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload falhou (${xhr.status})`));
      xhr.onerror = () => reject(new Error('Upload falhou. Verifique a conexão.'));
      xhr.send(file);
    });
    await apiClient.post(`/lives-saved/${reportId}/media/${data.mediaId}/confirm`);
  },

  // ---- admin ----
  async adminStats(): Promise<AdminStats> {
    return (await apiClient.get<AdminStats>('/admin/lives-saved/stats')).data;
  },
  async adminList(status?: LifeSavedStatus, page = 1, pageSize = 50) {
    return (
      await apiClient.get<{ items: AdminReportRow[]; total: number; page: number; pageSize: number }>(
        '/admin/lives-saved',
        { params: { status, page, pageSize } },
      )
    ).data;
  },
  async adminDetail(id: string): Promise<AdminReportDetail> {
    return (await apiClient.get<AdminReportDetail>(`/admin/lives-saved/${id}`)).data;
  },
  async approve(id: string): Promise<void> {
    await apiClient.post(`/admin/lives-saved/${id}/approve`);
  },
  async reject(id: string, reason: string): Promise<void> {
    await apiClient.post(`/admin/lives-saved/${id}/reject`, { reason });
  },
  async adminRemoveMedia(id: string, mediaId: string): Promise<void> {
    await apiClient.delete(`/admin/lives-saved/${id}/media/${mediaId}`);
  },
  async adminCreate(input: ReportInput & { reporterName: string; attribution: string; onBehalfOfName?: string }) {
    return (await apiClient.post<AdminReportRow>('/admin/lives-saved', input)).data;
  },

  // ---- credenciais da tela corporativa ----
  async displayTokens(): Promise<DisplayToken[]> {
    return (await apiClient.get<DisplayToken[]>('/admin/lives-saved/display-tokens')).data;
  },
  /** O `token` em claro só vem nesta resposta; depois existe só o hash. */
  async createDisplayToken(label: string): Promise<{ id: string; label: string; token: string }> {
    return (await apiClient.post('/admin/lives-saved/display-tokens', { label })).data;
  },
  async revokeDisplayToken(id: string): Promise<void> {
    await apiClient.delete(`/admin/lives-saved/display-tokens/${id}`);
  },
};

export default livesSavedService;
