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
  /** Aulas concluídas SÓ entre as da vitrine ("2/19", não "2/91" do curso de origem). */
  completedVideos?: number;
  /** % binário sobre as aulas da vitrine. */
  progressPercentage?: number;
}

export interface MyShowcases {
  /** true = acesso total (grandfather/pós) — a UI não mostra cards de vitrine */
  grantsAllContent: boolean;
  showcases: MyShowcase[];
}

export interface AvailableShowcase {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  videoCount: number;
  /** URL de checkout TheMembers. null = produto ainda não vendável ("Em breve"). */
  checkoutUrl: string | null;
}

export interface AvailableShowcases {
  showcases: AvailableShowcase[];
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

/**
 * Vitrine bloqueada aberta em modo prévia ("Continue evoluindo" → detalhe).
 * Mesmo índice de aulas do detalhe possuído; cada aula abre no watch, onde
 * o gate corta em `previewSeconds`.
 */
export interface AvailableShowcaseDetail extends MyShowcaseDetail {
  checkoutUrl: string | null;
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

  /**
   * Vitrines publicadas que o aluno NÃO possui (superfície de upsell).
   * Backend devolve lista vazia para admin/instrutor e para quem tem
   * acesso total (grantsAllContent) — sem guard extra no cliente.
   */
  async availableShowcases(): Promise<AvailableShowcases> {
    const response = await apiClient.get<AvailableShowcases>('/showcases/available');
    return response.data;
  },

  /** Detalhe (aulas + checkout) de uma vitrine que o aluno ainda não possui. */
  async availableShowcaseDetail(slug: string): Promise<AvailableShowcaseDetail> {
    const response = await apiClient.get<AvailableShowcaseDetail>(
      `/showcases/available/${slug}`,
    );
    return response.data;
  },
};
