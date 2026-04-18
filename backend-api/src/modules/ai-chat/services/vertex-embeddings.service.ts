import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth, AuthClient } from 'google-auth-library';
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

/**
 * Vertex AI text-embedding-004 is served via `:predict` on
 * `us-central1-aiplatform.googleapis.com`; other publisher endpoints live
 * in the region closest to the project. We allow overriding both the
 * project ID and the embedding region independently so the same codepath
 * works for local smoke tests and production.
 *
 * Payload shape (instances -> [{content}]):
 *   POST .../models/text-embedding-004:predict
 *   { "instances": [ { "content": "<text>" } ], "parameters": {...} }
 *
 * Response:
 *   { "predictions": [ { "embeddings": { "values": [...], "statistics": {...} } } ] }
 *
 * The model returns 768-dim vectors.
 */
const DEFAULT_BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

@Injectable()
export class VertexEmbeddingsService {
  private readonly logger = new Logger(VertexEmbeddingsService.name);
  private readonly vertexAI: VertexAI;
  private readonly projectId: string;
  private readonly location: string;
  private readonly embeddingLocation: string;
  private readonly embeddingModel: string;
  private readonly auth: GoogleAuth;
  private cachedAuthClient: AuthClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.projectId =
      this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') ||
      'projeto-cirurgiao-e8df7';
    this.location =
      this.configService.get<string>('GOOGLE_CLOUD_LOCATION') ||
      'southamerica-east1';
    // text-embedding-004 is only served from us-central1; override only if
    // the account has approved a different region.
    this.embeddingLocation =
      this.configService.get<string>('VERTEX_EMBEDDING_LOCATION') ||
      'us-central1';
    this.embeddingModel =
      this.configService.get<string>('VERTEX_EMBEDDING_MODEL') ||
      'text-embedding-004';

    const credentialsPath = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );
    if (credentialsPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }

    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });

    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    this.logger.log(
      `Vertex Embeddings Service initialized — model: ${this.embeddingModel} @ ${this.embeddingLocation}`,
    );
  }

  /**
   * Generate an embedding for a single text. Thin wrapper around
   * generateEmbeddings() so existing call sites keep working.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.generateEmbeddings([text]);
    return embedding;
  }

  /**
   * Generate embeddings for a batch of texts. Batches are capped at
   * DEFAULT_BATCH_SIZE (5) per request; larger inputs are chunked.
   * Each request is retried with exponential backoff on transient
   * failures (HTTP 429 / 5xx, network errors).
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += DEFAULT_BATCH_SIZE) {
      batches.push(texts.slice(i, i + DEFAULT_BATCH_SIZE));
    }

    const results: number[][] = [];
    for (const batch of batches) {
      const batchResults = await this.predictBatchWithRetry(batch);
      results.push(...batchResults);
    }
    return results;
  }

  /**
   * Call the Vertex predict endpoint for one batch, with retries.
   */
  private async predictBatchWithRetry(batch: string[]): Promise<number[][]> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < MAX_RETRIES) {
      try {
        return await this.predictBatch(batch);
      } catch (err) {
        lastError = err;
        attempt += 1;
        if (attempt >= MAX_RETRIES || !this.isRetryable(err)) {
          break;
        }
        const delay = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `Embedding call failed (attempt ${attempt}/${MAX_RETRIES}); retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  private async predictBatch(batch: string[]): Promise<number[][]> {
    const client = await this.getAuthClient();
    const url = `https://${this.embeddingLocation}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.embeddingLocation}/publishers/google/models/${this.embeddingModel}:predict`;

    const response = await client.request<{
      predictions: Array<{
        embeddings: { values: number[]; statistics?: Record<string, unknown> };
      }>;
    }>({
      url,
      method: 'POST',
      data: {
        instances: batch.map((content) => ({ content })),
      },
    });

    const predictions = response.data?.predictions;
    if (!Array.isArray(predictions) || predictions.length !== batch.length) {
      throw new Error(
        `Vertex predict returned unexpected payload — expected ${batch.length} predictions, got ${predictions?.length ?? 'none'}`,
      );
    }
    return predictions.map((p, idx) => {
      const values = p.embeddings?.values;
      if (!Array.isArray(values)) {
        throw new Error(`Missing embeddings.values in prediction ${idx}`);
      }
      return values;
    });
  }

  private async getAuthClient(): Promise<AuthClient> {
    if (!this.cachedAuthClient) {
      this.cachedAuthClient = (await this.auth.getClient()) as AuthClient;
    }
    return this.cachedAuthClient;
  }

  private isRetryable(err: unknown): boolean {
    const e = err as { code?: string | number; status?: number; response?: { status?: number } };
    const status = e?.status ?? e?.response?.status;
    if (typeof status === 'number') {
      return status === 429 || status >= 500;
    }
    // Network-level errors from gaxios/node often expose a `code` string.
    const code = e?.code;
    if (typeof code === 'string') {
      return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(code);
    }
    return false;
  }

  /**
   * Cosine similarity between two vectors. Keeps the public surface the
   * same as before so existing callers work unchanged.
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
   * Semantic search over transcript chunks.
   *
   * NOTE: this currently does a Prisma `findMany` + in-memory cosine, which
   * is expensive because each chunk's embedding is **regenerated on every
   * search call** (transcript_embeddings.embedding is not persisted yet —
   * see CIRURGIAO_AUDIT §15 and the pgvector migration task). We embed the
   * query once, then compute similarity against the live-embedded chunks in
   * a single batched call for efficiency. Once pgvector lands and chunks
   * have a persisted `vector(768)` column, this method should switch to an
   * ORDER BY ... <-> query_vector LIMIT N query against the DB.
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

    const queryEmbedding = await this.generateEmbedding(query);

    const whereClause: any = {};
    if (videoId) {
      whereClause.videoId = videoId;
    }

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
      videoIds = videos.map((v) => v.id);
      if (videoIds.length > 0) {
        whereClause.videoId = { in: videoIds };
      }
    }

    const chunks = await this.prisma.transcriptEmbedding.findMany({
      where: whereClause,
      take: 100,
    });

    if (chunks.length === 0) {
      this.logger.warn('No chunks found for search');
      return [];
    }

    // Batch-embed all chunks so we pay 1 round-trip per 5 chunks instead of
    // 100 serial requests.
    const chunkEmbeddings = await this.generateEmbeddings(
      chunks.map((c) => c.chunkText),
    );

    const results: SearchResult[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const similarity = this.cosineSimilarity(
        queryEmbedding,
        chunkEmbeddings[i],
      );
      if (similarity >= minSimilarity) {
        const chunk = chunks[i];
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

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Indexes every transcript chunk that has not yet been indexed. Generates
   * real embeddings and stamps `isIndexed=true`. The embedding itself is
   * not persisted yet — that needs the pgvector column added by a later
   * migration; for now this just proves the Vertex wiring works and sets
   * a deterministic placeholder on `embeddingId` for observability.
   */
  async indexAllChunks(): Promise<{ indexed: number; errors: number }> {
    const unindexedChunks = await this.prisma.transcriptEmbedding.findMany({
      where: { isIndexed: false },
      take: 100,
    });

    if (unindexedChunks.length === 0) {
      return { indexed: 0, errors: 0 };
    }

    let indexed = 0;
    let errors = 0;

    const batchSize = DEFAULT_BATCH_SIZE;
    for (let i = 0; i < unindexedChunks.length; i += batchSize) {
      const batch = unindexedChunks.slice(i, i + batchSize);
      try {
        const embeddings = await this.generateEmbeddings(
          batch.map((c) => c.chunkText),
        );
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const vector = embeddings[j];
          // Sanity: Vertex should always return a vector, but guard anyway.
          if (!Array.isArray(vector) || vector.length === 0) {
            errors += 1;
            continue;
          }
          await this.prisma.transcriptEmbedding.update({
            where: { id: chunk.id },
            data: {
              isIndexed: true,
              embeddingId: `vertex:${this.embeddingModel}:${chunk.id}`,
            },
          });
          indexed += 1;
        }
      } catch (err) {
        this.logger.error(
          `Error indexing batch starting at chunk ${batch[0]?.id}`,
          err as any,
        );
        errors += batch.length;
      }
    }

    this.logger.log(`Indexed ${indexed} chunks, ${errors} errors`);
    return { indexed, errors };
  }
}
