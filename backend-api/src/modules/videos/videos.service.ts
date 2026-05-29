import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareStreamService } from '../cloudflare/cloudflare-stream.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { CreateVideoDto, VideoUploadStatus, VideoSource } from './dto/create-video.dto';
import { CreateVideoFromR2HlsDto } from './dto/create-video-from-r2-hls.dto';
import { ExtractThumbnailFromHlsDto } from './dto/extract-thumbnail-from-hls.dto';
import { deriveR2Basename } from './utils/r2-basename';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ReorderVideosDto } from './dto/reorder-videos.dto';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';
import { Video } from '@prisma/client';
import { spawn } from 'child_process';
import { unlink } from 'fs';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, posix } from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(unlink);
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

// Interface para status de upload
export interface UploadStatusResponse {
  id: string;
  uploadStatus: string;
  uploadProgress: number;
  uploadError: string | null;
  cloudflareId: string | null;
  cloudflareUrl: string | null;
  readyToStream: boolean;
}

/**
 * How the frontend should render this video — decoupled from
 * `videoSource` (which is "where it came from"). New providers can map
 * to an existing `kind` without changing any client code.
 *
 *   - `hls`: load `playbackUrl` in an HLS player (cloudflare ready +
 *     r2_hls). Cliente olha `captionsEmbedded` pra decidir se precisa
 *     buscar um `captionsUrl` separado.
 *   - `iframe`: render `playbackUrl` em um <iframe> (youtube/vimeo/
 *     external). Provedor cuida das captions internamente.
 *   - `none`: nada a tocar ainda — `playbackUrl` será null. Vídeo ainda
 *     processando ou sem URL registrada. UI deve mostrar placeholder.
 */
export type VideoPlaybackKind = 'hls' | 'iframe' | 'none';

/**
 * Frontend-facing playback descriptor derived from a Video row. Kept
 * flat so player code picks what it needs from a single object.
 *
 * Rules:
 *   - `kind: 'hls'`    → `playbackUrl` non-null, `captionsEmbedded` boolean.
 *   - `kind: 'iframe'` → `playbackUrl` non-null, `captionsEmbedded` undefined.
 *   - `kind: 'none'`   → `playbackUrl` null, `captionsEmbedded` undefined.
 *
 * `captionsUrl` only appears in the cloudflare-ready case and is
 * **web-only today** — mobile clients should ignore it even when
 * present (Cloudflare cross-origin VTT fetch would need pre-signed
 * URLs, which is out of scope until the R2 migration completes; once
 * a video ships on r2_hls, captions live in the HLS manifest's
 * SUBTITLES group and no separate URL is needed).
 */
export interface VideoPlaybackUrls {
  kind: VideoPlaybackKind;
  playbackUrl: string | null;
  /**
   * True when the HLS manifest already carries captions (SUBTITLES
   * group or CC track) and the player doesn't need a separate URL.
   * Only meaningful when `kind === 'hls'`; undefined for `iframe` /
   * `none`.
   */
  captionsEmbedded?: boolean;
  /** Separate captions URL (VTT). Web-only for the cloudflare flow. */
  captionsUrl?: string;
  /** Optional thumbnail override. */
  poster?: string;
}

/** Video payload returned by controller endpoints — base Video + playback. */
export type VideoWithPlayback = Video & { playback: VideoPlaybackUrls };

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private prisma: PrismaService,
    private cloudflareStream: CloudflareStreamService,
    private cloudflareR2: CloudflareR2Service,
    private audit: AuditService,
    private configService: ConfigService,
  ) {}

  /**
   * Extract a single-frame JPEG thumbnail from an R2-hosted HLS playlist
   * via ffmpeg and upload to R2 alongside the source. Used by the admin
   * "Add Video" modal to auto-fill the thumbnail field when an operator
   * pastes/picks a playlist.m3u8.
   *
   * SSRF guard: URL must start with our CLOUDFLARE_R2_PUBLIC_URL prefix
   * so the backend only fetches from our own R2 bucket. Output key is
   * derived from the input URL (sibling auto-thumbnail.jpg) to keep
   * artifacts grouped with the video.
   */
  /**
   * Lista os Video records que apontam pro mesmo r2Basename. Pode retornar
   * múltiplos: após @@unique([r2Basename, moduleId]), a mesma aula pode
   * ser registrada em N módulos diferentes (reuso pedagógico). Cada um
   * tem seu próprio folderId (catálogo MediaFolder) — admin pode mover
   * todos pro mesmo folder via UI do /admin/r2-browser.
   */
  async findByR2Basename(r2Basename: string) {
    return this.prisma.video.findMany({
      where: { r2Basename, deletedAt: null },
      select: {
        id: true,
        title: true,
        folderId: true,
        moduleId: true,
        folder: { select: { id: true, name: true } },
        module: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async extractThumbnailFromHls(
    dto: ExtractThumbnailFromHlsDto,
  ): Promise<{ thumbnailUrl: string }> {
    const url = dto.url.trim();
    const seekSec = Math.max(0, Math.min(7200, dto.seekSec ?? 30));

    // SSRF guard: só hosts R2 do projeto. Os vídeos são servidos tanto pela
    // URL pública direta do R2 (CLOUDFLARE_R2_PUBLIC_URL) quanto pelo CDN
    // custom (CLOUDFLARE_R2_CDN_URL) — o R2PlaylistPicker do admin usa o CDN,
    // então ambos precisam ser aceitos. Validamos pelo HOST (allowlist) e
    // derivamos a key R2 do pathname, não do prefixo da URL (o domínio que
    // serviu o arquivo varia; ambos apontam pro mesmo bucket).
    const allowedHosts = [
      this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL'),
      this.configService.get<string>('CLOUDFLARE_R2_CDN_URL'),
    ]
      .filter((u): u is string => !!u)
      .map((u) => {
        try {
          return new URL(u).host;
        } catch {
          return '';
        }
      })
      .filter(Boolean);
    if (allowedHosts.length === 0) {
      throw new BadRequestException('R2 public URL not configured on backend');
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    if (parsed.protocol !== 'https:' || !allowedHosts.includes(parsed.host)) {
      throw new BadRequestException(
        'URL must point to the project R2 bucket',
      );
    }
    if (!parsed.pathname.endsWith('.m3u8')) {
      throw new BadRequestException('URL must end with .m3u8');
    }

    // Key R2 derivada do pathname decodificado — independe do host que serviu.
    const relativeKey = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    const baseDir = posix.dirname(relativeKey);
    if (
      !baseDir ||
      baseDir === '.' ||
      baseDir.includes('..') ||
      !baseDir.startsWith('videos/')
    ) {
      throw new BadRequestException(
        'Playlist must live under videos/<name>/',
      );
    }
    const outputKey = `${baseDir}/auto-thumbnail.jpg`;

    const tmp = await mkdtemp(join(tmpdir(), 'hls-thumb-'));
    const outputPath = join(tmp, 'thumb.jpg');
    try {
      await this.runFfmpegThumbnail(url, seekSec, outputPath);
      const buffer = await readFile(outputPath);
      const uploaded = await this.cloudflareR2.uploadFile(
        buffer,
        outputKey,
        'image/jpeg',
      );
      // getPublicUrl monta a URL com a key crua; chaves com espaço/acento
      // (ex: "videos/Tecidos Moles na Prática/...") sairiam não-encodadas e
      // o @IsUrl do create-video-from-r2-hls rejeitaria ("must be a URL
      // address"). new URL() percent-encoda o pathname → URL RFC-válida
      // (mesmo efeito do cdnUrl no frontend).
      const thumbnailUrl = new URL(uploaded.url).href;
      this.logger.log(
        `Extracted HLS thumbnail: ${url} -> ${thumbnailUrl} (seek=${seekSec}s)`,
      );
      return { thumbnailUrl };
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }

  private runFfmpegThumbnail(
    inputUrl: string,
    seekSec: number,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // -ss BEFORE -i = fast seek (HLS-aware). Single frame, 1280px wide
      // lanczos downscale, JPEG quality 2 (high). 30s timeout caps any
      // pathological case where ffmpeg waits on a stalled segment.
      const args = [
        '-y',
        '-ss',
        String(seekSec),
        '-i',
        inputUrl,
        '-vframes',
        '1',
        '-vf',
        'scale=1280:-2:flags=lanczos',
        '-q:v',
        '2',
        outputPath,
      ];

      const ff = spawn('ffmpeg', args);
      let stderr = '';
      ff.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      const timeout = setTimeout(() => {
        ff.kill('SIGKILL');
        reject(new Error('ffmpeg timeout after 30s'));
      }, 30000);

      ff.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      ff.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`),
          );
        }
      });
    });
  }

  /**
   * Derive the playback descriptor the frontend should use.
   *
   * Maps each `videoSource` onto a rendering `kind` so player code can
   * branch on intent ("hls player" / "iframe" / "placeholder") instead
   * of provider identity. See VideoPlaybackUrls docstring for the
   * invariants that hold for each kind.
   */
  buildPlaybackUrls(video: Video): VideoPlaybackUrls {
    const source = (video.videoSource ?? 'cloudflare') as string;
    const poster = video.thumbnailUrl ?? undefined;

    switch (source) {
      case 'r2_hls': {
        const playbackUrl = video.hlsUrl ?? null;
        if (!playbackUrl) {
          // R2 video registered but hlsUrl missing — treat as pending.
          return { kind: 'none', playbackUrl: null, poster };
        }
        return {
          kind: 'hls',
          playbackUrl,
          // External pipeline always publishes the master playlist with
          // the SUBTITLES group attached, so no separate captionsUrl is
          // needed.
          captionsEmbedded: true,
          poster,
        };
      }
      case 'youtube':
      case 'vimeo':
      case 'external': {
        const playbackUrl = video.externalUrl ?? null;
        if (!playbackUrl) {
          return { kind: 'none', playbackUrl: null, poster };
        }
        // External HLS (.m3u8) must use HLS player, not iframe — browsers
        // can't execute manifests inside iframes. External pipeline publishes
        // master playlist with SUBTITLES group attached.
        if (/\.m3u8(\?|$)/i.test(playbackUrl)) {
          return {
            kind: 'hls',
            playbackUrl,
            captionsEmbedded: true,
            poster,
          };
        }
        return {
          kind: 'iframe',
          playbackUrl,
          poster,
        };
      }
      case 'cloudflare':
      default: {
        const playbackUrl = video.cloudflareUrl ?? null;
        if (!playbackUrl) {
          // Cloudflare registrado mas ainda sem URL (upload/processing).
          return { kind: 'none', playbackUrl: null, poster };
        }
        // Cloudflare entrega CC como track separada no manifesto HLS,
        // não "embedded no mesmo container" — por isso captionsEmbedded
        // é false mesmo quando o manifesto tem um CC track. Web usa
        // `/api/v1/captions/:videoId/pt-BR` (auth via backend). Mobile
        // ignora este campo — ver docstring.
        const captionsUrl = video.cloudflareId
          ? `/api/v1/captions/${video.id}/pt-BR`
          : undefined;
        return {
          kind: 'hls',
          playbackUrl,
          captionsEmbedded: false,
          captionsUrl,
          poster,
        };
      }
    }
  }

  /**
   * Attach playback URLs to a Video row.
   */
  withPlayback(video: Video): VideoWithPlayback {
    return { ...video, playback: this.buildPlaybackUrls(video) };
  }

  /**
   * Criar um novo vídeo
   */
  async create(moduleId: string, createVideoDto: CreateVideoDto): Promise<Video> {
    try {
      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Verificar se já existe um vídeo com a mesma ordem
      const existingVideo = await this.prisma.video.findFirst({
        where: {
          moduleId,
          order: createVideoDto.order,
        },
      });

      if (existingVideo) {
        throw new BadRequestException('Já existe um vídeo com esta ordem neste módulo');
      }

      // Verificar se o cloudflareId já existe (se fornecido)
      if (createVideoDto.cloudflareId) {
        const existingCloudflareVideo = await this.prisma.video.findUnique({
          where: { cloudflareId: createVideoDto.cloudflareId },
        });

        if (existingCloudflareVideo) {
          throw new BadRequestException('Este vídeo já foi cadastrado');
        }
      }

      // Auto-deriva r2Basename quando videoSource=r2_hls — chave de
      // reconciliacao com o KV folder index do Worker r2-browser. Source
      // of truth do path fisico continua sendo hlsUrl (imutavel).
      const r2Basename =
        createVideoDto.videoSource === 'r2_hls'
          ? deriveR2Basename(createVideoDto.hlsUrl)
          : null;

      const video = await this.prisma.video.create({
        data: {
          title: createVideoDto.title,
          description: createVideoDto.description,
          cloudflareId: createVideoDto.cloudflareId,
          cloudflareUrl: createVideoDto.cloudflareUrl,
          thumbnailUrl: createVideoDto.thumbnailUrl,
          duration: createVideoDto.duration || 0,
          order: createVideoDto.order,
          isPublished: createVideoDto.isPublished || false,
          uploadStatus: (createVideoDto.uploadStatus as any) || 'PENDING',
          uploadProgress: createVideoDto.uploadProgress || 0,
          uploadError: createVideoDto.uploadError,
          tempFilePath: createVideoDto.tempFilePath,
          // New fields — explicit so TypeScript keeps us honest when schema.prisma
          // adds more. Default videoSource stays 'cloudflare' (DB default) unless
          // the caller provides one (e.g. r2_hls from the dedicated endpoint).
          hlsUrl: createVideoDto.hlsUrl,
          externalUrl: createVideoDto.externalUrl,
          videoSource: createVideoDto.videoSource,
          r2Basename,
          module: {
            connect: { id: moduleId },
          },
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
        },
      });

      this.logger.log(`Video created: ${video.id} for module ${moduleId}`);

      return video;
    } catch (error) {
      this.logger.error('Error creating video', error);
      throw error;
    }
  }

  /**
   * Criar vídeo a partir de embed externo (YouTube, Vimeo, etc)
   * Não faz upload para Cloudflare - apenas salva a URL de embed
   * Se for URL do Cloudflare, extrai o cloudflareId automaticamente
   */
  async createFromEmbed(
    moduleId: string, 
    embedUrl: string, 
    metadata: { 
      title: string; 
      description?: string; 
      order: number; 
      videoSource?: 'youtube' | 'vimeo' | 'external' | 'cloudflare';
    }
  ): Promise<Video> {
    try {
      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Detectar automaticamente a fonte do vídeo se não especificada
      let videoSource = metadata.videoSource || 'external';
      let cloudflareId: string | null = null;
      let cloudflareUrl: string | null = null;

      if (!metadata.videoSource) {
        if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
          videoSource = 'youtube';
        } else if (embedUrl.includes('vimeo.com')) {
          videoSource = 'vimeo';
        } else if (embedUrl.includes('cloudflarestream.com')) {
          videoSource = 'cloudflare';
        }
      }

      // Se for Cloudflare, extrair o cloudflareId da URL
      if (embedUrl.includes('cloudflarestream.com')) {
        // Formatos possíveis:
        // https://customer-xxx.cloudflarestream.com/VIDEO_ID/...
        // https://iframe.cloudflarestream.com/VIDEO_ID
        // https://watch.cloudflarestream.com/VIDEO_ID
        const match = embedUrl.match(/cloudflarestream\.com\/([a-f0-9]{32})/i);
        if (match) {
          cloudflareId = match[1];
          cloudflareUrl = embedUrl;
          videoSource = 'cloudflare';
          this.logger.log(`Extracted Cloudflare ID from embed URL: ${cloudflareId}`);
        }
      }

      // Verificar se já existe um vídeo com este cloudflareId
      if (cloudflareId) {
        const existing = await this.prisma.video.findFirst({
          where: { cloudflareId },
          include: { module: { select: { title: true } } },
        });
        if (existing) {
          throw new BadRequestException(
            `Este vídeo do Cloudflare já está cadastrado como "${existing.title}" no módulo "${existing.module?.title}". Use a opção "Mover" para transferi-lo para outro módulo.`,
          );
        }
      }

      // Criar registro no banco com status READY (já é um link válido)
      const video = await this.prisma.video.create({
        data: {
          title: metadata.title,
          description: metadata.description,
          order: metadata.order,
          externalUrl: embedUrl,
          videoSource: videoSource,
          cloudflareId: cloudflareId, // Salvar cloudflareId se extraído
          cloudflareUrl: cloudflareUrl, // Salvar cloudflareUrl se for Cloudflare
          uploadStatus: 'READY',
          uploadProgress: 100,
          isPublished: false,
          module: {
            connect: { id: moduleId },
          },
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
        },
      });

      this.logger.log(`Embed video created: ${video.id} - Source: ${videoSource}${cloudflareId ? ` - CloudflareId: ${cloudflareId}` : ''}`);

      return video;
    } catch (error) {
      this.logger.error('Error creating embed video', error);
      throw error;
    }
  }

  /**
   * Criar vídeo a partir de master playlist HLS já hospedado em R2.
   *
   * Nothing to transcode or upload on the backend: the external FFmpeg+
   * Whisper pipeline has already produced the full HLS ladder (including
   * the SUBTITLES group) and published it at `hlsUrl`. We just create the
   * Video row with `videoSource='r2_hls'` and `uploadStatus='READY'`.
   */
  async createFromR2Hls(
    moduleId: string,
    dto: CreateVideoFromR2HlsDto,
  ): Promise<Video> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });
    if (!module) {
      throw new NotFoundException('Módulo não encontrado');
    }

    const r2Basename = deriveR2Basename(dto.hlsUrl);

    // Lida com r2Basename ja em uso DENTRO DO MESMO MODULO: a unicidade
    // (basename, moduleId) permite reusar a aula em modulos diferentes,
    // mas impede duplica-la dentro do mesmo modulo. Soft-delete
    // (deletedAt) nao libera o slot — se admin deletou e tenta cadastrar
    // de novo no mesmo modulo, restauramos em vez de quebrar com P2002.
    if (r2Basename) {
      const existing = await this.prisma.video.findFirst({
        where: { r2Basename, moduleId },
      });
      if (existing) {
        if (existing.deletedAt) {
          return this.restoreR2HlsVideo(existing.id, moduleId, dto);
        }
        throw new ConflictException(
          `Já existe um Video ativo neste módulo apontando para esta pasta R2 (basename="${r2Basename}", id=${existing.id}). ` +
            `Use o vídeo existente ou exclua-o antes de cadastrar de novo.`,
        );
      }
    }

    // Resolve order: caller can pin it, otherwise next-available.
    const order =
      dto.order !== undefined && dto.order !== null
        ? dto.order
        : await this.getNextOrder(moduleId);

    const conflicting = await this.prisma.video.findFirst({
      where: { moduleId, order, deletedAt: null },
    });
    if (conflicting) {
      throw new BadRequestException(
        'Já existe um vídeo com esta ordem neste módulo',
      );
    }

    const captionsEmbedded = dto.captionsEmbedded !== false;

    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        duration: dto.duration,
        order,
        isPublished: false,
        uploadStatus: 'READY',
        uploadProgress: 100,
        hlsUrl: dto.hlsUrl,
        videoSource: VideoSource.R2_HLS,
        r2Basename,
        module: { connect: { id: moduleId } },
      },
      include: {
        module: { select: { id: true, title: true, courseId: true } },
      },
    });

    this.logger.log(
      `R2/HLS video created: ${video.id} (module ${moduleId}, captionsEmbedded=${captionsEmbedded}, r2Basename=${video.r2Basename})`,
    );
    return video;
  }

  /**
   * Restaura um Video soft-deletado que apontava para o mesmo r2Basename
   * que estamos tentando cadastrar agora. Atualiza com os novos metadados
   * (title, description, thumbnail, duration, order, module). Sem isso o
   * unique constraint em r2Basename quebra a recriacao mesmo apos delete.
   */
  private async restoreR2HlsVideo(
    videoId: string,
    moduleId: string,
    dto: CreateVideoFromR2HlsDto,
  ): Promise<Video> {
    const order =
      dto.order !== undefined && dto.order !== null
        ? dto.order
        : await this.getNextOrder(moduleId);

    const conflicting = await this.prisma.video.findFirst({
      where: {
        moduleId,
        order,
        deletedAt: null,
        NOT: { id: videoId },
      },
    });
    if (conflicting) {
      throw new BadRequestException(
        'Já existe um vídeo com esta ordem neste módulo',
      );
    }

    const video = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        deletedAt: null,
        moduleId,
        title: dto.title,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        duration: dto.duration,
        order,
        isPublished: false,
        uploadStatus: 'READY',
        uploadProgress: 100,
        hlsUrl: dto.hlsUrl,
        videoSource: VideoSource.R2_HLS,
      },
      include: {
        module: { select: { id: true, title: true, courseId: true } },
      },
    });

    this.logger.log(
      `R2/HLS video restored: ${video.id} (was soft-deleted; new module=${moduleId})`,
    );
    return video;
  }

  /**
   * Upload de vídeo para Cloudflare Stream via URL
   */
  async uploadFromUrl(moduleId: string, url: string, metadata: { title: string; description?: string; order: number }): Promise<Video> {
    try {
      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Upload para Cloudflare Stream
      const cloudflareVideo = await this.cloudflareStream.uploadVideoFromUrl(url, {
        name: metadata.title,
      });

      // Criar registro no banco
      const video = await this.create(moduleId, {
        title: metadata.title,
        description: metadata.description,
        cloudflareId: cloudflareVideo.uid,
        cloudflareUrl: cloudflareVideo.playbackUrl,
        thumbnailUrl: cloudflareVideo.thumbnailUrl,
        duration: cloudflareVideo.duration,
        order: metadata.order,
        isPublished: false,
        uploadStatus: VideoUploadStatus.READY,
      });

      return video;
    } catch (error) {
      this.logger.error('Error uploading video from URL', error);
      throw error;
    }
  }

  /**
   * Upload de vídeo ASSÍNCRONO para Cloudflare Stream
   * Cria o registro no banco imediatamente e faz o upload em background
   * Retorna imediatamente com status "UPLOADING"
   */
  async uploadFromDiskAsync(
    moduleId: string,
    filePath: string,
    filename: string,
    metadata: { title: string; description?: string; order: number },
  ): Promise<Video> {
    try {
      this.logger.log(`Starting async upload from disk: ${filePath}`);

      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Criar registro no banco com status UPLOADING
      const video = await this.create(moduleId, {
        title: metadata.title,
        description: metadata.description,
        order: metadata.order,
        isPublished: false,
        uploadStatus: VideoUploadStatus.UPLOADING,
        uploadProgress: 0,
        tempFilePath: filePath,
      });

      this.logger.log(`Video record created: ${video.id}, starting background upload...`);

      // Iniciar upload em background (não aguarda)
      this.processUploadInBackground(video.id, filePath, filename, metadata.title);

      // Retornar imediatamente com o vídeo em status UPLOADING
      return video;
    } catch (error) {
      this.logger.error('Error starting async upload', error);
      throw error;
    }
  }

  /**
   * Processa o upload em background
   * Atualiza o progresso e status no banco de dados
   */
  private async processUploadInBackground(
    videoId: string,
    filePath: string,
    filename: string,
    title: string,
  ): Promise<void> {
    try {
      this.logger.log(`[Background] Starting upload for video ${videoId}`);

      // Obter tamanho do arquivo
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));
      const fileSize = stats.size;
      this.logger.log(`[Background] File size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

      // Upload para Cloudflare Stream usando TUS
      const cloudflareVideo = await this.cloudflareStream.uploadVideoViaTusWithProgress(
        filePath,
        filename,
        fileSize,
        { name: title },
        // Callback de progresso
        async (progress: number) => {
          await this.prisma.video.update({
            where: { id: videoId },
            data: { uploadProgress: Math.round(progress) },
          });
        },
      );

      this.logger.log(`[Background] Upload completed. Cloudflare UID: ${cloudflareVideo.uid}`);

      // Atualizar registro no banco com dados do Cloudflare
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          cloudflareId: cloudflareVideo.uid,
          cloudflareUrl: cloudflareVideo.playbackUrl,
          thumbnailUrl: cloudflareVideo.thumbnailUrl,
          duration: cloudflareVideo.duration,
          uploadStatus: 'PROCESSING', // Cloudflare ainda está processando
          uploadProgress: 100,
          tempFilePath: null,
        },
      });

      // Deletar arquivo temporário
      try {
        await unlinkAsync(filePath);
        this.logger.log(`[Background] Temporary file deleted: ${filePath}`);
      } catch (deleteError) {
        this.logger.warn(`[Background] Failed to delete temporary file: ${filePath}`, deleteError);
      }

      this.logger.log(`[Background] Video ${videoId} upload completed successfully`);
    } catch (error) {
      this.logger.error(`[Background] Error uploading video ${videoId}`, error);

      // Atualizar status para ERROR
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          uploadStatus: 'ERROR',
          uploadError: error.message || 'Erro desconhecido no upload',
        },
      });

      // Tentar deletar arquivo temporário em caso de erro
      try {
        await unlinkAsync(filePath);
      } catch (deleteError) {
        // Ignorar erro de deleção
      }
    }
  }

  /**
   * Obter status de upload de um vídeo
   */
  async getUploadStatus(videoId: string): Promise<UploadStatusResponse> {
    const video = await this.findOne(videoId);

    // Se o vídeo está em PROCESSING ou UPLOADING com cloudflareId, verificar se já está pronto no Cloudflare
    // Isso é necessário porque no upload TUS direto, o frontend não atualiza o progresso no banco
    if ((video.uploadStatus === 'PROCESSING' || video.uploadStatus === 'UPLOADING') && video.cloudflareId) {
      try {
        const cloudflareDetails = await this.cloudflareStream.getVideoDetails(video.cloudflareId);
        
        if (cloudflareDetails.readyToStream) {
          // Atualizar para READY
          await this.prisma.video.update({
            where: { id: videoId },
            data: {
              uploadStatus: 'READY',
              uploadProgress: 100,
              duration: cloudflareDetails.duration,
              thumbnailUrl: cloudflareDetails.thumbnailUrl,
              cloudflareUrl: cloudflareDetails.playbackUrl,
            },
          });

          this.logger.log(`Video ${videoId} updated to READY from Cloudflare`);

          return {
            id: video.id,
            uploadStatus: 'READY',
            uploadProgress: 100,
            uploadError: null,
            cloudflareId: video.cloudflareId,
            cloudflareUrl: cloudflareDetails.playbackUrl,
            readyToStream: true,
          };
        } else {
          // Vídeo ainda processando no Cloudflare, atualizar para PROCESSING
          if (video.uploadStatus === 'UPLOADING') {
            await this.prisma.video.update({
              where: { id: videoId },
              data: {
                uploadStatus: 'PROCESSING',
                uploadProgress: 100,
              },
            });

            this.logger.log(`Video ${videoId} updated to PROCESSING (Cloudflare encoding)`);
          }

          return {
            id: video.id,
            uploadStatus: 'PROCESSING',
            uploadProgress: 100,
            uploadError: null,
            cloudflareId: video.cloudflareId,
            cloudflareUrl: video.cloudflareUrl,
            readyToStream: false,
          };
        }
      } catch (error) {
        this.logger.warn(`Error checking Cloudflare status for video ${videoId}`, error);
      }
    }

    return {
      id: video.id,
      uploadStatus: video.uploadStatus,
      uploadProgress: video.uploadProgress,
      uploadError: video.uploadError,
      cloudflareId: video.cloudflareId,
      cloudflareUrl: video.cloudflareUrl,
      readyToStream: video.uploadStatus === 'READY',
    };
  }

  /**
   * Obter URL de upload direto (TUS)
   */
  async getDirectUploadUrl(): Promise<{ uploadURL: string; uid: string }> {
    try {
      return await this.cloudflareStream.getDirectUploadUrl();
    } catch (error) {
      this.logger.error('Error getting direct upload URL', error);
      throw error;
    }
  }

  /**
   * Criar vídeo com URL de upload direto para TUS do frontend
   * Cria o registro no banco e retorna a URL de upload direta do Cloudflare
   * O frontend faz o upload TUS diretamente para o Cloudflare
   */
  async createVideoWithDirectUpload(
    moduleId: string,
    metadata: { title: string; description?: string; order: number },
  ): Promise<{ uploadURL: string; uid: string; videoId: string; video: Video }> {
    try {
      this.logger.log(`Creating video with direct upload URL for module: ${moduleId}`);

      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Obter URL de upload direto do Cloudflare
      const { uploadURL, uid } = await this.cloudflareStream.getDirectUploadUrl();
      this.logger.log(`Direct upload URL obtained. Cloudflare UID: ${uid}`);

      // Criar registro do vídeo no banco com status UPLOADING
      const video = await this.prisma.video.create({
        data: {
          title: metadata.title,
          description: metadata.description,
          order: metadata.order,
          cloudflareId: uid, // Já sabemos o UID que o Cloudflare vai usar
          uploadStatus: 'UPLOADING',
          uploadProgress: 0,
          isPublished: false,
          module: {
            connect: { id: moduleId },
          },
        },
      });

      this.logger.log(`Video record created: ${video.id} with cloudflareId: ${uid}`);

      return {
        uploadURL,
        uid,
        videoId: video.id,
        video,
      };
    } catch (error) {
      this.logger.error('Error creating video with direct upload', error);
      throw error;
    }
  }

  /**
   * Criar vídeo com URL de upload TUS direto para o frontend
   * O backend gera uma URL TUS autenticada, e o frontend faz o upload diretamente
   * IMPORTANTE: Esta é a solução para arquivos grandes (sem limite de tamanho!)
   */
  async createVideoWithTusUpload(
    moduleId: string,
    metadata: { title: string; description?: string; order: number; fileSize: number; filename: string },
  ): Promise<{ tusUploadUrl: string; uid: string; videoId: string; video: Video }> {
    try {
      this.logger.log(`Creating video with TUS upload URL for module: ${moduleId}`);
      this.logger.log(`File: ${metadata.filename} (${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB)`);

      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Obter URL de upload TUS do Cloudflare
      const { tusUploadUrl, uid } = await this.cloudflareStream.getTusUploadUrl(
        metadata.fileSize,
        metadata.filename,
        { name: metadata.title },
      );
      this.logger.log(`TUS upload URL obtained. Cloudflare UID: ${uid}`);

      // Criar registro do vídeo no banco com status UPLOADING
      const video = await this.prisma.video.create({
        data: {
          title: metadata.title,
          description: metadata.description,
          order: metadata.order,
          cloudflareId: uid,
          uploadStatus: 'UPLOADING',
          uploadProgress: 0,
          isPublished: false,
          module: {
            connect: { id: moduleId },
          },
        },
      });

      this.logger.log(`Video record created: ${video.id} with cloudflareId: ${uid}`);

      return {
        tusUploadUrl,
        uid,
        videoId: video.id,
        video,
      };
    } catch (error) {
      this.logger.error('Error creating video with TUS upload', error);
      throw error;
    }
  }

  /**
   * Listar todos os vídeos de um módulo
   */
  async findAll(moduleId: string): Promise<Video[]> {
    // Verificar se o módulo existe
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Módulo não encontrado');
    }

    return this.prisma.video.findMany({
      where: {
        moduleId,
        deletedAt: null,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  /**
   * Same as findAll but attaches playback URLs. Preferred by controllers
   * and any caller that ships Video objects to the frontend.
   */
  async findAllWithPlayback(moduleId: string): Promise<VideoWithPlayback[]> {
    const videos = await this.findAll(moduleId);
    return videos.map((v) => this.withPlayback(v));
  }

  /**
   * Buscar vídeo por ID
   */
  async findOne(id: string): Promise<Video> {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
                instructorId: true,
              },
            },
          },
        },
      },
    });

    if (!video || video.deletedAt) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Se o vídeo está READY mas duration=0, buscar do Cloudflare e atualizar
    if (video.cloudflareId && video.uploadStatus === 'READY' && (!video.duration || video.duration === 0)) {
      try {
        const details = await this.cloudflareStream.getVideoDetails(video.cloudflareId);
        if (details.duration > 0) {
          await this.prisma.video.update({
            where: { id },
            data: {
              duration: Math.round(details.duration),
              thumbnailUrl: video.thumbnailUrl || details.thumbnailUrl,
            },
          });
          video.duration = Math.round(details.duration);
          if (!video.thumbnailUrl) video.thumbnailUrl = details.thumbnailUrl;
          this.logger.log(`Video ${id} duration auto-synced: ${video.duration}s`);
        }
      } catch (err) {
        this.logger.warn(`Failed to auto-sync duration for video ${id}:`, err?.message);
      }
    }

    return video;
  }

  /**
   * Same as findOne but attaches playback URLs. Preferred by controllers.
   */
  async findOneWithPlayback(id: string): Promise<VideoWithPlayback> {
    const video = await this.findOne(id);
    return this.withPlayback(video);
  }

  /**
   * Atualizar vídeo
   */
  async update(id: string, updateVideoDto: UpdateVideoDto): Promise<Video> {
    // Verificar se o vídeo existe
    const existingVideo = await this.findOne(id);

    try {
      // Se a ordem foi alterada, verificar se não conflita com outro vídeo
      if (updateVideoDto.order !== undefined && updateVideoDto.order !== existingVideo.order) {
        const conflictingVideo = await this.prisma.video.findFirst({
          where: {
            moduleId: existingVideo.moduleId,
            order: updateVideoDto.order,
            NOT: {
              id,
            },
          },
        });

        if (conflictingVideo) {
          throw new BadRequestException('Já existe um vídeo com esta ordem neste módulo');
        }
      }

      const video = await this.prisma.video.update({
        where: { id },
        data: updateVideoDto,
      });

      this.logger.log(`Video updated: ${video.id}`);

      return video;
    } catch (error) {
      this.logger.error(`Error updating video ${id}`, error);
      throw error;
    }
  }

  /**
   * Soft-delete do vídeo.
   *
   * Mudança de contrato: não removemos mais do Cloudflare Stream nem
   * apagamos arquivos temporários aqui. O vídeo permanece intacto no
   * storage até um recycle-bin job (fora desta sprint) consolidar o
   * hard-delete. Isso preserva progresso, summaries e quizzes já
   * anexados ao `videoId` — tudo fica acessível para rollback.
   *
   * O arquivo temp de upload ainda é limpo no success path do upload
   * em background (processUploadInBackground), então o leak de disco
   * só ocorre se o upload falhar e o admin deletar antes do cleanup —
   * risco aceitável e é a mesma janela que existia antes.
   */
  async remove(id: string, actorId: string | null = null): Promise<void> {
    await this.findOne(id);

    try {
      await this.prisma.video.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Video soft-deleted: ${id}`);
      await this.audit.record({
        actorId,
        action: AUDIT_ACTIONS.VIDEO_SOFT_DELETE,
        entityType: 'videos',
        entityId: id,
      });
    } catch (dbError) {
      this.logger.error(`Error soft-deleting video ${id}`, dbError);
      throw new BadRequestException('Erro ao deletar vídeo');
    }
  }

  /**
   * Reordenar vídeos de um módulo
   */
  async reorder(moduleId: string, reorderDto: ReorderVideosDto): Promise<Video[]> {
    // Verificar se o módulo existe
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Módulo não encontrado');
    }

    try {
      // Atomicidade + offset gigante: igual ao ModulesService.reorder.
      // Falha no meio do passo 1 deixava negativos -1..-N residuais que
      // colidiam com proximas tentativas. Offset -1B evita colisao com
      // qualquer residual e com partial unique index (deletados).
      const TEMP_OFFSET = -1_000_000_000;
      await this.prisma.$transaction(async (prisma) => {
        for (let i = 0; i < reorderDto.videos.length; i++) {
          const item = reorderDto.videos[i];
          await prisma.video.update({
            where: { id: item.id },
            data: { order: TEMP_OFFSET - (i + 1) },
          });
        }
        for (const item of reorderDto.videos) {
          await prisma.video.update({
            where: { id: item.id },
            data: { order: item.order },
          });
        }
      });

      this.logger.log(`Videos reordered for module ${moduleId}`);

      // Retornar os vídeos atualizados
      return this.findAll(moduleId);
    } catch (error) {
      this.logger.error(`Error reordering videos for module ${moduleId}`, error);
      throw new BadRequestException('Erro ao reordenar vídeos');
    }
  }

  /**
   * Publicar/despublicar vídeo
   */
  async togglePublish(id: string): Promise<Video> {
    const video = await this.findOne(id);

    return this.prisma.video.update({
      where: { id },
      data: {
        isPublished: !video.isPublished,
      },
    });
  }

  /**
   * Sincronizar dados do vídeo com Cloudflare Stream
   */
  async syncWithCloudflare(id: string): Promise<Video> {
    const video = await this.findOne(id);

    if (!video.cloudflareId) {
      throw new BadRequestException('Vídeo não possui cloudflareId');
    }

    try {
      // Buscar dados atualizados do Cloudflare
      const cloudflareVideo = await this.cloudflareStream.getVideoDetails(video.cloudflareId);

      // Atualizar no banco
      return this.prisma.video.update({
        where: { id },
        data: {
          duration: cloudflareVideo.duration,
          thumbnailUrl: cloudflareVideo.thumbnailUrl,
          cloudflareUrl: cloudflareVideo.playbackUrl,
          uploadStatus: cloudflareVideo.readyToStream ? 'READY' : 'PROCESSING',
        },
      });
    } catch (error) {
      this.logger.error(`Error syncing video ${id} with Cloudflare`, error);
      throw new BadRequestException('Erro ao sincronizar vídeo');
    }
  }

  /**
   * Move um vídeo para outro módulo
   */
  async moveToModule(videoId: string, targetModuleId: string): Promise<Video> {
    const video = await this.findOne(videoId);

    // Verificar se o módulo destino existe
    const targetModule = await this.prisma.module.findUnique({
      where: { id: targetModuleId },
    });
    if (!targetModule) {
      throw new NotFoundException('Módulo destino não encontrado');
    }

    if (video.moduleId === targetModuleId) {
      return video; // Já está no módulo correto
    }

    // Determinar próxima ordem no módulo destino
    const lastVideo = await this.prisma.video.findFirst({
      where: { moduleId: targetModuleId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = lastVideo ? lastVideo.order + 1 : 0;

    // Mover o vídeo
    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        moduleId: targetModuleId,
        order: nextOrder,
      },
    });

    this.logger.log(`Video ${videoId} moved from module ${video.moduleId} to ${targetModuleId}`);

    return updated;
  }

  /**
   * Atualizar duração do vídeo (reportada pelo player do frontend)
   * Só atualiza se o vídeo atualmente tiver duration = 0
   */
  async updateDurationFromPlayer(id: string, duration: number): Promise<void> {
    if (!duration || duration <= 0) return;

    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) return;

    // Só atualiza se a duração atual for 0 (nunca foi definida)
    if (video.duration === 0 || video.duration === null) {
      await this.prisma.video.update({
        where: { id },
        data: { duration: Math.round(duration) },
      });
      this.logger.log(`Video ${id} duration updated from player: ${Math.round(duration)}s`);
    }
  }

  /**
   * Obter próximo número de ordem disponível para um módulo
   */
  async getNextOrder(moduleId: string): Promise<number> {
    const lastVideo = await this.prisma.video.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });

    return lastVideo ? lastVideo.order + 1 : 0;
  }

  /**
   * Upload de thumbnail personalizada para o vídeo
   * Sobrescreve a thumbnail auto-gerada pelo Cloudflare Stream
   * @param videoId - ID do vídeo
   * @param file - Arquivo de imagem (Buffer)
   * @param originalName - Nome original do arquivo
   * @param contentType - Tipo MIME do arquivo
   */
  async uploadThumbnail(
    videoId: string,
    file: Buffer,
    originalName: string,
    contentType: string,
  ): Promise<Video> {
    // Verificar se o vídeo existe
    await this.findOne(videoId);

    // Validar tipo de imagem
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Use: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    try {
      // Gerar chave única para o arquivo no R2
      const ext = originalName.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const key = `thumbnails/videos/${videoId}/${timestamp}.${ext}`;

      // Upload para R2
      this.logger.log(`Uploading video thumbnail: ${key}`);
      const uploadResult = await this.cloudflareR2.uploadFile(file, key, contentType);

      // Atualizar thumbnailUrl no banco
      const updatedVideo = await this.prisma.video.update({
        where: { id: videoId },
        data: {
          thumbnailUrl: uploadResult.url,
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
        },
      });

      this.logger.log(`Video thumbnail uploaded successfully: ${videoId}`);

      return updatedVideo;
    } catch (error) {
      this.logger.error(`Error uploading thumbnail for video ${videoId}`, error);
      throw new BadRequestException('Erro ao fazer upload da thumbnail');
    }
  }
}
