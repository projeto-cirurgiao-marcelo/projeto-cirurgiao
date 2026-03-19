import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CaptionsService } from './captions.service';
import {
  GenerateCaptionDto,
  CaptionResponseDto,
  CaptionListResponseDto,
  SUPPORTED_CAPTION_LANGUAGES,
} from './dto/generate-caption.dto';

@ApiTags('Captions')
@Controller('videos/:videoId/captions')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CaptionsController {
  constructor(private readonly captionsService: CaptionsService) {}

  @Post('generate')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({
    summary: 'Gerar legendas automaticamente via IA',
    description: `Gera legendas automaticamente usando IA (speech-to-text) para o vídeo especificado.
    
O vídeo deve estar com status READY no Cloudflare Stream.

**Idiomas suportados:** ${SUPPORTED_CAPTION_LANGUAGES.join(', ')}

**Importante:** A geração é assíncrona. O status inicial será "inprogress". 
Use o endpoint GET para verificar quando a legenda estiver pronta.`,
  })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiResponse({
    status: 200,
    description: 'Geração de legenda iniciada',
    type: CaptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Vídeo não está pronto ou idioma não suportado' })
  @ApiResponse({ status: 404, description: 'Vídeo não encontrado' })
  async generateCaption(
    @Param('videoId') videoId: string,
    @Body() dto: GenerateCaptionDto,
  ): Promise<CaptionResponseDto> {
    const result = await this.captionsService.generateCaption(
      videoId,
      dto.language || 'pt',
    );
    return result;
  }

  @Get()
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  @ApiOperation({
    summary: 'Listar legendas do vídeo',
    description: 'Retorna todas as legendas disponíveis para o vídeo, incluindo as que estão em processamento.',
  })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de legendas',
    type: [CaptionResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Vídeo não encontrado' })
  async listCaptions(@Param('videoId') videoId: string): Promise<CaptionResponseDto[]> {
    return this.captionsService.listCaptions(videoId);
  }

  @Get(':language/status')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({
    summary: 'Verificar status de uma legenda específica',
    description: 'Retorna o status de uma legenda específica (inprogress, ready, error).',
  })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiParam({ name: 'language', description: 'Código do idioma (ex: pt, en)' })
  @ApiResponse({
    status: 200,
    description: 'Status da legenda',
    type: CaptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Vídeo ou legenda não encontrada' })
  async getCaptionStatus(
    @Param('videoId') videoId: string,
    @Param('language') language: string,
  ): Promise<CaptionResponseDto | null> {
    return this.captionsService.getCaptionStatus(videoId, language);
  }

  @Get(':language/vtt')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  @ApiOperation({
    summary: 'Baixar arquivo VTT da legenda',
    description: 'Retorna o arquivo WebVTT da legenda para download ou uso no player.',
  })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiParam({ name: 'language', description: 'Código do idioma (ex: pt, en)' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo VTT',
    content: {
      'text/vtt': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Vídeo ou legenda não encontrada' })
  @Header('Content-Type', 'text/vtt')
  async getCaptionVtt(
    @Param('videoId') videoId: string,
    @Param('language') language: string,
    @Res() res: Response,
  ): Promise<void> {
    const vtt = await this.captionsService.getCaptionVtt(videoId, language);
    res.setHeader('Content-Disposition', `attachment; filename="caption_${language}.vtt"`);
    res.send(vtt);
  }

  @Delete(':language')
  @Roles('ADMIN', 'INSTRUCTOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar uma legenda',
    description: 'Remove uma legenda específica do vídeo.',
  })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiParam({ name: 'language', description: 'Código do idioma (ex: pt, en)' })
  @ApiResponse({ status: 204, description: 'Legenda deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Vídeo ou legenda não encontrada' })
  async deleteCaption(
    @Param('videoId') videoId: string,
    @Param('language') language: string,
  ): Promise<void> {
    await this.captionsService.deleteCaption(videoId, language);
  }
}