import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';
import {
  AddModuleVideosDto,
  AddVideosDto,
  CreateShowcaseDto,
  UpdateShowcaseDto,
} from './dto/showcase.dto';

/**
 * Vitrine = recorte comercial do catálogo. A composição é uma lista
 * EXPLÍCITA de vídeos (ShowcaseVideo); o atalho "adicionar módulo inteiro"
 * materializa as linhas no momento do clique — não é vínculo dinâmico, um
 * vídeo adicionado ao módulo depois NÃO entra sozinho.
 *
 * É por isso que o painel de aulas órfãs existe: ele é o contrapeso dessa
 * decisão, e a forma de enxergar aula publicada que ninguém que pagou vê.
 */
@Injectable()
export class ShowcasesService {
  private readonly logger = new Logger(ShowcasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Slug global único: "Castração Descomplicada" -> "castracao-descomplicada". */
  private async resolveUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base =
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'vitrine';

    let candidate = base;
    for (let counter = 2; counter <= 100; counter++) {
      const conflict = await this.prisma.showcase.findFirst({
        where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      if (!conflict) return candidate;
      candidate = `${base}-${counter}`;
    }
    throw new ConflictException('Não foi possível gerar slug único');
  }

  async list(includeArchived = false) {
    const showcases = await this.prisma.showcase.findMany({
      where: includeArchived ? {} : { deletedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { videos: true, entitlements: true } } },
    });

    return showcases.map((s) => ({
      ...s,
      videoCount: s._count.videos,
      entitlementCount: s._count.entitlements,
    }));
  }

  /** Detalhe com os vídeos já resolvidos até o curso — a UI agrupa por curso. */
  async findOne(id: string) {
    const showcase = await this.prisma.showcase.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { entitlements: true } },
        videos: {
          orderBy: { addedAt: 'asc' },
          include: {
            video: {
              select: {
                id: true,
                title: true,
                duration: true,
                isPublished: true,
                deletedAt: true,
                module: {
                  select: {
                    id: true,
                    title: true,
                    parentModule: { select: { id: true, title: true } },
                    course: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!showcase) throw new NotFoundException('Vitrine não encontrada');

    const { videos, _count, ...rest } = showcase;
    return {
      ...rest,
      entitlementCount: _count.entitlements,
      videos: videos
        // Aula deletada continua na vitrine até alguém limpar; não escondê-la
        // seria pior — o admin precisa ver que a linha existe.
        .map((sv) => ({
          videoId: sv.videoId,
          addedAt: sv.addedAt,
          title: sv.video.title,
          duration: sv.video.duration,
          isPublished: sv.video.isPublished,
          isDeleted: sv.video.deletedAt !== null,
          moduleId: sv.video.module.id,
          moduleTitle: sv.video.module.title,
          parentModuleTitle: sv.video.module.parentModule?.title ?? null,
          courseId: sv.video.module.course.id,
          courseTitle: sv.video.module.course.title,
        })),
    };
  }

  async create(dto: CreateShowcaseDto) {
    await this.assertProductIdFree(dto.externalProductId);

    const showcase = await this.prisma.showcase.create({
      data: {
        title: dto.title,
        slug: await this.resolveUniqueSlug(dto.title),
        description: dto.description ?? null,
        thumbnail: dto.thumbnail ?? null,
        externalProductId: dto.externalProductId || null,
        grantsAllContent: dto.grantsAllContent ?? false,
        isPublished: dto.isPublished ?? false,
        previewSeconds: dto.previewSeconds ?? null,
        position: dto.position ?? 0,
      },
    });

    this.logger.log(`Vitrine criada: ${showcase.slug}`);
    return showcase;
  }

  async update(id: string, dto: UpdateShowcaseDto) {
    const current = await this.prisma.showcase.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) throw new NotFoundException('Vitrine não encontrada');

    if (dto.externalProductId && dto.externalProductId !== current.externalProductId) {
      await this.assertProductIdFree(dto.externalProductId);
    }

    return this.prisma.showcase.update({
      where: { id },
      data: {
        ...(dto.title !== undefined
          ? { title: dto.title, slug: await this.resolveUniqueSlug(dto.title, id) }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.thumbnail !== undefined ? { thumbnail: dto.thumbnail || null } : {}),
        ...(dto.externalProductId !== undefined
          ? { externalProductId: dto.externalProductId || null }
          : {}),
        ...(dto.grantsAllContent !== undefined
          ? { grantsAllContent: dto.grantsAllContent }
          : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.previewSeconds !== undefined
          ? { previewSeconds: dto.previewSeconds ?? null }
          : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
    });
  }

  /**
   * Arquivar é soft-delete: a vitrine some do admin mas os Entitlement
   * continuam apontando pra ela. Quando o gate entrar, remover a linha de
   * verdade tiraria acesso de quem pagou sem deixar rastro.
   */
  async archive(id: string, actorId: string | null = null) {
    const showcase = await this.prisma.showcase.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { entitlements: true } } },
    });
    if (!showcase) throw new NotFoundException('Vitrine não encontrada');

    await this.prisma.showcase.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.SHOWCASE_ARCHIVE,
      entityType: 'showcases',
      entityId: id,
      metadata: { slug: showcase.slug, entitlements: showcase._count.entitlements },
    });

    this.logger.log(`Vitrine arquivada: ${showcase.slug}`);
    return { id, archived: true };
  }

  async restore(id: string, actorId: string | null = null) {
    const showcase = await this.prisma.showcase.findUnique({ where: { id } });
    if (!showcase) throw new NotFoundException('Vitrine não encontrada');
    if (!showcase.deletedAt) return showcase;

    const restored = await this.prisma.showcase.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.SHOWCASE_RESTORE,
      entityType: 'showcases',
      entityId: id,
    });

    return restored;
  }

  async addVideos(id: string, dto: AddVideosDto) {
    await this.assertExists(id);

    // Ids inexistentes viriam como violação de FK no meio do createMany;
    // conferir antes deixa o erro legível pro admin.
    const found = await this.prisma.video.findMany({
      where: { id: { in: dto.videoIds }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== dto.videoIds.length) {
      throw new BadRequestException('Um ou mais vídeos não existem');
    }

    const result = await this.prisma.showcaseVideo.createMany({
      data: found.map((v) => ({ showcaseId: id, videoId: v.id })),
      skipDuplicates: true,
    });

    return { added: result.count, requested: dto.videoIds.length };
  }

  /**
   * Atalho de curadoria: materializa uma linha por aula do módulo agora.
   * Se o módulo ganhar aula amanhã, ela NÃO entra sozinha — aparece no
   * painel de órfãs, que é onde o admin vê o que ficou de fora.
   */
  async addModuleVideos(id: string, dto: AddModuleVideosDto) {
    await this.assertExists(id);

    const module = await this.prisma.module.findFirst({
      where: { id: dto.moduleId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!module) throw new NotFoundException('Módulo não encontrado');

    const includeSubmodules = dto.includeSubmodules ?? true;
    const moduleIds = [module.id];
    if (includeSubmodules) {
      const children = await this.prisma.module.findMany({
        where: { parentModuleId: module.id, deletedAt: null },
        select: { id: true },
      });
      moduleIds.push(...children.map((c) => c.id));
    }

    const videos = await this.prisma.video.findMany({
      where: {
        moduleId: { in: moduleIds },
        deletedAt: null,
        ...(dto.includeUnpublished ? {} : { isPublished: true }),
      },
      select: { id: true },
    });

    if (videos.length === 0) {
      return { added: 0, requested: 0, moduleTitle: module.title };
    }

    const result = await this.prisma.showcaseVideo.createMany({
      data: videos.map((v) => ({ showcaseId: id, videoId: v.id })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Vitrine ${id}: +${result.count} aulas do módulo "${module.title}" (${videos.length} candidatas)`,
    );
    return { added: result.count, requested: videos.length, moduleTitle: module.title };
  }

  async removeVideo(id: string, videoId: string) {
    await this.assertExists(id);
    try {
      await this.prisma.showcaseVideo.delete({
        where: { showcaseId_videoId: { showcaseId: id, videoId } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Aula não está nesta vitrine');
      }
      throw error;
    }
    return { removed: true };
  }

  /** Busca de aulas pra montar a vitrine. Traz curso/módulo pra desambiguar
   *  homônimos — "Castração Descomplicada" existe em dois cursos. */
  async searchVideos(query: string, showcaseId?: string, limit = 50) {
    const q = query?.trim();
    if (!q || q.length < 2) return [];

    const videos = await this.prisma.video.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        title: { contains: q, mode: 'insensitive' },
      },
      take: Math.min(limit, 200),
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        duration: true,
        module: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
        ...(showcaseId
          ? { showcases: { where: { showcaseId }, select: { showcaseId: true } } }
          : {}),
      },
    });

    return videos.map((v: any) => ({
      id: v.id,
      title: v.title,
      duration: v.duration,
      moduleId: v.module.id,
      moduleTitle: v.module.title,
      courseId: v.module.course.id,
      courseTitle: v.module.course.title,
      inShowcase: Array.isArray(v.showcases) ? v.showcases.length > 0 : false,
    }));
  }

  /**
   * Aulas publicadas que não estão em NENHUMA vitrine.
   *
   * Vitrine com grantsAllContent não conta como cobertura: ela libera tudo
   * por definição, então se ela zerasse esta lista o painel nunca acusaria
   * a aula que os compradores de vitrine avulsa não enxergam.
   */
  async listOrphanVideos(courseId?: string) {
    const videos = await this.prisma.video.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        showcases: { none: {} },
        ...(courseId ? { module: { courseId } } : {}),
      },
      orderBy: [{ module: { course: { title: 'asc' } } }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        duration: true,
        createdAt: true,
        module: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    });

    return videos.map((v) => ({
      id: v.id,
      title: v.title,
      duration: v.duration,
      createdAt: v.createdAt,
      moduleId: v.module.id,
      moduleTitle: v.module.title,
      courseId: v.module.course.id,
      courseTitle: v.module.course.title,
    }));
  }

  /** Árvore curso → módulos (com contagem de aulas) pro atalho de módulo. */
  async listCourseTree() {
    const courses = await this.prisma.course.findMany({
      where: { deletedAt: null },
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        modules: {
          where: { deletedAt: null, parentModuleId: null },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            _count: { select: { videos: true } },
            childModules: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              select: { id: true, title: true, _count: { select: { videos: true } } },
            },
          },
        },
      },
    });

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      modules: c.modules.map((m) => ({
        id: m.id,
        title: m.title,
        videoCount: m._count.videos,
        subModules: m.childModules.map((s) => ({
          id: s.id,
          title: s.title,
          videoCount: s._count.videos,
        })),
      })),
    }));
  }

  private async assertExists(id: string) {
    const showcase = await this.prisma.showcase.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!showcase) throw new NotFoundException('Vitrine não encontrada');
  }

  /** externalProductId errado libera a vitrine errada pra quem pagou —
   *  o unique do banco protege, mas o erro precisa ser legível. */
  private async assertProductIdFree(externalProductId?: string) {
    if (!externalProductId) return;
    const taken = await this.prisma.showcase.findUnique({
      where: { externalProductId },
      select: { title: true },
    });
    if (taken) {
      throw new ConflictException(
        `O produto ${externalProductId} já está vinculado à vitrine "${taken.title}"`,
      );
    }
  }
}
