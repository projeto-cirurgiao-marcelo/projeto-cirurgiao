/** Espelha backend-api/src/modules/lives-saved (design 2026-09-10, direção C "registro clínico"). */

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

/** "0128" — número de ordem no registro. */
export const padSeq = (n: number | null | undefined) => (n == null ? '—' : String(n).padStart(4, '0'));

export interface LifeSavedSummary {
  total: number;
  newThisWeek: number;
  lastApprovedAt: string | null;
  lastOccurredAt: string | null;
  lastSpecies: AnimalSpecies | null;
  generatedAt: string;
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
  speciesOther: string | null;
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
  impactType: LifeSavedImpact | null;
  relatedCourseId: string | null;
  consentPublicStory: boolean;
  consentShowName: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
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
  relatedCourseId?: string;
  consentPublicStory?: boolean;
  consentShowName?: boolean;
}

export interface AdminReportRow {
  id: string;
  status: LifeSavedStatus;
  source: 'SELF' | 'ADMIN_BACKFILL';
  reporterName: string;
  reporterCrmv: string | null;
  reporterTitle: string | null;
  onBehalfOfName: string | null;
  attribution: string;
  species: AnimalSpecies | null;
  speciesOther: string | null;
  animalName: string | null;
  occurredAt: string | null;
  procedureSummary: string | null;
  impactType: LifeSavedImpact | null;
  consentPublicStory: boolean;
  consentShowName: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reporter: { id: string; email: string; name: string };
  _count?: { media: number };
}

export interface AdminReportDetail extends AdminReportRow {
  media: LifeSavedMedia[];
  reviewedBy: { id: string; name: string } | null;
  relatedCourse: { id: string; title: string } | null;
}

export interface AdminStats {
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
}

export interface DisplayToken {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdBy: { name: string };
}
