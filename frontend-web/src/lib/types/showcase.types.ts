/**
 * Vitrines = recortes comerciais do catálogo. A composição é uma lista
 * explícita de aulas; o atalho "adicionar módulo inteiro" materializa as
 * linhas no clique — aula criada depois NÃO entra sozinha (por isso o
 * painel de órfãs existe).
 */

export interface Showcase {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  position: number;
  externalProductId: string | null;
  grantsAllContent: boolean;
  previewSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  videoCount: number;
  entitlementCount: number;
}

export interface ShowcaseVideoItem {
  videoId: string;
  addedAt: string;
  title: string;
  duration: number;
  isPublished: boolean;
  isDeleted: boolean;
  moduleId: string;
  moduleTitle: string;
  parentModuleTitle: string | null;
  courseId: string;
  courseTitle: string;
}

export interface ShowcaseDetail
  extends Omit<Showcase, 'videoCount' | 'entitlementCount'> {
  entitlementCount: number;
  videos: ShowcaseVideoItem[];
}

export interface VideoSearchResult {
  id: string;
  title: string;
  duration: number;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  inShowcase: boolean;
}

export interface OrphanVideo {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
}

export interface CourseTreeModule {
  id: string;
  title: string;
  videoCount: number;
  subModules: Array<{ id: string; title: string; videoCount: number }>;
}

export interface CourseTreeItem {
  id: string;
  title: string;
  modules: CourseTreeModule[];
}

export interface ShowcaseInput {
  title?: string;
  description?: string;
  thumbnail?: string;
  externalProductId?: string;
  grantsAllContent?: boolean;
  isPublished?: boolean;
  previewSeconds?: number;
  position?: number;
}
