import { apiClient } from './client';

export interface VideoNote {
  id: string;
  videoId: string;
  userId: string;
  content: string;
  timestamp: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoNoteWithVideo extends VideoNote {
  video: {
    id: string;
    title: string;
    module: {
      id: string;
      title: string;
      course: {
        id: string;
        title: string;
      };
    };
  };
}

export interface CreateNoteDto {
  content: string;
  timestamp?: number;
}

export interface UpdateNoteDto {
  content?: string;
  timestamp?: number;
}

export const notesService = {
  /**
   * Criar uma nova nota para um vídeo
   */
  async create(videoId: string, data: CreateNoteDto): Promise<VideoNote> {
    const response = await apiClient.post<VideoNote>(`/videos/${videoId}/notes`, data);
    return response.data;
  },

  /**
   * Listar notas do usuário para um vídeo
   */
  async getByVideo(videoId: string): Promise<VideoNote[]> {
    const response = await apiClient.get<VideoNote[]>(`/videos/${videoId}/notes`);
    return response.data;
  },

  /**
   * Contar notas do usuário para um vídeo
   */
  async countByVideo(videoId: string): Promise<{ count: number }> {
    const response = await apiClient.get<{ count: number }>(`/videos/${videoId}/notes/count`);
    return response.data;
  },

  /**
   * Listar todas as notas do usuário
   */
  async getAll(limit?: number): Promise<VideoNoteWithVideo[]> {
    const params = limit ? { limit: limit.toString() } : {};
    const response = await apiClient.get<VideoNoteWithVideo[]>('/notes', { params });
    return response.data;
  },

  /**
   * Buscar uma nota específica
   */
  async getById(noteId: string): Promise<VideoNote> {
    const response = await apiClient.get<VideoNote>(`/notes/${noteId}`);
    return response.data;
  },

  /**
   * Atualizar uma nota
   */
  async update(noteId: string, data: UpdateNoteDto): Promise<VideoNote> {
    const response = await apiClient.put<VideoNote>(`/notes/${noteId}`, data);
    return response.data;
  },

  /**
   * Excluir uma nota
   */
  async delete(noteId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/notes/${noteId}`);
    return response.data;
  },
};
