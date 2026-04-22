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

    const queryEmbedding = await this.generateEmbedding(query);
    const queryVector = `[${queryEmbedding.join(',')}]`;
    const maxDistance = 1 - minSimilarity;

    // pgvector <=> is cosine distance. We order by it (HNSW-backed) and
    // filter by a max distance to emulate the previous minSimilarity gate.
    const sql = `
      SELECT c.id, c."documentId", c."chunkIndex",
             c.content, c."contentPt",
             c.chapter, c."chapterPt",
             c."pageStart", c."pageEnd", c.language,
             d.title AS document_title,
             (c.embedding <=> $1::vector) AS distance
      FROM knowledge_chunks c
      JOIN knowledge_documents d ON d.id = c."documentId"
      WHERE c."isIndexed" = true
        AND c.embedding IS NOT NULL
        ${documentId ? 'AND c."documentId" = $3' : ''}
        AND (c.embedding <=> $1::vector) <= $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT ${Math.max(1, Math.min(50, limit))}
    `;

    const params: unknown[] = [queryVector, maxDistance];
    if (documentId) params.push(documentId);

    const rows = (await this.prisma.$queryRawUnsafe(sql, ...params)) as Array<{
      id: string;
      documentId: string;
      chunkIndex: number;
      content: string;
      contentPt: string | null;
      chapter: string | null;
      chapterPt: string | null;
      pageStart: number | null;
      pageEnd: number | null;
      language: string;
      document_title: string;
      distance: number;
    }>;

    const results: KnowledgeSearchResult[] = rows.map((row) => ({
      chunkId: row.id,
      documentId: row.documentId,
      documentTitle: row.document_title,
      content: row.content,
      contentPt: row.contentPt,
      chapter: row.chapter,
      chapterPt: row.chapterPt,
      pageStart: row.pageStart,
      pageEnd: row.pageEnd,
      language: row.language,
      similarity: 1 - row.distance,
    }));

    this.logger.log(
      `Found ${results.length} relevant chunks (top similarity: ${results[0]?.similarity.toFixed(3)})`,
    );

    return results;
  }
}
