/**
 * Vitrines do aluno ("Meus Cursos") — espelha o web
 * frontend-web/src/lib/api/showcases.service.ts (lado aluno).
 */
import { apiClient } from './client';

export interface MyShowcase {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  videoCount: number;
}

export interface MyShowcases {
  /** true = acesso total (grandfather/pós) — a UI não mostra cards de vitrine */
  grantsAllContent: boolean;
  showcases: MyShowcase[];
}

export interface MyShowcaseVideo {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl: string | null;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
}

export interface MyShowcaseDetail extends Omit<MyShowcase, 'videoCount'> {
  videos: MyShowcaseVideo[];
}

export const showcasesService = {
  async myShowcases(): Promise<MyShowcases> {
    const response = await apiClient.get<MyShowcases>('/showcases/mine');
    return response.data;
  },

  async myShowcaseDetail(slug: string): Promise<MyShowcaseDetail> {
    const response = await apiClient.get<MyShowcaseDetail>(`/showcases/mine/${slug}`);
    return response.data;
  },
};
