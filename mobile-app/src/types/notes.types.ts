export interface VideoNote {
  id: string;
  videoId: string;
  userId: string;
  content: string;
  timestamp: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  content: string;
  timestamp?: number;
}

export interface UpdateNoteDto {
  content?: string;
  timestamp?: number;
}
