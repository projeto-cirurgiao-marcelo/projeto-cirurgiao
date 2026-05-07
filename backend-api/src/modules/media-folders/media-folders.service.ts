import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { BulkMoveDto } from './dto/bulk-move.dto';

interface WorkerIndexFolder {
  fullPath: string;
  parentName: string;
  hasPlaylist: boolean;
  fileCount: number;
  depth: number;
}

interface WorkerIndexResponse {
  builtAt: string;
  totalCount: number;
  returned: number;
  folders: WorkerIndexFolder[];
}

const DEFAULT_WORKER_URL = 'https://r2-browser.gustavobressanin6.workers.dev';
const DEFAULT_CDN_BASE = 'https://cdn.projetocirurgiao.app';

/**
 * MediaFolder = camada de organizacao logica acima dos vídeos R2. Storage
 * fica imutavel; toda movimentacao (rename, mover subtree, reordenar,
 * mover videos entre pastas) e UPDATE no Postgres.
 *
 * `Video.hlsUrl` continua sendo source-of-truth do path fisico no R2 e
 * NUNCA e tocado por essa camada.
 */
@Injectable()
export class MediaFoldersService {
  private readonly logger = new Logger(MediaFoldersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Slug auto: lowercase + sem diacritics + alphanum/hifen. Se ja existir
   * sob o mesmo parentId, sufixa -2, -3, ate achar livre.
   */
  private async resolveUniqueSlug(
    name: string,
    parentId: string | null,
    excludeFolderId?: string,
  ): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'pasta';

    let candidate = base;
    let counter = 1;
    while (true) {
      const conflict = await this.prisma.mediaFolder.findFirst({
        where: {
          parentId,
          slug: candidate,
          ...(excludeFolderId ? { NOT: { id: excludeFolderId } } : {}),
        },
        select: { id: true },
      });
      if (!conflict) return candidate;
      counter++;
      candidate = `${base}-${counter}`;
      if (counter > 100) {
        throw new ConflictException('Nao foi possivel gerar slug unico');
      }
    }
  }

  /**
   * Verifica se candidateAncestorId e ancestral (ou igual) de descendantId.
   * Usado pra impedir mover pasta pra dentro do proprio subtree.
   */
  private async isAncestorOrSelf(
    candidateAncestorId: string,
    descendantId: string,
  ): Promise<boolean> {
    if (candidateAncestorId === descendantId) return true;
    let cursor: string | null = descendantId;
    const visited = new Set<string>();
    while (cursor) {
      if (visited.has(cursor)) {
        // ciclo defensivo — base ja deveria impedir
        return false;
      }
      visited.add(cursor);
      const node = await this.prisma.mediaFolder.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      if (!node) return false;
      if (node.parentId === candidateAncestorId) return true;
      cursor = node.parentId;
    }
    return false;
  }

  /**
   * Retorna a arvore inteira em ordem hierarquica + ordem de `position`.
   * Frontend monta a UI.
   */
  async listTree() {
    const folders = await this.prisma.mediaFolder.findMany({
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { videos: true, children: true } },
      },
    });
    return folders;
  }

  async create(dto: CreateFolderDto) {
    const parentId = dto.parentId ?? null;
    if (parentId) {
      const parent = await this.prisma.mediaFolder.findUnique({
        where: { id: parentId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Pasta pai nao encontrada');
    }

    const slug = await this.resolveUniqueSlug(dto.name, parentId);

    // Posicao = fim da lista atual no mesmo parent
    const last = await this.prisma.mediaFolder.findFirst({
      where: { parentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.mediaFolder.create({
      data: {
        name: dto.name,
        slug,
        parentId,
        courseId: dto.courseId ?? null,
        position: (last?.position ?? -1) + 1,
      },
    });
  }

  async update(id: string, dto: UpdateFolderDto) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id },
    });
    if (!folder) throw new NotFoundException('Pasta nao encontrada');

    // Resolve novo parentId: undefined = nao muda; null/'' = vai pra raiz
    const nextParentId =
      dto.parentId === undefined
        ? folder.parentId
        : dto.parentId === null || dto.parentId === ''
          ? null
          : dto.parentId;

    if (nextParentId && nextParentId !== folder.parentId) {
      // Validar destino existe
      const target = await this.prisma.mediaFolder.findUnique({
        where: { id: nextParentId },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Pasta destino nao encontrada');

      // Bloquear move pra dentro de si mesmo / descendente
      if (await this.isAncestorOrSelf(id, nextParentId)) {
        throw new BadRequestException(
          'Nao e possivel mover uma pasta pra dentro dela mesma ou de um descendente',
        );
      }
    }

    // Resolve novo slug se nome mudou ou parent mudou
    let nextSlug = folder.slug;
    if (dto.name && dto.name !== folder.name) {
      nextSlug = await this.resolveUniqueSlug(dto.name, nextParentId, id);
    } else if (nextParentId !== folder.parentId) {
      nextSlug = await this.resolveUniqueSlug(folder.name, nextParentId, id);
    }

    // Se mudou parent, posiciona no fim do destino (nao tenta merge order)
    let nextPosition = folder.position;
    if (nextParentId !== folder.parentId) {
      const last = await this.prisma.mediaFolder.findFirst({
        where: { parentId: nextParentId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      nextPosition = (last?.position ?? -1) + 1;
    } else if (dto.position !== undefined) {
      nextPosition = dto.position;
    }

    const nextCourseId =
      dto.courseId === undefined
        ? folder.courseId
        : dto.courseId === null || dto.courseId === ''
          ? null
          : dto.courseId;

    return this.prisma.mediaFolder.update({
      where: { id },
      data: {
        name: dto.name ?? folder.name,
        slug: nextSlug,
        parentId: nextParentId,
        position: nextPosition,
        courseId: nextCourseId,
      },
    });
  }

  async remove(id: string) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException('Pasta nao encontrada');
    // ON DELETE CASCADE no schema cuida de subtree; videos perdem folderId
    // (FK ON DELETE SET NULL) e voltam pro inbox /unassigned.
    await this.prisma.mediaFolder.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Move um unico video. folderId null/'' = remove de qualquer pasta
   * (volta pro inbox unassigned).
   */
  async moveVideo(videoId: string, folderId: string | null) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });
    if (!video) throw new NotFoundException('Video nao encontrado');

    if (folderId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: folderId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Pasta destino nao encontrada');
    }

    return this.prisma.video.update({
      where: { id: videoId },
      data: { folderId: folderId || null },
      select: { id: true, folderId: true, title: true, hlsUrl: true },
    });
  }

  async bulkMove(dto: BulkMoveDto) {
    const folderId = dto.folderId || null;
    if (folderId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: folderId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Pasta destino nao encontrada');
    }

    const result = await this.prisma.video.updateMany({
      where: { id: { in: dto.videoIds } },
      data: { folderId },
    });
    return { moved: result.count };
  }

  /**
   * Diff entre o folder index do Worker r2-browser (R2 reality) e os Videos
   * com videoSource=r2_hls cadastrados em DB. Usado pelo botao "Sincronizar
   * com R2" no admin: lista pastas com playlist no bucket que ainda nao tem
   * Video correspondente.
   *
   * NAO cria Video automaticamente — cria seria forcar moduleId obrigatorio
   * pra um stub. Frontend mostra a lista e admin escolhe ativamente
   * "Adicionar a um curso", reaproveitando a flow existente do AdicionarVideo.
   */
  async getSyncStatus(authHeader: string | undefined) {
    if (!authHeader) {
      throw new BadRequestException('Authorization header obrigatorio');
    }
    const workerUrl = (
      this.config.get<string>('R2_BROWSER_WORKER_URL') ?? DEFAULT_WORKER_URL
    ).replace(/\/+$/, '');
    const cdnBase = (
      this.config.get<string>('R2_CDN_BASE') ?? DEFAULT_CDN_BASE
    ).replace(/\/+$/, '');

    let res: Response;
    try {
      res = await fetch(`${workerUrl}/index?hasPlaylist=true`, {
        headers: { authorization: authHeader },
      });
    } catch (err) {
      this.logger.error('Worker /index unreachable', err);
      throw new ServiceUnavailableException(
        'Worker r2-browser indisponivel',
      );
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(
        `Worker /index retornou ${res.status}`,
      );
    }
    const data = (await res.json()) as WorkerIndexResponse;

    const existing = await this.prisma.video.findMany({
      where: {
        videoSource: 'r2_hls',
        r2Basename: { not: null },
        deletedAt: null,
      },
      select: { r2Basename: true },
    });
    const existingSet = new Set(
      existing.map((v) => v.r2Basename).filter((s): s is string => !!s),
    );

    const pending = data.folders
      .filter((f) => f.hasPlaylist && !existingSet.has(f.parentName))
      .map((f) => ({
        r2Basename: f.parentName,
        fullPath: f.fullPath,
        hlsUrl: `${cdnBase}/${f.fullPath
          .split('/')
          .map(encodeURIComponent)
          .join('/')}/playlist.m3u8`,
        fileCount: f.fileCount,
      }));

    return {
      indexBuiltAt: data.builtAt,
      totalInR2: data.returned,
      totalInDb: existing.length,
      pendingCount: pending.length,
      pending,
    };
  }

  /**
   * Videos sem folderId — funciona como inbox apos reconcile.
   * Filtra por `videoSource = r2_hls` (foco da feature). Cloudflare/youtube
   * legacy ficam fora.
   */
  async listUnassigned() {
    return this.prisma.video.findMany({
      where: {
        folderId: null,
        videoSource: 'r2_hls',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        hlsUrl: true,
        r2Basename: true,
        thumbnailUrl: true,
        duration: true,
        createdAt: true,
        folderId: true,
      },
    });
  }

  async listVideosInFolder(folderId: string) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id: folderId },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException('Pasta nao encontrada');

    return this.prisma.video.findMany({
      where: {
        folderId,
        deletedAt: null,
      },
      orderBy: [{ title: 'asc' }],
      select: {
        id: true,
        title: true,
        hlsUrl: true,
        r2Basename: true,
        thumbnailUrl: true,
        duration: true,
        createdAt: true,
        folderId: true,
      },
    });
  }
}
