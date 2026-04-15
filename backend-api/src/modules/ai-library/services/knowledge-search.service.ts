import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  contentPt: string | null;
  chapter: string | null;
  chapterPt: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  language: string;
  similarity: number;
}

@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);
  private readonly vertexAI: VertexAI;
  private readonly embeddingModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'projeto-cirurgiao-e8df7';
    const location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'southamerica-east1';
    this.embeddingModel = this.configService.get<string>('VERTEX_EMBEDDING_MODEL') || 'text-embedding-004';

    const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (credentialsPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }

    this.vertexAI = new VertexAI({
      project: projectId,
      location,
    });

    this.logger.log(`Knowledge Search Service initialized - Embedding model: ${this.embeddingModel}`);
  }

  /**
   * Gera embedding real usando Vertex AI text-embedding-004
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.vertexAI.getGenerativeModel({ model: this.embeddingModel });

      // text-embedding-004 usa endpoint diferente via REST
      // Usamos a API diretamente via google-auth-library
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      const client = await auth.getClient();

      const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'projeto-cirurgiao-e8df7';
      const location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'southamerica-east1';

      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${this.embeddingModel}:predict`;

      const response = await client.request({
        url,
        method: 'POST',
        data: {
          instances: [{ content: text }],
        },
      });

      const data = response.data as any;
      const embedding = data.predictions?.[0]?.embeddings?.values;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response');
      }

      return embedding;
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Busca semântica nos chunks da base de conhecimento
   * Otimizado: carrega apenas embeddings para rankeamento,
   * depois busca conteúdo completo só dos top-N resultados
   */
  async searchChunks(
    query: string,
    options: {
      limit?: number;
      minSimilarity?: number;
      documentId?: string;
    } = {},
  ): Promise<KnowledgeSearchResult[]> {
    const { limit = 10, minSimilarity = 0.4, documentId } = options;

    this.logger.log(`Searching knowledge base for: "${query.substring(0, 80)}..."`);

    // Gerar embedding da query
    const queryEmbedding = await this.generateEmbedding(query);

    // Fase 1: Carregar apenas IDs e embeddings (sem conteúdo pesado)
    const whereClause: any = { isIndexed: true };
    if (documentId) {
      whereClause.documentId = documentId;
    }

    const chunksLight = await this.prisma.knowledgeChunk.findMany({
      where: whereClause,
      select: {
        id: true,
        embedding: true,
      },
    });

    if (chunksLight.length === 0) {
      this.logger.warn('No indexed chunks found');
      return [];
    }

    // Fase 2: Calcular similaridade e pegar top-N IDs
    const scored: { id: string; similarity: number }[] = [];

    for (const chunk of chunksLight) {
      if (!chunk.embedding) continue;
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
      if (similarity >= minSimilarity) {
        scored.push({ id: chunk.id, similarity });
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    const topIds = scored.slice(0, limit);

    if (topIds.length === 0) {
      this.logger.warn('No chunks above similarity threshold');
      return [];
    }

    // Fase 3: Buscar conteúdo completo apenas dos top-N
    const topChunks = await this.prisma.knowledgeChunk.findMany({
      where: { id: { in: topIds.map(t => t.id) } },
      include: {
        document: { select: { id: true, title: true } },
      },
    });

    // Mapear similaridade e ordenar
    const similarityMap = new Map(topIds.map(t => [t.id, t.similarity]));

    const results: KnowledgeSearchResult[] = topChunks
      .map(chunk => ({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.document.title,
        content: chunk.content,
        contentPt: chunk.contentPt,
        chapter: chunk.chapter,
        chapterPt: chunk.chapterPt,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        language: chunk.language,
        similarity: similarityMap.get(chunk.id) || 0,
      }))
      .sort((a, b) => b.similarity - a.similarity);

    this.logger.log(`Found ${results.length} relevant chunks (top similarity: ${results[0]?.similarity.toFixed(3)})`);

    return results;
  }
}
