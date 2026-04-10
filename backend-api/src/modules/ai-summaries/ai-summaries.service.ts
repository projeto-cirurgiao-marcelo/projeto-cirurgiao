import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { VertexAiService } from './vertex-ai.service';
import { VttTextService } from '../../shared/vtt/vtt-text.service';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';

const MAX_SUMMARIES_PER_VIDEO = 3;

@Injectable()
export class AiSummariesService {
  private readonly logger = new Logger(AiSummariesService.name);

  constructor(
    private prisma: PrismaService,
    private vertexAiService: VertexAiService,
    private vttTextService: VttTextService,
    private gamificationService: GamificationService,
  ) {}

  /**
   * Gera um novo resumo com IA para o vídeo
   */
  async generateSummary(
    videoId: string,
    userId: string,
    dto: GenerateSummaryDto,
  ) {
    this.logger.log(`Generating summary for video ${videoId} by user ${userId}`);

    // 1. Verificar se o vídeo existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // 2. Buscar conteudo de texto do VTT no R2
    const textContent = await this.vttTextService.getPlainText(videoId);
    const contentSource = 'vtt';

    if (!textContent) {
      throw new BadRequestException(
        'Este video nao possui legendas VTT. Verifique se o arquivo subtitles_pt.vtt existe na pasta do video no R2.',
      );
    }

    // 3. Verificar o máximo de gerações já realizadas (não diminui ao deletar)
    const maxGenerationCount = await this.prisma.videoSummary.findFirst({
      where: {
        videoId,
        userId,
      },
      orderBy: {
        generationCount: 'desc',
      },
      select: {
        generationCount: true,
      },
    });

    const currentGenerationCount = maxGenerationCount?.generationCount || 0;

    if (currentGenerationCount >= MAX_SUMMARIES_PER_VIDEO) {
      throw new BadRequestException(
        `Você já atingiu o limite de ${MAX_SUMMARIES_PER_VIDEO} gerações para este vídeo. Não é possível gerar mais resumos.`,
      );
    }

    // 4. Buscar resumos existentes para determinar a próxima versão
    const existingSummaries = await this.prisma.videoSummary.findMany({
      where: {
        videoId,
        userId,
      },
      orderBy: {
        version: 'asc',
      },
    });

    // 5. Buscar anotações do usuário para este vídeo
    const userNotes = await this.prisma.videoNote.findMany({
      where: {
        videoId,
        userId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const notesContent = userNotes.map((note) => note.content);

    // 6. Gerar resumo com IA
    const result = await this.vertexAiService.generateSummary({
      transcription: textContent,
      notes: notesContent,
      videoTitle: video.title,
      contentSource, // Informar a fonte do conteúdo
    });

    // 7. Determinar a próxima versão disponível e incrementar generationCount
    // Se houver "buracos" nas versões (ex: 1, 3 após deletar 2), preencher o buraco
    // Caso contrário, usar o próximo número sequencial
    let nextVersion = 1;
    const existingVersions = existingSummaries.map(s => s.version).sort((a, b) => a - b);
    
    // Encontrar o primeiro "buraco" nas versões ou usar a próxima sequencial
    for (let i = 1; i <= MAX_SUMMARIES_PER_VIDEO; i++) {
      if (!existingVersions.includes(i)) {
        nextVersion = i;
        break;
      }
    }

    const nextGenerationCount = currentGenerationCount + 1;

    this.logger.log(`Next available version: ${nextVersion}, generationCount: ${nextGenerationCount}`);

    // 8. Salvar no banco
    const summary = await this.prisma.videoSummary.create({
      data: {
        videoId,
        userId,
        content: result.content,
        version: nextVersion,
        generationCount: nextGenerationCount,
        tokenCount: result.tokenCount,
      },
    });

    this.logger.log(`Summary created with id ${summary.id}, version ${nextVersion}, generationCount ${nextGenerationCount}`);

    // Gamificação
    try {
      await this.gamificationService.processAction(userId, 'ai_summary', 10, 'Gerou resumo com IA', summary.id);
    } catch (err) { /* gamification should not break summaries */ }

    return {
      ...summary,
      remainingGenerations: MAX_SUMMARIES_PER_VIDEO - nextGenerationCount,
      contentSource, // Retornar a fonte usada
    };
  }

  /**
   * Lista todos os resumos do usuário para um vídeo
   */
  async listSummaries(videoId: string, userId: string) {
    const summaries = await this.prisma.videoSummary.findMany({
      where: {
        videoId,
        userId,
      },
      orderBy: {
        version: 'asc',
      },
    });

    return {
      summaries,
      count: summaries.length,
      maxAllowed: MAX_SUMMARIES_PER_VIDEO,
      remainingGenerations: MAX_SUMMARIES_PER_VIDEO - summaries.length,
    };
  }

  /**
   * Obtém um resumo específico
   */
  async getSummary(summaryId: string, userId: string) {
    const summary = await this.prisma.videoSummary.findFirst({
      where: {
        id: summaryId,
        userId,
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!summary) {
      throw new NotFoundException('Resumo não encontrado');
    }

    return summary;
  }

  /**
   * Atualiza o conteúdo de um resumo (edição pelo usuário)
   */
  async updateSummary(summaryId: string, userId: string, dto: UpdateSummaryDto) {
    // Verificar se o resumo existe e pertence ao usuário
    const existing = await this.prisma.videoSummary.findFirst({
      where: {
        id: summaryId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Resumo não encontrado');
    }

    const updated = await this.prisma.videoSummary.update({
      where: { id: summaryId },
      data: {
        content: dto.content,
      },
    });

    this.logger.log(`Summary ${summaryId} updated by user ${userId}`);

    return updated;
  }

  /**
   * Deleta um resumo
   */
  async deleteSummary(summaryId: string, userId: string) {
    // Verificar se o resumo existe e pertence ao usuário
    const existing = await this.prisma.videoSummary.findFirst({
      where: {
        id: summaryId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Resumo não encontrado');
    }

    await this.prisma.videoSummary.delete({
      where: { id: summaryId },
    });

    this.logger.log(`Summary ${summaryId} deleted by user ${userId}`);

    return { message: 'Resumo deletado com sucesso' };
  }

  /**
   * Retorna o conteúdo do resumo para download
   */
  async downloadSummary(summaryId: string, userId: string) {
    const summary = await this.prisma.videoSummary.findFirst({
      where: {
        id: summaryId,
        userId,
      },
      include: {
        video: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!summary) {
      throw new NotFoundException('Resumo não encontrado');
    }

    // Adicionar metadados ao início do arquivo
    const header = `---
título: ${summary.video.title}
versão: ${summary.version}
gerado_em: ${summary.createdAt.toISOString()}
atualizado_em: ${summary.updatedAt.toISOString()}
---

`;

    return {
      content: header + summary.content,
      filename: `resumo-${summary.video.title.toLowerCase().replace(/\s+/g, '-')}-v${summary.version}.md`,
    };
  }

  /**
   * Verifica quantos resumos o usuário ainda pode gerar
   */
  async getRemainingGenerations(videoId: string, userId: string) {
    const count = await this.prisma.videoSummary.count({
      where: {
        videoId,
        userId,
      },
    });

    return {
      used: count,
      remaining: MAX_SUMMARIES_PER_VIDEO - count,
      maxAllowed: MAX_SUMMARIES_PER_VIDEO,
    };
  }
}