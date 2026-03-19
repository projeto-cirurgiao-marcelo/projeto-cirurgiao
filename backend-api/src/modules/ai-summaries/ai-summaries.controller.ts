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
import { AiSummariesService } from './ai-summaries.service';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';

@ApiTags('AI Summaries')
@Controller('videos/:videoId/summaries')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class AiSummariesController {
  constructor(private readonly aiSummariesService: AiSummariesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Gerar resumo com IA' })
  @ApiParam({ name: 'videoId', description: 'ID do vídeo' })
  @ApiResponse({
    status: 201,
    description: 'Resumo gerado com sucesso',
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
    return this.aiSummariesService.generateSummary(videoId, userId, dto);
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