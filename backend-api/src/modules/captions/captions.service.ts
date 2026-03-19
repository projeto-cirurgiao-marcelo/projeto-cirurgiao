import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareStreamService, CaptionResult } from '../cloudflare/cloudflare-stream.service';
import { SupportedCaptionLanguage, SUPPORTED_CAPTION_LANGUAGES } from './dto/generate-caption.dto';

@Injectable()
export class CaptionsService {
  private readonly logger = new Logger(CaptionsService.name);

  constructor(
    private prisma: PrismaService,
    private cloudflareStream: CloudflareStreamService,
  ) {}

  /**
   * Gerar legendas automaticamente via IA para um vídeo
   * O vídeo deve estar com status READY no Cloudflare
   */
  async generateCaption(
    videoId: string,
    language: SupportedCaptionLanguage = 'pt',
  ): Promise<CaptionResult> {
    this.logger.log(`Generating caption for video ${videoId} in language: ${language}`);

    // Buscar o vídeo no banco
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
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

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Verificar se o vídeo tem cloudflareId
    if (!video.cloudflareId) {
      throw new BadRequestException(
        'Este vídeo não está hospedado no Cloudflare Stream. Legendas automáticas só podem ser geradas para vídeos do Cloudflare.',
      );
    }

    // Verificar se o vídeo está pronto (READY)
    if (video.uploadStatus !== 'READY') {
      throw new BadRequestException(
        `O vídeo ainda não está pronto para gerar legendas. Status atual: ${video.uploadStatus}. Aguarde o processamento ser concluído.`,
      );
    }

    // Validar idioma
    if (!SUPPORTED_CAPTION_LANGUAGES.includes(language)) {
      throw new BadRequestException(
        `Idioma não suportado: ${language}. Idiomas disponíveis: ${SUPPORTED_CAPTION_LANGUAGES.join(', ')}`,
      );
    }

    try {
      // Chamar API do Cloudflare para gerar legendas
      const result = await this.cloudflareStream.generateCaptions(video.cloudflareId, language);

      this.logger.log(
        `Caption generation started for video ${videoId}: status=${result.status}, label=${result.label}`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Error generating caption for video ${videoId}`, error);
      
      // Extrair mensagem de erro mais clara
      const errorMessage = error?.response?.data?.errors?.[0]?.message 
        || error?.message 
        || 'Erro desconhecido ao gerar legendas';
      
      throw new BadRequestException(
        `Falha ao gerar legendas: ${errorMessage}. Verifique se o vídeo está completamente processado no Cloudflare.`,
      );
    }
  }

  /**
   * Listar todas as legendas de um vídeo
   */
  async listCaptions(videoId: string): Promise<CaptionResult[]> {
    this.logger.log(`Listing captions for video ${videoId}`);

    // Buscar o vídeo no banco
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Verificar se o vídeo tem cloudflareId
    if (!video.cloudflareId) {
      // Retornar lista vazia para vídeos externos
      return [];
    }

    try {
      const captions = await this.cloudflareStream.listCaptions(video.cloudflareId);
      return captions;
    } catch (error: any) {
      // Se o erro for da API do Cloudflare (vídeo não encontrado, etc), retornar lista vazia
      // em vez de propagar o erro
      this.logger.warn(`Error listing captions for video ${videoId}, returning empty list:`, error?.message);
      return [];
    }
  }

  /**
   * Obter arquivo VTT de uma legenda
   */
  async getCaptionVtt(videoId: string, language: string): Promise<string> {
    this.logger.log(`Getting VTT for video ${videoId}, language: ${language}`);

    // Buscar o vídeo no banco
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    if (!video.cloudflareId) {
      throw new BadRequestException('Este vídeo não possui legendas no Cloudflare');
    }

    try {
      const vtt = await this.cloudflareStream.getCaptionVtt(video.cloudflareId, language);
      return vtt;
    } catch (error: any) {
      this.logger.error(`Error getting VTT for video ${videoId}`, error);
      throw error;
    }
  }

  /**
   * Upload de arquivo VTT de legenda
   */
  async uploadCaption(
    videoId: string,
    language: string,
    vttContent: Buffer | string,
  ): Promise<CaptionResult> {
    this.logger.log(`Uploading caption for video ${videoId}, language: ${language}`);

    // Buscar o vídeo no banco
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    if (!video.cloudflareId) {
      throw new BadRequestException(
        'Este vídeo não está hospedado no Cloudflare Stream. Upload de legendas só é possível para vídeos do Cloudflare.',
      );
    }

    try {
      const result = await this.cloudflareStream.uploadCaption(
        video.cloudflareId,
        language,
        vttContent,
      );

      this.logger.log(`Caption uploaded for video ${videoId}: ${result.label}`);

      return result;
    } catch (error: any) {
      this.logger.error(`Error uploading caption for video ${videoId}`, error);
      throw error;
    }
  }

  /**
   * Deletar uma legenda
   */
  async deleteCaption(videoId: string, language: string): Promise<void> {
    this.logger.log(`Deleting caption for video ${videoId}, language: ${language}`);

    // Buscar o vídeo no banco
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    if (!video.cloudflareId) {
      throw new BadRequestException('Este vídeo não possui legendas no Cloudflare');
    }

    try {
      await this.cloudflareStream.deleteCaption(video.cloudflareId, language);
      this.logger.log(`Caption deleted for video ${videoId}, language: ${language}`);
    } catch (error: any) {
      this.logger.error(`Error deleting caption for video ${videoId}`, error);
      throw error;
    }
  }

  /**
   * Verificar status de uma legenda específica
   */
  async getCaptionStatus(videoId: string, language: string): Promise<CaptionResult | null> {
    const captions = await this.listCaptions(videoId);
    return captions.find((c) => c.language === language) || null;
  }
}