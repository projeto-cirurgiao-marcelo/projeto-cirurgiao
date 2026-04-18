-- Task 11: indexes + constraints cleanup.
--
-- 1. Course.isPublished index: the student catalog endpoint scans every
--    course filtered by isPublished=true; this index turns the scan into
--    a B-tree seek.
-- 2. ForumTopic.categoryId -> ForumCategory: was a RESTRICT relation, now
--    Cascade so deleting a forum category cleans up its topics (desired
--    behaviour in the admin panel; previously required a manual cleanup
--    step before the DELETE went through).
-- 3. TranscriptEmbedding.embeddingId column: obsolete once pgvector lands
--    and the real vector lives in `embedding`. Drop it.
--
-- IMPORTANT: the pgvector HNSW indexes on knowledge_chunks.embedding and
-- transcript_embeddings.embedding are NOT represented in schema.prisma
-- (the DSL cannot express indexes on Unsupported types). If you let
-- `prisma migrate diff` generate this migration, it will try to DROP
-- those indexes. Do not accept that — this file intentionally touches
-- only the 3 items above.

-- 1. courses.isPublished index
CREATE INDEX IF NOT EXISTS "courses_isPublished_idx" ON "courses"("isPublished");

-- 2. forum_topics.categoryId ON DELETE CASCADE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_topics_categoryId_fkey') THEN
        ALTER TABLE "forum_topics" DROP CONSTRAINT "forum_topics_categoryId_fkey";
    END IF;
END $$;

ALTER TABLE "forum_topics"
    ADD CONSTRAINT "forum_topics_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "forum_categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. transcript_embeddings.embeddingId drop
ALTER TABLE "transcript_embeddings" DROP COLUMN IF EXISTS "embeddingId";
