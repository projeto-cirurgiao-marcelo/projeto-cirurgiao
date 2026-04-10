import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { VttTextService } from '../../../shared/vtt/vtt-text.service';

export interface TranscriptChunk {
  videoId: string;
  chunkIndex: number;
  chunkText: string;
  startTime: number;
  endTime: number;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

@Injectable()
export class TranscriptChunkingService {
  private readonly logger = new Logger(TranscriptChunkingService.name);

  // Configurações de chunking
  private readonly MAX_CHUNK_TOKENS = 500; // ~500 tokens por chunk
  private readonly CHUNK_OVERLAP_TOKENS = 50; // Overlap entre chunks
  private readonly AVG_CHARS_PER_TOKEN = 4; // Aproximação para português

  constructor(
    private readonly prisma: PrismaService,
    private readonly vttTextService: VttTextService,
  ) {}

  /**
   * Processa legendas VTT do R2 e cria chunks para embeddings
   */
  async processTranscript(videoId: string): Promise<TranscriptChunk[]> {
    this.logger.log(`Processando VTT do video ${videoId}`);

    // Busca segmentos do VTT no R2
    const segments = await this.vttTextService.getSegments(videoId);

    if (!segments || segments.length === 0) {
      this.logger.warn(`Nenhum segmento VTT encontrado para video ${videoId}`);
      return [];
    }

    // Cria chunks a partir dos segmentos
    const chunks = this.createChunksFromSegments(videoId, segments);

    // Salva os chunks no banco
    await this.saveChunks(chunks);

    this.logger.log(`Criados ${chunks.length} chunks para vídeo ${videoId}`);
    return chunks;
  }

  /**
   * Cria chunks a partir dos segmentos da transcrição
   */
  private createChunksFromSegments(
    videoId: string,
    segments: TranscriptSegment[],
  ): TranscriptChunk[] {
    const chunks: TranscriptChunk[] = [];
    const maxCharsPerChunk = this.MAX_CHUNK_TOKENS * this.AVG_CHARS_PER_TOKEN;
    const overlapChars = this.CHUNK_OVERLAP_TOKENS * this.AVG_CHARS_PER_TOKEN;

    let currentChunk: TranscriptSegment[] = [];
    let currentChunkText = '';
    let chunkIndex = 0;

    for (const segment of segments) {
      const segmentText = segment.text.trim();
      
      // Se adicionar este segmento exceder o limite, finaliza o chunk atual
      if (currentChunkText.length + segmentText.length > maxCharsPerChunk && currentChunk.length > 0) {
        // Salva o chunk atual
        chunks.push({
          videoId,
          chunkIndex,
          chunkText: currentChunkText.trim(),
          startTime: currentChunk[0].startTime,
          endTime: currentChunk[currentChunk.length - 1].endTime,
        });
        chunkIndex++;

        // Mantém overlap - pega os últimos segmentos que cabem no overlap
        const overlapSegments: TranscriptSegment[] = [];
        let overlapText = '';
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          const seg = currentChunk[i];
          if (overlapText.length + seg.text.length <= overlapChars) {
            overlapSegments.unshift(seg);
            overlapText = seg.text + ' ' + overlapText;
          } else {
            break;
          }
        }

        currentChunk = overlapSegments;
        currentChunkText = overlapText;
      }

      // Adiciona o segmento ao chunk atual
      currentChunk.push(segment);
      currentChunkText += (currentChunkText ? ' ' : '') + segmentText;
    }

    // Salva o último chunk se houver conteúdo
    if (currentChunk.length > 0 && currentChunkText.trim()) {
      chunks.push({
        videoId,
        chunkIndex,
        chunkText: currentChunkText.trim(),
        startTime: currentChunk[0].startTime,
        endTime: currentChunk[currentChunk.length - 1].endTime,
      });
    }

    return chunks;
  }

  /**
   * Salva os chunks no banco de dados
   */
  private async saveChunks(chunks: TranscriptChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const videoId = chunks[0].videoId;

    // Remove chunks antigos do vídeo
    await this.prisma.transcriptEmbedding.deleteMany({
      where: { videoId },
    });

    // Insere os novos chunks
    await this.prisma.transcriptEmbedding.createMany({
      data: chunks.map((chunk) => ({
        videoId: chunk.videoId,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        isIndexed: false,
      })),
    });
  }

  /**
   * Busca chunks não indexados
   */
  async getUnindexedChunks(limit = 100): Promise<TranscriptChunk[]> {
    const embeddings = await this.prisma.transcriptEmbedding.findMany({
      where: { isIndexed: false },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    return embeddings.map((e) => ({
      videoId: e.videoId,
      chunkIndex: e.chunkIndex,
      chunkText: e.chunkText,
      startTime: e.startTime,
      endTime: e.endTime,
    }));
  }

  /**
   * Marca chunks como indexados
   */
  async markChunksAsIndexed(
    chunks: { videoId: string; chunkIndex: number; embeddingId: string }[],
  ): Promise<void> {
    for (const chunk of chunks) {
      await this.prisma.transcriptEmbedding.update({
        where: {
          videoId_chunkIndex: {
            videoId: chunk.videoId,
            chunkIndex: chunk.chunkIndex,
          },
        },
        data: {
          isIndexed: true,
          embeddingId: chunk.embeddingId,
        },
      });
    }
  }

  /**
   * Processa todos os videos com HLS/VTT que ainda nao tem chunks
   */
  async processAllTranscripts(): Promise<{ processed: number; total: number }> {
    // Buscar videos que tem URL m3u8 (R2 HLS) - esses tem VTT
    const videos = await this.prisma.video.findMany({
      where: {
        OR: [
          { hlsUrl: { not: null } },
          { externalUrl: { contains: '.m3u8' } },
        ],
      },
      select: { id: true },
    });

    const existingChunks = await this.prisma.transcriptEmbedding.groupBy({
      by: ['videoId'],
    });

    const existingVideoIds = new Set(existingChunks.map((c) => c.videoId));
    const videosToProcess = videos.filter(
      (v) => !existingVideoIds.has(v.id),
    );

    let processed = 0;
    for (const video of videosToProcess) {
      const chunks = await this.processTranscript(video.id);
      if (chunks.length > 0) {
        processed++;
      }
    }

    return {
      processed,
      total: videosToProcess.length,
    };
  }
}