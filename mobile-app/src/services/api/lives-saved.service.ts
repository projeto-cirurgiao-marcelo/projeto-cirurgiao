/**
 * Contador de vidas salvas (design docs/plans/2026-09-10-vidas-salvas-design.md).
 * Leituras nunca lançam: a Home mostra o último número conhecido e segue.
 * Escritas lançam, pra tela de formulário mostrar o erro.
 */
import { apiClient } from './client';
import { logger } from '../../lib/logger';

export type LifeSavedStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type AnimalSpecies = 'CANINE' | 'FELINE' | 'EQUINE' | 'BOVINE' | 'WILD' | 'OTHER';
export type LifeSavedImpact = 'DIRECT' | 'INDIRECT';
export type MediaKind = 'PHOTO' | 'VIDEO';

export const SPECIES_LABEL: Record<AnimalSpecies, string> = {
  CANINE: 'Canino',
  FELINE: 'Felino',
  EQUINE: 'Equino',
  BOVINE: 'Bovino',
  WILD: 'Silvestre',
  OTHER: 'Outra',
};

export const STATUS_LABEL: Record<LifeSavedStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Devolvido',
};

export interface LifeSavedSummary {
  total: number;
  newThisWeek: number;
  lastApprovedAt: string | null;
  lastOccurredAt: string | null;
  lastSpecies: AnimalSpecies | null;
}

/** Uma linha do livro de registro. Privado: procedimento e autor vêm nulos. */
export interface WallEntry {
  id: string;
  seq: number;
  approvedAt: string | null;
  occurredAt: string | null;
  species: AnimalSpecies | null;
  isMine: boolean;
  isPublic: boolean;
  procedureSummary: string | null;
  reporterDisplay: string | null;
}

export interface LifeSavedMedia {
  id: string;
  kind: MediaKind;
  url: string;
  mimeType: string;
  caption: string | null;
  order: number;
  status: 'UPLOADING' | 'READY';
}

export interface StoryCard {
  id: string;
  seq?: number | null;
  species: AnimalSpecies | null;
  animalName: string | null;
  occurredAt: string | null;
  approvedAt: string | null;
  procedureSummary: string | null;
  excerpt: string;
  isMine: boolean;
  mediaCount: number;
  cover: string | null;
  reporterDisplay: string;
  reporterCrmv: string | null;
  reporterTitle: string | null;
}

export interface Story extends StoryCard {
  status: LifeSavedStatus;
  attribution: string;
  speciesOther: string | null;
  impactType: LifeSavedImpact | null;
  consentPublicStory: boolean;
  consentShowName: boolean;
  rejectionReason: string | null;
  updatedAt: string;
  media: LifeSavedMedia[];
}

export interface ReportInput {
  reporterName?: string;
  reporterCrmv?: string;
  reporterTitle?: string;
  attribution?: string;
  species?: AnimalSpecies;
  speciesOther?: string;
  animalName?: string;
  occurredAt?: string;
  procedureSummary?: string;
  impactType?: LifeSavedImpact;
  consentPublicStory?: boolean;
  consentShowName?: boolean;
}

/** Tetos espelhados do backend (MEDIA_LIMITS). */
export const MEDIA_LIMITS: Record<MediaKind, { maxBytes: number; maxFiles: number }> = {
  PHOTO: { maxBytes: 15 * 1024 * 1024, maxFiles: 10 },
  VIDEO: { maxBytes: 500 * 1024 * 1024, maxFiles: 3 },
};

export const livesSavedService = {
  async summary(): Promise<LifeSavedSummary | null> {
    try {
      return (await apiClient.get<LifeSavedSummary>('/lives-saved/summary')).data;
    } catch (error) {
      logger.error('[livesSaved] summary falhou', error);
      return null;
    }
  },

  async wall(): Promise<{ total: number; entries: WallEntry[] } | null> {
    try {
      return (await apiClient.get('/lives-saved/wall')).data;
    } catch (error) {
      logger.error('[livesSaved] wall falhou', error);
      return null;
    }
  },

  async stories(cursor?: string, limit = 12): Promise<{ items: StoryCard[]; nextCursor: string | null }> {
    try {
      return (await apiClient.get('/lives-saved/stories', { params: { cursor, limit } })).data;
    } catch (error) {
      logger.error('[livesSaved] stories falhou', error);
      return { items: [], nextCursor: null };
    }
  },

  async story(id: string): Promise<Story> {
    return (await apiClient.get<Story>(`/lives-saved/stories/${id}`)).data;
  },

  async mine(): Promise<Story[]> {
    try {
      return (await apiClient.get<Story[]>('/lives-saved/mine')).data;
    } catch (error) {
      logger.error('[livesSaved] mine falhou', error);
      return [];
    }
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
   * Upload direto no R2 (presigned PUT). Lê o arquivo como blob e envia
   * com fetch — sem barra de progresso.
   * ponytail: sem progresso; trocar por expo-file-system uploadAsync se
   * vídeo de 500 MB sem feedback virar reclamação.
   */
  async uploadMedia(reportId: string, file: { uri: string; mimeType: string; sizeBytes: number }, kind: MediaKind) {
    const { data } = await apiClient.post<{ mediaId: string; url: string }>(
      `/lives-saved/${reportId}/media/upload-url`,
      { kind, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
    );
    const blob = await (await fetch(file.uri)).blob();
    const put = await fetch(data.url, { method: 'PUT', body: blob, headers: { 'Content-Type': file.mimeType } });
    if (!put.ok) throw new Error(`Upload falhou (${put.status})`);
    await apiClient.post(`/lives-saved/${reportId}/media/${data.mediaId}/confirm`);
  },
};

export default livesSavedService;
