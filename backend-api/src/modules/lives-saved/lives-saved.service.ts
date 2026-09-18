import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  LifeSavedMediaKind,
  LifeSavedMediaStatus,
  LifeSavedReport,
  LifeSavedReportMedia,
  LifeSavedReportSource,
  LifeSavedReportStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import {
  AdminCreateReportDto,
  AdminListQueryDto,
  MediaUploadUrlDto,
  StoriesQueryDto,
  UpdateReportDto,
} from './dto/lives-saved.dto';

const { DRAFT, PENDING, APPROVED, REJECTED } = LifeSavedReportStatus;

/** Tetos de mídia propostos no design (§3); decisão de produto, não técnica. */
export const MEDIA_LIMITS: Record<
  LifeSavedMediaKind,
  { maxFiles: number; maxBytes: number; mimes: Record<string, string> }
> = {
  PHOTO: {
    maxFiles: 10,
    maxBytes: 15 * 1024 * 1024,
    mimes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' },
  },
  VIDEO: {
    maxFiles: 3,
    maxBytes: 500 * 1024 * 1024,
    mimes: { 'video/mp4': 'mp4', 'video/quicktime': 'mov' },
  },
};

const ANON_NAME = 'Médico(a) veterinário(a)';
const EXCERPT_LEN = 280;
const R2_PREFIX = 'lives-saved';

type ReportWithMedia = LifeSavedReport & { media: LifeSavedReportMedia[] };

@Injectable()
export class LivesSavedService {
  private readonly logger = new Logger(LivesSavedService.name);
  private readonly publicUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly r2: CloudflareR2Service,
    config: ConfigService,
  ) {
    this.publicUrl = (config.get<string>('CLOUDFLARE_R2_PUBLIC_URL') ?? '').replace(/\/+$/, '');
  }

  // ============================================================
  // Leitura (qualquer usuário logado)
  // ============================================================

  async summary() {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [total, newThisWeek, last] = await Promise.all([
      this.prisma.lifeSavedReport.count({ where: { status: APPROVED, deletedAt: null } }),
      this.prisma.lifeSavedReport.count({
        where: { status: APPROVED, deletedAt: null, reviewedAt: { gte: weekAgo } },
      }),
      this.prisma.lifeSavedReport.findFirst({
        where: { status: APPROVED, deletedAt: null },
        orderBy: { reviewedAt: 'desc' },
        select: { reviewedAt: true },
      }),
    ]);
    // ponytail: sem cache; são 3 COUNTs numa tabela pequena. Adicionar
    // CacheModule (padrão admin-dashboard) se a Home ou o kiosk pesarem.
    return { total, newThisWeek, lastApprovedAt: last?.reviewedAt ?? null, generatedAt: new Date() };
  }

  /** Um ponto por vida. `isPublic=false` conta mas não abre. */
  async wall(userId: string) {
    const rows = await this.prisma.lifeSavedReport.findMany({
      where: { status: APPROVED, deletedAt: null },
      orderBy: { reviewedAt: 'asc' },
      select: { id: true, reviewedAt: true, reporterId: true, consentPublicStory: true, species: true },
    });
    return {
      total: rows.length,
      dots: rows.map((r) => ({
        id: r.id,
        approvedAt: r.reviewedAt,
        species: r.species,
        isMine: r.reporterId === userId,
        isPublic: r.consentPublicStory,
      })),
    };
  }

  async stories(userId: string, q: StoriesQueryDto) {
    const limit = q.limit ?? 12;
    const rows = await this.prisma.lifeSavedReport.findMany({
      where: { status: APPROVED, deletedAt: null, consentPublicStory: true },
      orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: { media: { where: { status: LifeSavedMediaStatus.READY }, orderBy: { order: 'asc' } } },
    });
    const page = rows.slice(0, limit);
    return {
      items: page.map((r) => this.toCard(r, userId)),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    };
  }

  async story(id: string, userId: string) {
    const r = await this.findWithMedia(id);
    const canRead = r.reporterId === userId || (r.status === APPROVED && r.consentPublicStory);
    if (!canRead) throw new NotFoundException('Relato não encontrado');
    return this.toFull(r, userId);
  }

  // ============================================================
  // Escrita do autor
  // ============================================================

  async mine(userId: string) {
    const rows = await this.prisma.lifeSavedReport.findMany({
      where: { reporterId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { media: { orderBy: { order: 'asc' } } },
    });
    return rows.map((r) => this.toFull(r, userId));
  }

  /** Rascunho pré-preenchido com nome, cargo e CRMV do cadastro. */
  async createDraft(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, profile: { select: { crmv: true, profession: true } } },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const r = await this.prisma.lifeSavedReport.create({
      data: {
        reporterId: userId,
        reporterName: user.name,
        reporterCrmv: user.profile?.crmv ?? null,
        reporterTitle: user.profile?.profession ?? null,
      },
      include: { media: true },
    });
    return this.toFull(r, userId);
  }

  async update(id: string, userId: string, dto: UpdateReportDto) {
    const r = await this.findOwn(id, userId);
    if (r.status === APPROVED) throw new BadRequestException('Relato aprovado não pode ser editado');
    const updated = await this.prisma.lifeSavedReport.update({
      where: { id },
      data: this.toData(dto),
      include: { media: { orderBy: { order: 'asc' } } },
    });
    return this.toFull(updated, userId);
  }

  async submit(id: string, userId: string) {
    const r = await this.findOwn(id, userId);
    if (r.status !== DRAFT && r.status !== REJECTED) {
      throw new BadRequestException('Relato já enviado');
    }
    this.assertRequired(r);
    if (r.media.some((m) => m.status === LifeSavedMediaStatus.UPLOADING)) {
      throw new BadRequestException('Aguarde o upload de todas as mídias terminar');
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.lifeSavedReport.update({
        where: { id },
        data: { status: PENDING, submittedAt: new Date(), rejectionReason: null },
        include: { media: { orderBy: { order: 'asc' } } },
      }),
      // Lembra o CRMV pro próximo relato.
      this.prisma.userProfile.upsert({
        where: { userId },
        create: { userId, crmv: r.reporterCrmv },
        update: { crmv: r.reporterCrmv },
      }),
    ]);
    return this.toFull(updated, userId);
  }

  async remove(id: string, userId: string) {
    const r = await this.findOwn(id, userId);
    if (r.status === APPROVED) throw new BadRequestException('Relato aprovado não pode ser excluído');
    await this.prisma.lifeSavedReport.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.deleteMediaObjects(r.media);
    await this.prisma.lifeSavedReportMedia.deleteMany({ where: { reportId: id } });
    return { message: 'Relato excluído' };
  }

  // ============================================================
  // Mídia (presigned PUT direto no R2)
  // ============================================================

  async mediaUploadUrl(reportId: string, userId: string, dto: MediaUploadUrlDto) {
    const r = await this.findOwn(reportId, userId);
    if (r.status === APPROVED) throw new BadRequestException('Relato aprovado não pode receber mídia');
    const limits = MEDIA_LIMITS[dto.kind];
    const ext = limits.mimes[dto.mimeType];
    if (!ext) throw new BadRequestException(`Tipo não aceito: ${dto.mimeType}`);
    if (dto.sizeBytes > limits.maxBytes) {
      throw new BadRequestException(`Arquivo acima de ${Math.round(limits.maxBytes / 1048576)} MB`);
    }
    if (r.media.filter((m) => m.kind === dto.kind).length >= limits.maxFiles) {
      throw new BadRequestException(`Máximo de ${limits.maxFiles} ${dto.kind === 'PHOTO' ? 'fotos' : 'vídeos'}`);
    }
    const r2Key = `${R2_PREFIX}/${reportId}/${randomUUID()}.${ext}`;
    const media = await this.prisma.lifeSavedReportMedia.create({
      data: {
        reportId,
        kind: dto.kind,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        caption: dto.caption ?? null,
        r2Key,
        url: `${this.publicUrl}/${r2Key}`,
        order: r.media.length,
      },
    });
    const url = await this.r2.getSignedUploadUrl(r2Key, dto.mimeType, 3600);
    return { mediaId: media.id, url, key: r2Key, expiresIn: 3600 };
  }

  async mediaConfirm(reportId: string, mediaId: string, userId: string) {
    await this.findOwn(reportId, userId);
    const media = await this.prisma.lifeSavedReportMedia.findFirst({ where: { id: mediaId, reportId } });
    if (!media) throw new NotFoundException('Mídia não encontrada');
    let meta;
    try {
      meta = await this.r2.getFileMetadata(media.r2Key);
    } catch {
      throw new BadRequestException('Arquivo ainda não chegou ao armazenamento');
    }
    return this.prisma.lifeSavedReportMedia.update({
      where: { id: mediaId },
      data: {
        status: LifeSavedMediaStatus.READY,
        sizeBytes: meta.size,
        mimeType: meta.contentType ?? media.mimeType,
      },
    });
  }

  async mediaRemove(reportId: string, mediaId: string, userId: string | null, actorIsAdmin = false) {
    const r = actorIsAdmin ? await this.findWithMedia(reportId) : await this.findOwn(reportId, userId!);
    if (!actorIsAdmin && r.status === APPROVED) {
      throw new BadRequestException('Relato aprovado não pode ser alterado');
    }
    const media = r.media.find((m) => m.id === mediaId);
    if (!media) throw new NotFoundException('Mídia não encontrada');
    await this.deleteMediaObjects([media]);
    await this.prisma.lifeSavedReportMedia.delete({ where: { id: mediaId } });
    if (actorIsAdmin) {
      await this.audit.record({
        actorId: userId,
        action: AUDIT_ACTIONS.LIVES_SAVED_MEDIA_REMOVED,
        entityType: 'life_saved_reports',
        entityId: reportId,
        metadata: { mediaId, r2Key: media.r2Key },
      });
    }
    return { message: 'Mídia removida' };
  }

  // ============================================================
  // Admin
  // ============================================================

  async adminList(q: AdminListQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where: Prisma.LifeSavedReportWhereInput = {
      deletedAt: null,
      status: q.status ?? { not: DRAFT },
    };
    const [items, total] = await Promise.all([
      this.prisma.lifeSavedReport.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: { select: { id: true, email: true, name: true } },
          _count: { select: { media: true } },
        },
      }),
      this.prisma.lifeSavedReport.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async adminFindOne(id: string) {
    const r = await this.prisma.lifeSavedReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        media: { orderBy: { order: 'asc' } },
        reporter: { select: { id: true, email: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        relatedCourse: { select: { id: true, title: true } },
      },
    });
    if (!r) throw new NotFoundException('Relato não encontrado');
    return r;
  }

  async adminStats() {
    const rows = await this.prisma.lifeSavedReport.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<
      Record<LifeSavedReportStatus, number>
    >;
    return {
      pending: byStatus.PENDING ?? 0,
      approved: byStatus.APPROVED ?? 0,
      rejected: byStatus.REJECTED ?? 0,
      draft: byStatus.DRAFT ?? 0,
    };
  }

  async approve(id: string, adminId: string) {
    const r = await this.findWithMedia(id);
    if (r.status !== PENDING && r.status !== REJECTED) {
      throw new BadRequestException(`Não é possível aprovar um relato ${r.status}`);
    }
    this.assertRequired(r);
    const updated = await this.prisma.lifeSavedReport.update({
      where: { id },
      data: { status: APPROVED, reviewedById: adminId, reviewedAt: new Date(), rejectionReason: null },
    });
    await this.audit.record({
      actorId: adminId,
      action: AUDIT_ACTIONS.LIVES_SAVED_APPROVE,
      entityType: 'life_saved_reports',
      entityId: id,
      metadata: { from: r.status },
    });
    return updated;
  }

  async reject(id: string, adminId: string, reason: string) {
    const r = await this.findWithMedia(id);
    if (r.status !== PENDING && r.status !== APPROVED) {
      throw new BadRequestException(`Não é possível rejeitar um relato ${r.status}`);
    }
    const updated = await this.prisma.lifeSavedReport.update({
      where: { id },
      data: { status: REJECTED, reviewedById: adminId, reviewedAt: new Date(), rejectionReason: reason },
    });
    await this.audit.record({
      actorId: adminId,
      action: AUDIT_ACTIONS.LIVES_SAVED_REJECT,
      entityType: 'life_saved_reports',
      entityId: id,
      metadata: { from: r.status, reason },
    });
    return updated;
  }

  /** Backfill histórico: já nasce aprovado, em nome do admin ou de um vet sem conta. */
  async adminCreate(adminId: string, dto: AdminCreateReportDto) {
    const now = new Date();
    const r = await this.prisma.lifeSavedReport.create({
      data: {
        ...(this.toData(dto) as Prisma.LifeSavedReportCreateInput),
        reporter: { connect: { id: adminId } },
        reporterName: dto.reporterName,
        attribution: dto.attribution,
        onBehalfOfName: dto.onBehalfOfName ?? null,
        source: LifeSavedReportSource.ADMIN_BACKFILL,
        status: APPROVED,
        submittedAt: now,
        reviewedBy: { connect: { id: adminId } },
        reviewedAt: now,
      },
      include: { media: true },
    });
    await this.audit.record({
      actorId: adminId,
      action: AUDIT_ACTIONS.LIVES_SAVED_ADMIN_CREATE,
      entityType: 'life_saved_reports',
      entityId: r.id,
      metadata: { onBehalfOfName: dto.onBehalfOfName ?? null },
    });
    return r;
  }

  // ============================================================
  // LGPD: chamado pela autoexclusão de conta (UsersService)
  // ============================================================

  async anonymizeReporter(userId: string) {
    const media = await this.prisma.lifeSavedReportMedia.findMany({
      where: { report: { reporterId: userId } },
    });
    await this.prisma.$transaction([
      this.prisma.lifeSavedReportMedia.deleteMany({ where: { report: { reporterId: userId } } }),
      this.prisma.lifeSavedReport.updateMany({
        where: { reporterId: userId },
        data: { reporterName: ANON_NAME, reporterCrmv: null, reporterTitle: null, consentShowName: false },
      }),
    ]);
    await this.deleteMediaObjects(media);
  }

  // ============================================================
  // Limpeza: rascunhos abandonados e uploads pela metade
  // ============================================================

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanup() {
    const day = 86_400_000;
    const staleDrafts = await this.prisma.lifeSavedReport.findMany({
      where: { status: DRAFT, updatedAt: { lt: new Date(Date.now() - 7 * day) } },
      include: { media: true },
    });
    const staleUploads = await this.prisma.lifeSavedReportMedia.findMany({
      where: { status: LifeSavedMediaStatus.UPLOADING, createdAt: { lt: new Date(Date.now() - day) } },
    });
    await this.deleteMediaObjects([...staleDrafts.flatMap((d) => d.media), ...staleUploads]);
    await this.prisma.$transaction([
      this.prisma.lifeSavedReportMedia.deleteMany({ where: { id: { in: staleUploads.map((m) => m.id) } } }),
      this.prisma.lifeSavedReport.deleteMany({ where: { id: { in: staleDrafts.map((d) => d.id) } } }),
    ]);
    if (staleDrafts.length || staleUploads.length) {
      this.logger.log(`Limpeza: ${staleDrafts.length} rascunhos, ${staleUploads.length} uploads pendentes`);
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async findWithMedia(id: string): Promise<ReportWithMedia> {
    const r = await this.prisma.lifeSavedReport.findFirst({
      where: { id, deletedAt: null },
      include: { media: { orderBy: { order: 'asc' } } },
    });
    if (!r) throw new NotFoundException('Relato não encontrado');
    return r;
  }

  private async findOwn(id: string, userId: string): Promise<ReportWithMedia> {
    const r = await this.findWithMedia(id);
    if (r.reporterId !== userId) throw new ForbiddenException('Este relato não é seu');
    return r;
  }

  private assertRequired(r: LifeSavedReport) {
    const missing: string[] = [];
    if (!r.reporterName?.trim()) missing.push('nome completo');
    if (!r.reporterCrmv?.trim() && r.source !== LifeSavedReportSource.ADMIN_BACKFILL) missing.push('CRMV');
    if (!r.attribution?.trim()) missing.push('descrição da atribuição');
    if (missing.length) throw new BadRequestException(`Faltam campos obrigatórios: ${missing.join(', ')}`);
  }

  private toData(dto: UpdateReportDto): Prisma.LifeSavedReportUpdateInput {
    const { occurredAt, relatedCourseId, reporterCrmv, ...rest } = dto;
    return {
      ...rest,
      ...(reporterCrmv !== undefined ? { reporterCrmv: reporterCrmv.toUpperCase() } : {}),
      ...(occurredAt !== undefined ? { occurredAt: new Date(occurredAt) } : {}),
      ...(relatedCourseId !== undefined
        ? { relatedCourse: relatedCourseId ? { connect: { id: relatedCourseId } } : { disconnect: true } }
        : {}),
    };
  }

  private async deleteMediaObjects(media: LifeSavedReportMedia[]) {
    for (const m of media) {
      try {
        await this.r2.deleteFile(m.r2Key);
      } catch (err) {
        this.logger.warn(`R2 delete falhou para ${m.r2Key}: ${(err as Error).message}`);
      }
    }
  }

  private reporterFields(r: LifeSavedReport, userId: string) {
    const show = r.reporterId === userId || r.consentShowName;
    return {
      reporterDisplay: show ? r.onBehalfOfName ?? r.reporterName : ANON_NAME,
      reporterCrmv: show ? r.reporterCrmv : null,
      reporterTitle: show ? r.reporterTitle : null,
    };
  }

  private toCard(r: ReportWithMedia, userId: string) {
    const base = r.procedureSummary?.trim() || r.attribution;
    return {
      id: r.id,
      species: r.species,
      speciesOther: r.speciesOther,
      animalName: r.animalName,
      occurredAt: r.occurredAt,
      approvedAt: r.reviewedAt,
      procedureSummary: r.procedureSummary,
      excerpt: base.length > EXCERPT_LEN ? `${base.slice(0, EXCERPT_LEN - 1)}…` : base,
      isMine: r.reporterId === userId,
      mediaCount: r.media.length,
      cover: r.media.find((m) => m.kind === 'PHOTO')?.url ?? null,
      ...this.reporterFields(r, userId),
    };
  }

  private toFull(r: ReportWithMedia, userId: string) {
    const isMine = r.reporterId === userId;
    return {
      ...this.toCard(r, userId),
      status: r.status,
      attribution: r.attribution,
      impactType: r.impactType,
      relatedCourseId: r.relatedCourseId,
      consentPublicStory: r.consentPublicStory,
      consentShowName: r.consentShowName,
      rejectionReason: isMine ? r.rejectionReason : null,
      submittedAt: r.submittedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      media: r.media.map((m) => ({
        id: m.id,
        kind: m.kind,
        url: m.url,
        mimeType: m.mimeType,
        caption: m.caption,
        order: m.order,
        status: m.status,
      })),
    };
  }
}
