import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareStreamService } from '../cloudflare/cloudflare-stream.service';
import { CreateVideoDto, VideoUploadStatus } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ReorderVideosDto } from './dto/reorder-videos.dto';
import { Video } from '@prisma/client';
import { unlink } from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(unlink);

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

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private prisma: PrismaService,
    private cloudflareStream: CloudflareStreamService,
  ) {}

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
   * Upload de vídeo para Cloudflare Stream via arquivo (buffer)
   */
  async uploadFromFile(
    moduleId: string,
    file: Buffer,
    filename: string,
    metadata: { title: string; description?: string; order: number },
  ): Promise<Video> {
    try {
      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Upload para Cloudflare Stream
      const cloudflareVideo = await this.cloudflareStream.uploadVideoFromFile(file, filename, {
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
      this.logger.error('Error uploading video from file', error);
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
   * Upload de vídeo para Cloudflare Stream via arquivo no disco (TUS protocol)
   * Usa TUS para suportar arquivos grandes com upload resumível
   * @deprecated Use uploadFromDiskAsync para uploads assíncronos
   */
  async uploadFromDisk(
    moduleId: string,
    filePath: string,
    filename: string,
    metadata: { title: string; description?: string; order: number },
  ): Promise<Video> {
    try {
      this.logger.log(`Starting upload from disk: ${filePath}`);

      // Verificar se o módulo existe
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Módulo não encontrado');
      }

      // Obter tamanho do arquivo
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));
      const fileSize = stats.size;
      this.logger.log(`File size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

      // Upload para Cloudflare Stream usando TUS (suporta arquivos grandes)
      const cloudflareVideo = await this.cloudflareStream.uploadVideoViaTus(
        filePath,
        filename,
        fileSize,
        { name: metadata.title }
      );

      this.logger.log(`Upload completed. Cloudflare UID: ${cloudflareVideo.uid}`);

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

      // Deletar arquivo temporário
      try {
        await unlinkAsync(filePath);
        this.logger.log(`Temporary file deleted: ${filePath}`);
      } catch (deleteError) {
        this.logger.warn(`Failed to delete temporary file: ${filePath}`, deleteError);
      }

      return video;
    } catch (error) {
      this.logger.error('Error uploading video from disk', error);
      
      // Tentar deletar arquivo temporário em caso de erro
      try {
        await unlinkAsync(filePath);
      } catch (deleteError) {
        // Ignorar erro de deleção
      }
      
      throw error;
    }
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
      },
      orderBy: {
        order: 'asc',
      },
    });
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

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    return video;
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
   * Deletar vídeo (também remove do Cloudflare Stream)
   * IMPORTANTE: Mesmo se a deleção do Cloudflare falhar, o vídeo é removido do banco
   */
  async remove(id: string): Promise<void> {
    // Verificar se o vídeo existe
    const video = await this.findOne(id);

    // Tentar deletar do Cloudflare Stream (se tiver cloudflareId)
    // Não bloqueia a deleção do banco se falhar
    if (video.cloudflareId) {
      try {
        await this.cloudflareStream.deleteVideo(video.cloudflareId);
        this.logger.log(`Video deleted from Cloudflare: ${video.cloudflareId}`);
      } catch (cloudflareError) {
        // Log do erro mas continua com a deleção do banco
        this.logger.warn(`Failed to delete video from Cloudflare (${video.cloudflareId}), continuing with DB deletion: ${cloudflareError.message}`);
      }
    }

    // Deletar arquivo temporário se existir
    if (video.tempFilePath) {
      try {
        await unlinkAsync(video.tempFilePath);
        this.logger.log(`Temp file deleted: ${video.tempFilePath}`);
      } catch (deleteError) {
        // Ignorar erro de deleção de arquivo temp
        this.logger.warn(`Failed to delete temp file: ${video.tempFilePath}`);
      }
    }

    try {
      // Deletar do banco
      await this.prisma.video.delete({
        where: { id },
      });

      this.logger.log(`Video deleted from database: ${id}`);
    } catch (dbError) {
      this.logger.error(`Error deleting video ${id} from database`, dbError);
      throw new BadRequestException('Erro ao deletar vídeo do banco de dados');
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
      // Atualizar a ordem de cada vídeo
      await Promise.all(
        reorderDto.videos.map((item) =>
          this.prisma.video.update({
            where: { id: item.id },
            data: { order: item.order },
          }),
        ),
      );

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
   * Obter próximo número de ordem disponível para um módulo
   */
  async getNextOrder(moduleId: string): Promise<number> {
    const lastVideo = await this.prisma.video.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });

    return lastVideo ? lastVideo.order + 1 : 0;
  }
}
