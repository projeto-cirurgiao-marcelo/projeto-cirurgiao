import { apiClient } from './client';
import type { VideoNote, CreateNoteDto, UpdateNoteDto } from '../../types/notes.types';

export const notesService = {
  async listByVideo(videoId: string): Promise<VideoNote[]> {
    try {
      const response = await apiClient.get<VideoNote[]>(`/videos/${videoId}/notes`);
      return response.data;
    } catch (error) {
      console.error('[notesService] Erro ao listar notas:', error);
      return [];
    }
  },

  async countByVideo(videoId: string): Promise<number> {
    try {
      const response = await apiClient.get<{ count: number }>(`/videos/${videoId}/notes/count`);
      return response.data.count;
    } catch (error) {
      console.error('[notesService] Erro ao contar notas:', error);
      return 0;
    }
  },

  async create(videoId: string, dto: CreateNoteDto): Promise<VideoNote> {
    const response = await apiClient.post<VideoNote>(`/videos/${videoId}/notes`, dto);
    return response.data;
  },

  async update(noteId: string, dto: UpdateNoteDto): Promise<VideoNote> {
    const response = await apiClient.put<VideoNote>(`/notes/${noteId}`, dto);
    return response.data;
  },

  async delete(noteId: string): Promise<void> {
    await apiClient.delete(`/notes/${noteId}`);
  },
};

export default notesService;
