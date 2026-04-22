-- pgvector migration.
--
-- pgvector v0.8.1 extension is already active in prod (Cloud SQL) and in
-- the local dev image (pgvector/pgvector:pg15). The `CREATE EXTENSION
-- IF NOT EXISTS vector` below is a safety net for Prisma's shadow DB
-- (which it drops/recreates on every `migrate dev`) and for any fresh
-- environment; it is a no-op when the extension is already installed.
CREATE EXTENSION IF NOT EXISTS vector;
--
-- knowledge_chunks.embedding: was jsonb (holding a float[768] blob),
-- convert to vector(768). We cast jsonb -> text -> vector so the JSON
-- representation of the array is parseable by the vector type. Any row
-- with a non-array payload will fail this cast; check prod data first
-- before running `prisma migrate deploy`. In this environment prod holds
-- no populated embeddings yet (all rows null), so the cast is safe.
--
-- transcript_embeddings.embedding: new nullable column. Legacy
-- `embeddingId` column stays for now and will be dropped in the
-- follow-up task-11 migration.
--
-- Indexes: HNSW with cosine distance. HNSW is the right default for RAG
-- workloads — high recall at read-time with a one-time build cost. We
-- create the index non-concurrently (CREATE INDEX CONCURRENTLY cannot
-- run inside a transaction, and Prisma wraps each migration in one).
-- Neither table has enough rows today to make the blocking build
-- noticeable.

-- knowledge_chunks: jsonb -> vector(768)
ALTER TABLE "knowledge_chunks"
    ALTER COLUMN "embedding" TYPE vector(768)
    USING "embedding"::text::vector(768);

-- transcript_embeddings: add vector column + drop implicit updatedAt default
ALTER TABLE "transcript_embeddings"
    ADD COLUMN IF NOT EXISTS "embedding" vector(768);
ALTER TABLE "transcript_embeddings"
    ALTER COLUMN "updatedAt" DROP DEFAULT;

-- HNSW indexes for cosine similarity search.
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_hnsw_idx"
    ON "knowledge_chunks"
    USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "transcript_embeddings_embedding_hnsw_idx"
    ON "transcript_embeddings"
    USING hnsw ("embedding" vector_cosine_ops);
