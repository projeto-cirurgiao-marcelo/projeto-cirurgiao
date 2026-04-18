import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
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
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserThrottlerGuard } from '../../shared/throttler/user-throttler.guard';
import { QueueService } from '../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { AiSummariesService } from './ai-summaries.service';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';

@ApiTags('AI Summaries')
@Controller('videos/:videoId/summaries')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class AiSummariesController {
  constructor(
    private readonly aiSummariesService: AiSummariesService,
    private readonly queueService: QueueService,
  ) {}

  @Post('generate')
  @UseGuards(UserThrottlerGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Gerar resumo com IA',
    description:
      'Enfileira a geração do resumo e retorna 202 com um jobId. Use GET /jobs/:id para polling. Quando QUEUE_ENABLED=false, o job roda inline e já volta completed.',
  })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiResponse({
    status: 202,
    description: 'Job enfileirado (ou executado inline quando fila desativada)',
  })
  @ApiResponse({
    status: 400,
    description: 'Limite de resumos atingido ou vídeo sem transcrição',
  })
  @ApiResponse({
    status: 404,
    description: 'Vídeo não encontrado',
  })
  async generateSummary(
    @Param('videoId') videoId: string,
    @GetUser('id') userId: string,
    @Body() dto: GenerateSummaryDto,
  ) {
    return this.queueService.enqueue(QUEUE_NAMES.SUMMARY, {
      type: QUEUE_NAMES.SUMMARY,
      userId,
      entityId: videoId,
      videoId,
      dto: dto as any,
    }, {
      fallback: async () => {
        const summary = await this.aiSummariesService.generateSummary(
          videoId,
          userId,
          dto,
        );
        return { resultRef: summary?.id };
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar resumos do usuário para o vídeo' })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de resumos',
  })
  async listSummaries(
    @Param('videoId') videoId: string,
    @GetUser('id') userId: string,
  ) {
    return this.aiSummariesService.listSummaries(videoId, userId);
  }

  @Get('remaining')
  @ApiOperation({ summary: 'Verificar quantos resumos ainda podem ser gerados' })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiResponse({
    status: 200,
    description: 'Informações sobre gerações restantes',
  })
  async getRemainingGenerations(
    @Param('videoId') videoId: string,
    @GetUser('id') userId: string,
  ) {
    return this.aiSummariesService.getRemainingGenerations(videoId, userId);
  }

  @Get(':summaryId')
  @ApiOperation({ summary: 'Obter um resumo específico' })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiParam({ name: 'summaryId', description: 'ID do resumo' })
  @ApiResponse({
    status: 200,
    description: 'Resumo encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Resumo não encontrado',
  })
  async getSummary(
    @Param('summaryId') summaryId: string,
    @GetUser('id') userId: string,
  ) {
    return this.aiSummariesService.getSummary(summaryId, userId);
  }

  @Put(':summaryId')
  @ApiOperation({ summary: 'Atualizar conteúdo do resumo' })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiParam({ name: 'summaryId', description: 'ID do resumo' })
  @ApiResponse({
    status: 200,
    description: 'Resumo atualizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Resumo não encontrado',
  })
  async updateSummary(
    @Param('summaryId') summaryId: string,
    @GetUser('id') userId: string,
    @Body() dto: UpdateSummaryDto,
  ) {
    return this.aiSummariesService.updateSummary(summaryId, userId, dto);
  }

  @Delete(':summaryId')
  @ApiOperation({ summary: 'Deletar um resumo' })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiParam({ name: 'summaryId', description: 'ID do resumo' })
  @ApiResponse({
    status: 200,
    description: 'Resumo deletado',
  })
  @ApiResponse({
    status: 404,
    description: 'Resumo não encontrado',
  })
  async deleteSummary(
    @Param('summaryId') summaryId: string,
    @GetUser('id') userId: string,
  ) {
    return this.aiSummariesService.deleteSummary(summaryId, userId);
  }

  @Get(':summaryId/download')
  @ApiOperation({ summary: 'Download do resumo como arquivo .md' })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiParam({ name: 'summaryId', description: 'ID do resumo' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo Markdown para download',
  })
  @ApiResponse({
    status: 404,
    description: 'Resumo não encontrado',
  })
  async downloadSummary(
    @Param('summaryId') summaryId: string,
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    const { content, filename } = await this.aiSummariesService.downloadSummary(
      summaryId,
      userId,
    );

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(content);
  }
}