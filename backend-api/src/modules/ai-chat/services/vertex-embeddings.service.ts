import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface EmbeddingResult {
  videoId: string;
  chunkIndex: number;
  embedding: number[];
}

export interface SearchResult {
  videoId: string;
  chunkIndex: number;
  chunkText: string;
  startTime: number;
  endTime: number;
  similarity: number;
}

@Injectable()
export class VertexEmbeddingsService {
  private readonly logger = new Logger(VertexEmbeddingsService.name);
  private readonly vertexAI: VertexAI;
  private readonly projectId: string;
  private readonly location: string;
  private readonly embeddingModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'projeto-cirurgiao-e8df7';
    this.location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'southamerica-east1';
    this.embeddingModel = this.configService.get<string>('VERTEX_EMBEDDING_MODEL') || 'text-embedding-004';

    // Configurar credenciais do Google Cloud
    const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (credentialsPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }

    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });

    this.logger.log(`Vertex Embeddings Service initialized - Model: ${this.embeddingModel}`);
  }

  /**
   * Gera embedding para um texto
   * Por enquanto usa embeddings simulados baseados em hash do texto
   * TODO: Integrar com Vertex AI Embeddings API quando necessário
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Por enquanto, usar embeddings simulados para desenvolvimento
    // Isso permite testar a funcionalidade sem custos de API
    return this.generateSimulatedEmbedding(text);
  }

  /**
   * Gera um embedding simulado para desenvolvimento/testes
   * Baseado em hash do texto para consistência
   */
  private generateSimulatedEmbedding(text: string): number[] {
    const dimension = 768; // Dimensão padrão do text-embedding-004
    const embedding: number[] = [];
    
    // Usar hash simples do texto para gerar valores consistentes
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Gerar valores normalizados baseados no hash
    for (let i = 0; i < dimension; i++) {
      const seed = hash + i * 31;
      const value = Math.sin(seed) * 0.5;
      embedding.push(value);
    }

    // Normalizar o vetor
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Busca semântica nos chunks de transcrição
   * Implementação simplificada sem Vector Search (busca em memória)
   */
  async searchSimilarChunks(
    query: string,
    options: {
      videoId?: string;
      courseId?: string;
      limit?: number;
      minSimilarity?: number;
    } = {},
  ): Promise<SearchResult[]> {
    const { videoId, courseId, limit = 5, minSimilarity = 0.3 } = options;

    this.logger.log(`Searching for: "${query.substring(0, 50)}..."`);

    // Gerar embedding da query
    const queryEmbedding = await this.generateEmbedding(query);

    // Buscar chunks do banco
    const whereClause: any = {};
    if (videoId) {
      whereClause.videoId = videoId;
    }

    // Se courseId fornecido, buscar vídeos do curso
    let videoIds: string[] = [];
    if (courseId) {
      const videos = await this.prisma.video.findMany({
        where: {
          module: {
            courseId,
          },
        },
        select: { id: true },
      });
      videoIds = videos.map(v => v.id);
      if (videoIds.length > 0) {
        whereClause.videoId = { in: videoIds };
      }
    }

    const chunks = await this.prisma.transcriptEmbedding.findMany({
      where: whereClause,
      take: 100, // Limitar para performance
    });

    if (chunks.length === 0) {
      this.logger.warn('No chunks found for search');
      return [];
    }

    // Calcular similaridade para cada chunk
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      // Gerar embedding do chunk (ou usar cache se disponível)
      const chunkEmbedding = await this.generateEmbedding(chunk.chunkText);
      const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);

      if (similarity >= minSimilarity) {
        results.push({
          videoId: chunk.videoId,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          similarity,
        });
      }
    }

    // Ordenar por similaridade e limitar resultados
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Indexa todos os chunks não indexados
   */
  async indexAllChunks(): Promise<{ indexed: number; errors: number }> {
    const unindexedChunks = await this.prisma.transcriptEmbedding.findMany({
      where: { isIndexed: false },
      take: 100,
    });

    let indexed = 0;
    let errors = 0;

    for (const chunk of unindexedChunks) {
      try {
        // Gerar embedding (para cache futuro)
        await this.generateEmbedding(chunk.chunkText);

        // Marcar como indexado
        await this.prisma.transcriptEmbedding.update({
          where: { id: chunk.id },
          data: {
            isIndexed: true,
            embeddingId: `local-${chunk.id}`, // ID local para busca em memória
          },
        });

        indexed++;
      } catch (error) {
        this.logger.error(`Error indexing chunk ${chunk.id}:`, error);
        errors++;
      }
    }

    this.logger.log(`Indexed ${indexed} chunks, ${errors} errors`);
    return { indexed, errors };
  }
}