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
   * Semantic search over transcript chunks via pgvector.
   *
   * Strategy: embed the query once, then ORDER BY the persisted
   * `embedding <=> $query` (cosine distance). pgvector's HNSW index
   * serves this in sub-linear time. We filter out chunks whose
   * `embedding IS NULL` (not yet backfilled) so stale rows do not
   * pollute results.
   *
   * cosine_distance = 1 - cosine_similarity, so a `minSimilarity` input
   * maps to `maxDistance = 1 - minSimilarity` on the DB side.
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
    const queryVector = this.toVectorLiteral(queryEmbedding);
    const maxDistance = 1 - minSimilarity;

    let videoIdFilter: string[] | null = null;
    if (videoId) {
      videoIdFilter = [videoId];
    } else if (courseId) {
      const videos = await this.prisma.video.findMany({
        where: { module: { courseId } },
        select: { id: true },
      });
      videoIdFilter = videos.map((v) => v.id);
      if (videoIdFilter.length === 0) {
        return [];
      }
    }

    // Use $queryRawUnsafe so we can splice the `= ANY($N::text[])` filter in
    // only when needed — Prisma's parameterization makes the values safe;
    // the SQL shape itself is a static string with no user input.
    const sql = `
      SELECT id, "videoId", "chunkIndex", "chunkText",
             "startTime", "endTime",
             (embedding <=> $1::vector) AS distance
      FROM transcript_embeddings
      WHERE embedding IS NOT NULL
        ${videoIdFilter ? 'AND "videoId" = ANY($3::text[])' : ''}
        AND (embedding <=> $1::vector) <= $2
      ORDER BY embedding <=> $1::vector
      LIMIT ${Math.max(1, Math.min(50, limit))}
    `;

    const params: unknown[] = [queryVector, maxDistance];
    if (videoIdFilter) params.push(videoIdFilter);

    const rows = (await this.prisma.$queryRawUnsafe(sql, ...params)) as Array<{
      id: string;
      videoId: string;
      chunkIndex: number;
      chunkText: string;
      startTime: number;
      endTime: number;
      distance: number;
    }>;

    return rows.map((row) => ({
      videoId: row.videoId,
      chunkIndex: row.chunkIndex,
      chunkText: row.chunkText,
      startTime: row.startTime,
      endTime: row.endTime,
      similarity: 1 - row.distance,
    }));
  }

  /**
   * Convert a number[] into the pgvector literal form `[v1,v2,...]` that
   * parses into `vector`. Using the text form keeps us independent of any
   * driver-side binary codec for the vector type.
   */
  private toVectorLiteral(vec: number[]): string {
    return `[${vec.join(',')}]`;
  }

  /**
   * Indexes every transcript chunk that has not yet been indexed. Generates
   * real Vertex embeddings and writes them to the pgvector `embedding`
   * column via raw SQL (the column is Unsupported in Prisma's DSL so we
   * cannot use the typed `update` API for it).
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
          if (!Array.isArray(vector) || vector.length === 0) {
            errors += 1;
            continue;
          }
          await this.prisma.$executeRawUnsafe(
            `UPDATE transcript_embeddings
                SET embedding = $1::vector,
                    "isIndexed" = true,
                    "updatedAt" = NOW()
              WHERE id = $2`,
            this.toVectorLiteral(vector),
            chunk.id,
          );
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
