import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

/** Default global do preview quando a vitrine não define o dela. */
export const DEFAULT_PREVIEW_SECONDS = 120;

export interface VideoAccess {
  /** ADMIN/INSTRUCTOR ou entitlement ativo em vitrine grantsAllContent. */
  all: boolean;
  videoIds: Set<string>;
}

export interface OfferShowcase {
  id: string;
  title: string;
  slug: string;
  previewSeconds: number | null;
}

const EMPTY = new Set<string>();

/**
 * Gate de leitura das vitrines. Nesta leva ele só INFORMA (`hasAccess` por
 * aula) — o corte acontece no player (nível 1, §11 do design). Nenhum
 * endpoint deixa de devolver a URL de playback por causa dele.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Uma query por request: entitlements ativos do usuário → Set dos videoIds
   * liberados, ou `all` quando alguma vitrine dele libera o catálogo inteiro.
   * Ativo = revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now()).
   *
   * Vitrine arquivada (deletedAt) continua honrando entitlement — arquivar é
   * tirar do admin, não tirar acesso de quem pagou (comentário do archive na
   * leva 1). São ~1.394 aulas: o Set em memória custa nada, sem Redis.
   */
  async getAccess(user: { userId: string; role: Role | string }): Promise<VideoAccess> {
    if (user.role === Role.ADMIN || user.role === Role.INSTRUCTOR) {
      return { all: true, videoIds: EMPTY };
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ grantsAllContent: boolean; videoId: string | null }>
    >`
      SELECT s."grantsAllContent", sv."videoId"
      FROM entitlements e
      JOIN showcases s ON s.id = e."showcaseId"
      LEFT JOIN showcase_videos sv ON sv."showcaseId" = s.id
      WHERE e."userId" = ${user.userId}
        AND e."revokedAt" IS NULL
        AND (e."expiresAt" IS NULL OR e."expiresAt" > now())
    `;

    if (rows.some((r) => r.grantsAllContent)) {
      return { all: true, videoIds: EMPTY };
    }
    const videoIds = new Set<string>();
    for (const r of rows) {
      if (r.videoId) videoIds.add(r.videoId);
    }
    return { all: false, videoIds };
  }

  hasAccess(access: VideoAccess, videoId: string): boolean {
    return access.all || access.videoIds.has(videoId);
  }

  /**
   * `min(base, 50% da duração)`. O teto de 50% vale inclusive pro override
   * da vitrine — aula curta (vinheta, apresentação) nunca sai inteira de
   * graça. Duração desconhecida (0) cai no base: o corte de segurança fica
   * com o player, que conhece a duração real.
   */
  previewSecondsFor(duration: number | null | undefined, override?: number | null): number {
    const base = override ?? DEFAULT_PREVIEW_SECONDS;
    if (!duration || duration <= 0) return base;
    return Math.min(base, Math.floor(duration / 2));
  }

  /** Vitrine a ofertar no overlay: a publicada de menor position que contém a aula. */
  async offerFor(videoId: string): Promise<OfferShowcase | null> {
    const link = await this.prisma.showcaseVideo.findFirst({
      where: { videoId, showcase: { isPublished: true, deletedAt: null } },
      orderBy: { showcase: { position: 'asc' } },
      select: {
        showcase: {
          select: { id: true, title: true, slug: true, previewSeconds: true },
        },
      },
    });
    return link?.showcase ?? null;
  }

  /** Payload do endpoint de vídeo: hasAccess e, se bloqueado, o preview e a oferta. */
  async decorateVideo<T extends { id: string; duration?: number | null }>(
    video: T,
    user: { userId: string; role: Role | string },
  ) {
    const access = await this.getAccess(user);
    if (this.hasAccess(access, video.id)) {
      return { ...video, hasAccess: true as const };
    }
    const offer = await this.offerFor(video.id);
    return {
      ...video,
      hasAccess: false as const,
      previewSeconds: this.previewSecondsFor(video.duration, offer?.previewSeconds),
      offerShowcase: offer
        ? { id: offer.id, title: offer.title, slug: offer.slug }
        : null,
    };
  }

  /** Anota hasAccess em cada aula de course.modules[].videos[] (in place). */
  annotateCourseVideos<T extends { modules?: Array<{ videos?: Array<{ id: string }> }> }>(
    course: T,
    access: VideoAccess,
  ): T {
    for (const mod of course.modules ?? []) {
      for (const video of mod.videos ?? []) {
        (video as { id: string; hasAccess?: boolean }).hasAccess = this.hasAccess(
          access,
          video.id,
        );
      }
    }
    return course;
  }
}
