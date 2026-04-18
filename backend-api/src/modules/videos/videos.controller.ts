import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VideosService } from './videos.service';
import { CoursesService } from '../courses/courses.service';
import { ModulesService } from '../modules/modules.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateVideoFromR2HlsDto } from './dto/create-video-from-r2-hls.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ReorderVideosDto } from './dto/reorder-videos.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly modulesService: ModulesService,
    private readonly coursesService: CoursesService,
  ) {}

  private async checkInstructorPermission(moduleId: string, userId: string, userRole: Role) {
    if (userRole === Role.ADMIN) return;
    
    const module = await this.modulesService.findOne(moduleId);
    const isInstructor = await this.coursesService.isInstructor(module.courseId, userId);
    
    if (!isInstructor) {
      throw new ForbiddenException('Você não tem permissão para gerenciar vídeos deste curso');
    }
  }

  @Post('modules/:moduleId/videos')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async create(
    @Param('moduleId') moduleId: string,
    @Body() createVideoDto: CreateVideoDto,
    @Request() req,
  ) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    return this.videosService.create(moduleId, createVideoDto);
  }

  @Post('videos/upload-url')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  getUploadUrl() {
    return this.videosService.getDirectUploadUrl();
  }

  /**
   * Criar vídeo a partir de master playlist HLS já hospedado em R2.
   * O backend não processa nada — apenas registra o vídeo finalizado
   * pelo pipeline externo (FFmpeg+Whisper → R2).
   */
  @Post('modules/:moduleId/videos/from-r2-hls')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async createFromR2Hls(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateVideoFromR2HlsDto,
    @Request() req,
  ) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    const video = await this.videosService.createFromR2Hls(moduleId, dto);
    return this.videosService.withPlayback(video);
  }

  /**
   * Novo endpoint para upload TUS direto do frontend para Cloudflare
   * Cria o registro do vídeo no banco e retorna a URL de upload direta
   */
  @Post('modules/:moduleId/videos/upload-url-direct')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async getDirectUploadUrlWithVideo(
    @Param('moduleId') moduleId: string,
    @Body() metadata: { title: string; description?: string; order: number },
    @Request() req,
  ) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    return this.videosService.createVideoWithDirectUpload(moduleId, metadata);
  }

  /**
   * Criar vídeo a partir de URL externa
   * O Cloudflare irá baixar e processar o vídeo automaticamente
   * Ideal para URLs de vídeos hospedados em outros serviços (links diretos .mp4)
   */
  @Post('modules/:moduleId/videos/from-url')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async createFromUrl(
    @Param('moduleId') moduleId: string,
    @Body() data: { url: string; title: string; description?: string; order: number },
    @Request() req,
  ) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    
    if (!data.url || !data.url.startsWith('http')) {
      throw new BadRequestException('URL válida é obrigatória');
    }
    
    if (!data.title) {
      throw new BadRequestException('Título é obrigatório');
    }
    
    return this.videosService.uploadFromUrl(moduleId, data.url, {
      title: data.title,
      description: data.description,
      order: data.order,
    });
  }

  /**
   * Criar vídeo a partir de embed externo (YouTube, Vimeo, etc)
   * Apenas salva a URL - não faz upload para Cloudflare
   * O player renderiza um iframe com o embed
   */
  @Post('modules/:moduleId/videos/from-embed')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async createFromEmbed(
    @Param('moduleId') moduleId: string,
    @Body() data: { 
      embedUrl: string; 
      title: string; 
      description?: string; 
      order: number;
      videoSource?: 'youtube' | 'vimeo' | 'external';
    },
    @Request() req,
  ) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    
    if (!data.embedUrl || !data.embedUrl.startsWith('http')) {
      throw new BadRequestException('URL de embed válida é obrigatória');
    }
    
    if (!data.title) {
      throw new BadRequestException('Título é obrigatório');
    }
    
    return this.videosService.createFromEmbed(moduleId, data.embedUrl, {
      title: data.title,
      description: data.description,
      order: data.order,
      videoSource: data.videoSource,
    });
  }

  /**
   * Novo endpoint para upload TUS direto do frontend para Cloudflare (arquivos grandes)
   * O backend gera uma URL TUS autenticada, e o frontend faz upload direto para Cloudflare
   * SEM PASSAR PELO BACKEND - ideal para arquivos de qualquer tamanho!
   */
  @Post('modules/:moduleId/videos/tus-upload-url')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async getTusUploadUrlWithVideo(
    @Param('moduleId') moduleId: string,
    @Body() metadata: { title: string; description?: string; order: number; fileSize: number; filename: string },
    @Request() req,
  ) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    
    if (!metadata.fileSize || !metadata.filename) {
      throw new BadRequestException('fileSize e filename são obrigatórios');
    }
    
    return this.videosService.createVideoWithTusUpload(moduleId, metadata);
  }

  /**
   * Upload de arquivo de vídeo (assíncrono)
   * O arquivo é salvo no disco e o upload para Cloudflare acontece em background
   * Retorna imediatamente com status "processing"
   */
  @Post('modules/:moduleId/videos/upload-file')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `video-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024 * 1024, // 50GB max
      },
    }),
  )
  async uploadFile(
    @Param('moduleId') moduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: { title: string; description?: string; order: string },
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo não fornecido');
    }

    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);

    // Inicia o upload assíncrono e retorna imediatamente
    return this.videosService.uploadFromDiskAsync(moduleId, file.path, file.originalname, {
      title: metadata.title,
      description: metadata.description,
      order: parseInt(metadata.order, 10),
    });
  }

  /**
   * Verificar status de upload de um vídeo
   */
  @Get('videos/:id/upload-status')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async getUploadStatus(@Param('id') id: string, @Request() req) {
    const video = await this.videosService.findOne(id);
    await this.checkInstructorPermission(video.moduleId, req.user.sub, req.user.role);
    return this.videosService.getUploadStatus(id);
  }

  @Get('modules/:moduleId/videos')
  findAll(@Param('moduleId') moduleId: string) {
    return this.videosService.findAllWithPlayback(moduleId);
  }

  @Get('modules/:moduleId/videos/next-order')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async getNextOrder(@Param('moduleId') moduleId: string, @Request() req) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    const nextOrder = await this.videosService.getNextOrder(moduleId);
    return { nextOrder };
  }

  @Patch('modules/:moduleId/videos/reorder')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async reorder(
    @Param('moduleId') moduleId: string,
    @Body() reorderDto: ReorderVideosDto,
    @Request() req,
  ) {
    await this.checkInstructorPermission(moduleId, req.user.sub, req.user.role);
    return this.videosService.reorder(moduleId, reorderDto);
  }

  @Get('videos/:id')
  findOne(@Param('id') id: string) {
    return this.videosService.findOneWithPlayback(id);
  }

  @Patch('videos/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Request() req,
  ) {
    const video = await this.videosService.findOne(id);
    await this.checkInstructorPermission(video.moduleId, req.user.sub, req.user.role);
    return this.videosService.update(id, updateVideoDto);
  }

  @Delete('videos/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async remove(@Param('id') id: string, @Request() req) {
    const video = await this.videosService.findOne(id);
    await this.checkInstructorPermission(video.moduleId, req.user.sub, req.user.role);
    await this.videosService.remove(id, req.user?.sub ?? null);
    return { message: 'Vídeo deletado com sucesso' };
  }

  @Patch('videos/:id/toggle-publish')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async togglePublish(@Param('id') id: string, @Request() req) {
    const video = await this.videosService.findOne(id);
    await this.checkInstructorPermission(video.moduleId, req.user.sub, req.user.role);
    return this.videosService.togglePublish(id);
  }

  @Post('videos/:id/sync')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async sync(@Param('id') id: string, @Request() req) {
    const video = await this.videosService.findOne(id);
    await this.checkInstructorPermission(video.moduleId, req.user.sub, req.user.role);
    return this.videosService.syncWithCloudflare(id);
  }

  /**
   * Move um vídeo para outro módulo
   * POST /videos/:id/move
   * Body: { targetModuleId: string }
   */
  @Post('videos/:id/move')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async moveToModule(
    @Param('id') id: string,
    @Body() body: { targetModuleId: string },
    @Request() req,
  ) {
    const video = await this.videosService.findOne(id);
    await this.checkInstructorPermission(video.moduleId, req.user.sub, req.user.role);
    await this.checkInstructorPermission(body.targetModuleId, req.user.sub, req.user.role);
    return this.videosService.moveToModule(id, body.targetModuleId);
  }

  /**
   * Upload de thumbnail personalizada para o vídeo
   * POST /videos/:id/thumbnail
   * Body: multipart/form-data com campo 'file' (imagem jpeg/png/webp)
   * Sobrescreve a thumbnail auto-gerada pelo Cloudflare Stream
   */
  @Post('videos/:id/thumbnail')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  )
  async uploadThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de imagem é obrigatório');
    }

    const video = await this.videosService.findOne(id);
    await this.checkInstructorPermission(video.moduleId, req.user.sub, req.user.role);

    return this.videosService.uploadThumbnail(
      id,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }
}
