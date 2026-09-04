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

/** Lado do aluno — GET /showcases/mine */
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

/** Upsell — GET /showcases/available (vitrines publicadas que o aluno NÃO possui) */
export interface AvailableShowcase {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  videoCount: number;
  /** URL de checkout TheMembers derivada do produto; null se sem produto vinculado. */
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
 * Vitrine bloqueada aberta em modo prévia — GET /showcases/available/:slug.
 * Mesmo índice de aulas do detalhe possuído; cada aula abre no watch, onde
 * o gate corta em `previewSeconds`.
 */
export interface AvailableShowcaseDetail extends MyShowcaseDetail {
  checkoutUrl: string | null;
}

/**
 * Vitrine à venda vista pela página pública de ajuda (`/ajuda?desbloquear=slug`),
 * sem auth — GET /showcases/public/:slug. Só publicadas e com produto.
 */
export interface PublicShowcase {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  videoCount: number;
  checkoutUrl: string;
}

export interface PublicShowcases {
  showcases: Array<Pick<PublicShowcase, 'id' | 'title' | 'slug' | 'checkoutUrl'>>;
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
